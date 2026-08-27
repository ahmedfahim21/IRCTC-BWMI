import { addDays, todayIso } from "@/lib/domain/time";

/**
 * Turns a spoken sentence into something the app can do.
 *
 * Rule-based rather than an LLM: it's instant, costs nothing, runs the same
 * every time, and the vocabulary here is genuinely small — people ask a booking
 * site for about eight things. Anything it can't place returns `unknown` with
 * the transcript, so the UI can say what it heard instead of guessing.
 */
export type IntentKind =
  | "search"
  | "trainStatus"
  | "pnrStatus"
  | "liveMap"
  | "myTrips"
  | "home"
  | "help"
  | "unknown";

export interface Intent {
  kind: IntentKind;
  /** Where to send the user, when the intent implies a destination. */
  href?: string;
  /** Spoken back to the user. English; translated before it is voiced. */
  reply: string;
  /** Station queries still to be resolved against the station directory. */
  fromQuery?: string;
  toQuery?: string;
  dateIso?: string;
  trainNumber?: string;
  pnr?: string;
  /** True when the intent needs station lookup before it can produce an href. */
  needsResolution?: boolean;
}

/** Digit sequences, with spoken gaps and separators collapsed. */
function digitRuns(text: string): string[] {
  return (text.match(/\d[\d\s-]*/g) ?? [])
    .map((run) => run.replace(/[^\d]/g, ""))
    .filter((run) => run.length > 0);
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "tomorrow", "next friday", "on the 12th", "5 september" -> an ISO date. */
export function parseDate(text: string, today = todayIso()): string | undefined {
  const lower = text.toLowerCase();

  if (/\bday after tomorrow\b/.test(lower)) return addDays(today, 2);
  if (/\btomorrow\b/.test(lower)) return addDays(today, 1);
  if (/\btoday\b|\btonight\b/.test(lower)) return today;

  const weekday = WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}\\b`).test(lower));
  if (weekday >= 0) {
    const current = new Date(`${today}T00:00:00Z`).getUTCDay();
    let delta = (weekday - current + 7) % 7;
    if (delta === 0 || /\bnext\b/.test(lower)) delta = delta === 0 ? 7 : delta;
    return addDays(today, delta);
  }

  // "12 september" / "september 12" / "on the 12th"
  const monthDay = lower.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")})\\b|\\b(${MONTHS.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`)
  );
  if (monthDay) {
    const day = Number(monthDay[1] ?? monthDay[4]);
    const month = MONTHS.indexOf(monthDay[2] ?? monthDay[3]);
    if (day >= 1 && day <= 31 && month >= 0) {
      const year = new Date(`${today}T00:00:00Z`).getUTCFullYear();
      const candidate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      // A date already gone means they meant next year.
      return candidate < today ? `${year + 1}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : candidate;
    }
  }

  return undefined;
}

/** Words that show up around station names and would poison the lookup. */
const NOISE = /\b(?:please|show|me|find|search|get|the|trains?|train|tickets?|ticket|from|to|for|on|at|going|travelling|traveling|book|booking|a|any|available|seats?)\b/gi;

function clean(value: string): string {
  return value.replace(NOISE, " ").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}

export function parseIntent(transcript: string, today = todayIso()): Intent {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return { kind: "unknown", reply: "I didn't catch that. Try again?" };
  }

  // Numbers may be dictated with gaps — "one two nine five one" comes back from
  // the model as "1 2 9 5 1", so join runs of digits before measuring them.
  const numbers = digitRuns(lower);

  const pnr = numbers.find((n) => n.length === 10);
  if (pnr && /\bpnr\b|\bstatus\b|\bticket\b|\bbooking\b/.test(lower)) {
    return {
      kind: "pnrStatus",
      pnr,
      href: `/trips/${pnr}`,
      reply: `Opening PNR ${pnr.split("").join(" ")}.`,
    };
  }

  const trainNumber = numbers.find((n) => n.length === 5);
  if (trainNumber) {
    return {
      kind: "trainStatus",
      trainNumber,
      href: `/trains/${trainNumber}`,
      reply: `Opening live status for train ${trainNumber}.`,
    };
  }

  if (/\b(live\s*)?map\b|\bwhere are the trains\b|\ball trains\b/.test(lower)) {
    return { kind: "liveMap", href: "/map", reply: "Opening the live map of every running train." };
  }

  if (/\bmy (trips?|bookings?|tickets?|journeys?)\b|\bbookings\b/.test(lower)) {
    return { kind: "myTrips", href: "/trips", reply: "Here are your trips." };
  }

  if (/\b(help|what can you do|commands?)\b/.test(lower)) {
    return {
      kind: "help",
      reply:
        "You can say: trains from Delhi to Mumbai tomorrow. Or, where is train 12951. Or, show the live map. Or, my trips.",
    };
  }

  // "trains from X to Y", "X to Y"
  const pair =
    lower.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:\s+(?:on|for|tomorrow|today|next|this)\b.*)?$/) ??
    lower.match(/^(?:.*?\btrains?\b\s+)?(.+?)\s+to\s+(.+?)(?:\s+(?:on|for|tomorrow|today|next|this)\b.*)?$/);

  if (pair) {
    const fromQuery = clean(pair[1]);
    const toQuery = clean(pair[2]);
    if (fromQuery && toQuery) {
      return {
        kind: "search",
        fromQuery,
        toQuery,
        dateIso: parseDate(lower, today) ?? today,
        needsResolution: true,
        reply: "",
      };
    }
  }

  if (/\b(book|search|home|start)\b/.test(lower)) {
    return { kind: "home", href: "/", reply: "Opening search." };
  }

  return {
    kind: "unknown",
    reply: `I heard "${text}", but I'm not sure what to do with it. Try: trains from Delhi to Mumbai tomorrow.`,
  };
}
