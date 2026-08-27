/**
 * Every piece of railway jargon the UI can show, with a plain-language reading.
 * Nothing in this app renders a code like "PQWL" without routing it through here
 * — unexplained jargon is one of the things we're fixing.
 */

export interface GlossaryEntry {
  term: string;
  short: string;
  full: string;
  /** Rendered next to a number, e.g. "38 ahead of you". */
  withCount?: (n: number) => string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  "1A": { term: "1A", short: "AC First Class", full: "Lockable cabins of 4 berths and coupes of 2. Bedding included. The most expensive class on the train." },
  "2A": { term: "2A", short: "AC 2-Tier", full: "Air-conditioned, 4 berths per bay plus 2 side berths, with privacy curtains. Bedding included." },
  "3A": { term: "3A", short: "AC 3-Tier", full: "Air-conditioned, 6 berths per bay plus 2 side berths. Bedding included. The most common AC class." },
  "3E": { term: "3E", short: "AC 3-Tier Economy", full: "Like 3A but with slightly tighter berths and a lower fare." },
  SL: { term: "SL", short: "Sleeper", full: "Non-air-conditioned, 6 berths per bay plus 2 side berths. Windows open. No bedding provided." },
  CC: { term: "CC", short: "AC Chair Car", full: "Air-conditioned seating, usually 3+2 across. Day journeys only — no berths." },
  EC: { term: "EC", short: "Executive Chair Car", full: "Air-conditioned seating, 2+2 across with more legroom. Day journeys only." },
  "2S": { term: "2S", short: "Second Sitting", full: "Non-air-conditioned bench seating. The cheapest reserved class." },

  GN: { term: "GN", short: "General quota", full: "The main pool of seats, open from the day bookings start." },
  TQ: { term: "TQ", short: "Tatkal", full: "Emergency quota released one day before departure, at a premium fare. AC classes open at 10:00, sleeper at 11:00." },
  PT: { term: "PT", short: "Premium Tatkal", full: "A smaller Tatkal pool with dynamic pricing — the fare rises as seats sell." },
  LD: { term: "LD", short: "Ladies quota", full: "Reserved for women travelling alone or with children under 12." },
  SS: { term: "SS", short: "Senior Citizen", full: "Lower berths held for passengers aged 60+ (men) or 58+ (women)." },
  DF: { term: "DF", short: "Defence quota", full: "Held for serving armed forces personnel on duty." },

  AVL: { term: "AVL", short: "Available", full: "Seats are free right now. Book and you are confirmed immediately.", withCount: (n) => `${n} seat${n === 1 ? "" : "s"} free` },
  RAC: {
    term: "RAC",
    short: "Reservation Against Cancellation",
    full: "You can board and you get a side berth shared with one other passenger. Most RAC tickets become a full berth once the chart is prepared.",
    withCount: (n) => `Position ${n} — you can board, sharing a side berth`,
  },
  WL: { term: "WL", short: "Waiting list", full: "No seat yet. You move up as others cancel. If it does not clear by chart preparation, the ticket is cancelled and refunded automatically.", withCount: (n) => `${n} ahead of you` },
  GNWL: { term: "GNWL", short: "General waiting list", full: "The main waiting list, for passengers boarding at or near the train's origin. This is the queue that clears most often.", withCount: (n) => `${n} ahead of you` },
  RLWL: { term: "RLWL", short: "Remote Location waiting list", full: "A separate, smaller queue for intermediate stations. It only clears when someone cancels that exact segment, so it moves more slowly than GNWL.", withCount: (n) => `${n} ahead of you in this station's own queue` },
  PQWL: { term: "PQWL", short: "Pooled Quota waiting list", full: "A queue shared between several short-distance stations along the route. Clears less often than GNWL.", withCount: (n) => `${n} ahead of you in the pooled queue` },
  TQWL: { term: "TQWL", short: "Tatkal waiting list", full: "The Tatkal queue. It does not get upgraded from the general pool, so it clears rarely.", withCount: (n) => `${n} ahead of you in the Tatkal queue` },
  LDWL: { term: "LDWL", short: "Ladies quota waiting list", full: "The waiting list against the ladies quota.", withCount: (n) => `${n} ahead of you` },
  REGRET: { term: "REGRET", short: "Closed", full: "The waiting list is full. No more tickets are being sold for this class and quota." },

  LB: { term: "LB", short: "Lower berth", full: "Bottom berth. Easiest to get in and out of, and the one everyone wants." },
  MB: { term: "MB", short: "Middle berth", full: "Folds down at night. Has to stay folded until the lower berth passenger is ready to sleep." },
  UB: { term: "UB", short: "Upper berth", full: "Top berth. Yours to use at any hour, but a climb." },
  SL_BERTH: { term: "SL", short: "Side lower", full: "Lower berth along the corridor, slightly shorter than a main lower berth." },
  SU: { term: "SU", short: "Side upper", full: "Upper berth along the corridor." },
  CB: { term: "CB", short: "Cabin berth", full: "Inside a lockable 1A cabin." },
  WS: { term: "WS", short: "Window seat", full: "Seat next to the window." },
  AS: { term: "AS", short: "Aisle seat", full: "Seat away from the window." },

  CNF: { term: "CNF", short: "Confirmed", full: "You have a berth. The coach and berth number are printed on the ticket." },
  CAN: { term: "CAN", short: "Cancelled", full: "This ticket has been cancelled and the refund is being processed." },
  CANCELLED: { term: "CANCELLED", short: "Cancelled", full: "This ticket has been cancelled and the refund is being processed." },

  CHART: { term: "Chart", short: "Chart preparation", full: "The final passenger list, locked in about 4 hours before departure. This is when RAC and waiting list positions are resolved and berths are allotted." },
  PNR: { term: "PNR", short: "Passenger Name Record", full: "The 10-digit reference for your booking. One PNR covers up to six passengers on one journey." },
  TTE: { term: "TTE", short: "Travelling Ticket Examiner", full: "The onboard staff member who checks tickets and allots unclaimed berths." },
};

export function lookup(term: string): GlossaryEntry | null {
  return GLOSSARY[term.toUpperCase()] ?? null;
}

/** "GNWL 38" -> { term: "GNWL", count: 38 } */
export function parseStatusLabel(label: string): { term: string; count: number | null } {
  const match = label.match(/^([A-Z]+)\s*(\d+)?$/);
  if (!match) return { term: label.split(/[\s/]/)[0], count: null };
  return { term: match[1], count: match[2] ? Number(match[2]) : null };
}

/** "CNF B1/10 MB" -> coach B1, berth 10, middle berth. */
const ALLOTMENT = /^CNF\s+([A-Z]+\d*)\/(\d+)\s*([A-Z]{2})?$/;

/**
 * The sentence that always sits beside a status code. Returns an empty string
 * when the code carries no extra meaning, so callers can skip rendering rather
 * than printing the same thing twice.
 */
export function explainStatus(label: string): string {
  const allotted = label.match(ALLOTMENT);
  if (allotted) {
    const [, coach, berth, berthType] = allotted;
    const berthName = berthType ? (GLOSSARY[berthType === "SL" ? "SL_BERTH" : berthType]?.short ?? berthType) : null;
    return `Confirmed — coach ${coach}, berth ${berth}${berthName ? `, ${berthName.toLowerCase()}` : ""}`;
  }

  const { term, count } = parseStatusLabel(label);
  const entry = lookup(term);
  if (!entry) return "";
  if (count !== null && entry.withCount) return entry.withCount(count);
  return entry.short;
}
