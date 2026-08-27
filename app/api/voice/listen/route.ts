import type { NextRequest } from "next/server";
import { transcribe, speak, translateText, isVoiceEnabled } from "@/lib/voice/sarvam";
import { parseIntent, type Intent } from "@/lib/voice/intent";
import { liveStationSearch } from "@/lib/railradar/source";
import { getWorld } from "@/lib/mock/seed";
import { todayIso, formatDateShort } from "@/lib/domain/time";
import { handler, json, badRequest } from "@/lib/api/http";

/**
 * One turn of the voice interface: audio in, an action and spoken answer out.
 *
 * Speech is transcribed straight to English regardless of the language spoken,
 * so a single parser covers every language Sarvam supports. The reply is then
 * translated back into whatever the user actually said.
 */
export const POST = handler(async (request: NextRequest) => {
  if (!isVoiceEnabled()) {
    return badRequest("Voice is not configured on this server. Set SARVAM_API_KEY to enable it.");
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return badRequest("An audio recording is required");
  if (audio.size < 1200) return badRequest("That recording was too short to hear anything");

  const heard = await transcribe(audio);
  const intent = parseIntent(heard.transcript);
  const resolved = await resolve(intent);

  const replyEnglish = resolved.reply;
  const spokenReply = await translateText(replyEnglish, heard.languageCode);
  const voice = await speak(spokenReply, heard.languageCode).catch(() => null);

  return json({
    transcript: heard.transcript,
    languageCode: heard.languageCode,
    confidence: heard.confidence,
    intent: { ...resolved, reply: replyEnglish },
    spokenReply,
    audio: voice?.audio ?? null,
  });
});

/** Turn station names into codes, and build the sentence we'll speak back. */
async function resolve(intent: Intent): Promise<Intent> {
  if (intent.kind !== "search" || !intent.needsResolution) return intent;

  const [from, to] = await Promise.all([
    findStation(intent.fromQuery ?? ""),
    findStation(intent.toQuery ?? ""),
  ]);

  if (!from || !to) {
    const missing = !from ? intent.fromQuery : intent.toQuery;
    return {
      ...intent,
      kind: "unknown",
      needsResolution: false,
      reply: `I couldn't find a station called ${missing}. Try saying the city name, or the station code.`,
    };
  }

  const date = intent.dateIso ?? todayIso();
  return {
    ...intent,
    needsResolution: false,
    href: `/search?from=${from.code}&to=${to.code}&date=${date}&quota=GN`,
    reply: `Searching trains from ${from.name} to ${to.name} on ${formatDateShort(date)}.`,
  };
}

interface Found {
  code: string;
  name: string;
}

/**
 * When someone says a city name they almost always mean its principal terminal.
 * The directory ranks by popularity, which puts Delhi Junction ahead of New
 * Delhi for "Delhi" — correct as a station, wrong as an answer.
 */
const PRINCIPAL_TERMINAL: Record<string, { code: string; name: string }> = {
  delhi: { code: "NDLS", name: "New Delhi" },
  "new delhi": { code: "NDLS", name: "New Delhi" },
  mumbai: { code: "CSMT", name: "Mumbai CSMT" },
  bombay: { code: "CSMT", name: "Mumbai CSMT" },
  kolkata: { code: "HWH", name: "Howrah Jn" },
  calcutta: { code: "HWH", name: "Howrah Jn" },
  chennai: { code: "MAS", name: "MGR Chennai Central" },
  madras: { code: "MAS", name: "MGR Chennai Central" },
  bengaluru: { code: "SBC", name: "KSR Bengaluru" },
  bangalore: { code: "SBC", name: "KSR Bengaluru" },
  hyderabad: { code: "SC", name: "Secunderabad Jn" },
  pune: { code: "PUNE", name: "Pune Jn" },
  ahmedabad: { code: "ADI", name: "Ahmedabad Jn" },
  jaipur: { code: "JP", name: "Jaipur Jn" },
  lucknow: { code: "LKO", name: "Lucknow Charbagh" },
  patna: { code: "PNBE", name: "Patna Jn" },
};

/** Best station for a spoken name — the live directory first, ours as backup. */
async function findStation(query: string): Promise<Found | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const principal = PRINCIPAL_TERMINAL[trimmed.toLowerCase()];
  if (principal) return principal;

  const live = await liveStationSearch(trimmed, 5).catch(() => null);
  if (live?.length) return { code: live[0].code, name: live[0].name };

  const world = getWorld();
  const lower = trimmed.toLowerCase();

  const exact = world.stationList.find((s) => s.code.toLowerCase() === lower);
  if (exact) return { code: exact.code, name: exact.name };

  // Prefer the biggest station in a matching city — "Delhi" should mean New Delhi.
  const matches = world.stationList
    .filter((s) => s.city.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower))
    .sort((a, b) => b.platformCount - a.platformCount);

  return matches[0] ? { code: matches[0].code, name: matches[0].name } : null;
}
