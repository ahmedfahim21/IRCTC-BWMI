import type { NextRequest } from "next/server";
import type { Station } from "@/lib/types";
import { getWorld } from "@/lib/mock/seed";
import { liveStationSearch, isLive } from "@/lib/railradar/source";
import { handler, json } from "@/lib/api/http";

export interface StationResult {
  kind: "station" | "city";
  /** "NDLS" or "city:Delhi" — both are valid search tokens. */
  token: string;
  code: string;
  name: string;
  city: string;
  stateCode: string;
  /** For a city group, the stations it covers. */
  memberCodes: string[];
  platformCount: number;
}

const toResult = (s: Station): StationResult => ({
  kind: "station",
  token: s.code,
  code: s.code,
  name: s.name,
  city: s.city,
  stateCode: s.stateCode,
  memberCodes: [s.code],
  platformCount: s.platformCount,
});

/**
 * Station typeahead. Cities with more than one station surface as a single
 * group first — typing "Delhi" should offer all of NDLS, NZM, DEC at once
 * rather than making you know which terminus your train leaves from.
 */
export const GET = handler(async (request: NextRequest) => {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 12);

  const live = q.length > 0 ? await liveStationSearch(q, limit + 6) : null;
  if (live && live.length > 0) {
    return json({ source: "live", results: groupByCity(live).slice(0, limit) });
  }

  const world = getWorld();
  const lower = q.toLowerCase();
  const results: StationResult[] = [];

  if (lower.length > 0) {
    for (const [city, codes] of world.stationsByCity) {
      if (codes.length < 2 || !city.toLowerCase().includes(lower)) continue;
      const first = world.stations.get(codes[0])!;
      results.push({
        kind: "city",
        token: `city:${city}`,
        code: city,
        name: `All ${city} stations`,
        city,
        stateCode: first.stateCode,
        memberCodes: codes,
        platformCount: codes.reduce((n, c) => n + (world.stations.get(c)?.platformCount ?? 0), 0),
      });
    }
  }

  const matches = world.stationList
    .filter((s) =>
      lower.length === 0
        ? s.platformCount >= 8
        : s.code.toLowerCase().startsWith(lower) ||
          s.name.toLowerCase().includes(lower) ||
          s.city.toLowerCase().includes(lower)
    )
    // Bigger stations first — they're what people mean.
    .sort((a, b) => {
      const aExact = a.code.toLowerCase() === lower ? 1 : 0;
      const bExact = b.code.toLowerCase() === lower ? 1 : 0;
      return bExact - aExact || b.platformCount - a.platformCount || a.name.localeCompare(b.name);
    });

  results.push(...matches.map(toResult));
  return json({ source: isLive() ? "live" : "generated", results: results.slice(0, limit) });
});

/** Offer "All <city> stations" ahead of the individual termini. */
function groupByCity(stations: Station[]): StationResult[] {
  const byCity = new Map<string, Station[]>();
  for (const station of stations) {
    const list = byCity.get(station.city) ?? [];
    list.push(station);
    byCity.set(station.city, list);
  }

  const groups: StationResult[] = [];
  for (const [city, members] of byCity) {
    if (members.length < 2) continue;
    groups.push({
      kind: "city",
      token: `city:${city}`,
      code: city,
      name: `All ${city} stations`,
      city,
      stateCode: members[0].stateCode,
      memberCodes: members.map((m) => m.code),
      platformCount: members.reduce((n, m) => n + m.platformCount, 0),
    });
  }
  return [...groups, ...stations.map(toResult)];
}
