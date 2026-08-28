import type { Station } from "@/lib/types";
import { callRailRadar, isLive, TTL } from "./client";
import { titleCase } from "./map";
import { PRINCIPAL_TERMINAL, toLiveCode, toMockCode } from "./codes";

export { PRINCIPAL_TERMINAL, STATION_ALIASES, toLiveCode, toMockCode } from "./codes";

/**
 * The national station directory — all ten thousand of them — fetched once as a
 * newline-delimited stream and cached for a week. One 170 KB call replaces the
 * paged autocomplete endpoint, which ranks by popularity and was dropping
 * obvious answers: a search for "delhi" came back without New Delhi in it.
 */

/**
 * A search-form token is either a station code or `city:Delhi`. The date strip
 * and live train-between call need a single code the network recognises.
 */
export async function resolveLiveStationCode(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("city:")) {
    const city = trimmed.slice(5).trim();
    if (!city) return null;
    const principal = PRINCIPAL_TERMINAL[city.toUpperCase()];
    if (principal) return principal;
    if (!isLive()) return null;
    const matches = await searchDirectory(city, 1);
    return matches?.[0]?.code ?? null;
  }

  return toLiveCode(trimmed);
}

/**
 * Find a stop by station code, tolerating the rename. A live timetable calls
 * Mumbai Central MMCT while our own data says BCT; a user who typed either
 * should get the same stop.
 */
export function findStop<T extends { stationCode: string }>(stops: T[], code: string): T | undefined {
  const wanted = code.toUpperCase();
  const candidates = new Set([wanted, toLiveCode(wanted), toMockCode(wanted)]);
  return stops.find((stop) => candidates.has(stop.stationCode.toUpperCase()));
}

let directory: Map<string, string> | null = null;

async function loadDirectory(): Promise<Map<string, string> | null> {
  if (directory) return directory;
  if (!isLive()) return null;

  const raw = await callRailRadar<string>("/lookup/stations/compressed", {}, TTL.static);
  if (typeof raw !== "string") return null;

  const parsed = new Map<string, string>();
  for (const line of raw.split("\n")) {
    const separator = line.indexOf("|");
    if (separator < 1) continue;
    parsed.set(line.slice(0, separator).trim().toUpperCase(), titleCase(line.slice(separator + 1).trim()));
  }
  directory = parsed;
  return directory;
}

export async function directorySize(): Promise<number> {
  return (await loadDirectory())?.size ?? 0;
}

export async function stationName(code: string): Promise<string | null> {
  const all = await loadDirectory();
  return all?.get(code.toUpperCase()) ?? null;
}

/**
 * Search the whole directory. An exact code wins, then the city's principal
 * terminal, then a name whose words match the query, then a code prefix, then
 * anything merely containing it — shorter names first, because the principal
 * station is almost always the one with the plainest name.
 */
export async function searchDirectory(query: string, limit: number): Promise<Station[] | null> {
  const all = await loadDirectory();
  if (!all) return null;

  const q = query.trim().toUpperCase();
  if (!q) return [];

  const principal = PRINCIPAL_TERMINAL[q];
  const scored: Array<{ code: string; name: string; score: number }> = [];

  for (const [code, name] of all) {
    const upperName = name.toUpperCase();
    let score = -1;
    if (code === q) score = 0;
    else if (principal && code === principal) score = 1;
    else if (upperName === q) score = 2;
    // A whole word matching beats an unrelated station whose code happens to
    // start with the same letters.
    else if (new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(upperName)) score = 3;
    else if (code.startsWith(q)) score = 4;
    else if (upperName.includes(q)) score = 5;
    if (score >= 0) scored.push({ code, name, score });
  }

  scored.sort((a, b) => a.score - b.score || a.name.length - b.name.length || a.name.localeCompare(b.name));

  return scored.slice(0, limit).map(({ code, name }) => ({
    code,
    name,
    city: name.replace(/\s+(Jn\.?|Junction|Central|Terminus|Terminal|City|Cantt\.?)$/i, "").trim(),
    stateCode: "",
    lat: Number.NaN,
    lng: Number.NaN,
    zone: "",
    platformCount: 0,
  }));
}
