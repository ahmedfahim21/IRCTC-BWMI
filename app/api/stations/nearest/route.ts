import type { NextRequest } from "next/server";
import { getWorld } from "@/lib/mock/seed";
import { haversineKm } from "@/lib/domain/search";
import { handler, json } from "@/lib/api/http";

/**
 * Which station should we start you from?
 *
 * Two ways of knowing, in order of how much they can be trusted:
 *
 *  - `coords`  the browser's Geolocation API, which the user explicitly allowed.
 *  - `network` the coarse city-level location a host like Vercel derives from
 *              the request IP. No permission prompt, no third-party lookup, and
 *              it never leaves this server.
 *
 * If neither is available we say so and let the user type, rather than quietly
 * assuming New Delhi.
 *
 * Matching runs against our own station table rather than the 10,000-entry
 * national directory, because that directory carries no coordinates — and
 * because the answer you want is a junction with trains, not whichever
 * unstaffed halt happens to be nearest.
 */
export interface NearestStation {
  code: string;
  name: string;
  city: string;
  distanceKm: number;
}

export interface NearestResponse {
  source: "coords" | "network" | "none";
  /** Roughly where we think you are. Null when we have no idea. */
  near: { city: string | null; region: string | null } | null;
  origin: NearestStation | null;
  alternatives: NearestStation[];
}

/** Beyond this, "nearest station" stops being a useful suggestion. */
const MAX_DISTANCE_KM = 250;

const weight = ({ station, distanceKm }: { station: { platformCount: number }; distanceKm: number }) =>
  distanceKm / Math.pow(Math.max(1, station.platformCount), 0.75);

export const GET = handler(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const headers = request.headers;

  /*
   * Number(null) is 0, not NaN — so reading a missing coordinate straight into
   * Number() silently produces a valid-looking fix in the Gulf of Guinea.
   */
  const coordinate = (value: string | null): number | null => {
    if (value === null || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const queryLat = coordinate(params.get("lat"));
  const queryLng = coordinate(params.get("lng"));
  const hasQuery = queryLat !== null && queryLng !== null;

  const headerLat = coordinate(headers.get("x-vercel-ip-latitude"));
  const headerLng = coordinate(headers.get("x-vercel-ip-longitude"));
  const hasHeader = headerLat !== null && headerLng !== null;

  const source: NearestResponse["source"] = hasQuery ? "coords" : hasHeader ? "network" : "none";
  if (source === "none") {
    return json<NearestResponse>({ source, near: null, origin: null, alternatives: [] });
  }

  const lat = (hasQuery ? queryLat : headerLat) as number;
  const lng = (hasQuery ? queryLng : headerLng) as number;
  const here = { lat, lng } as Parameters<typeof haversineKm>[0];

  const ranked = getWorld()
    .stationList.map((station) => ({ station, distanceKm: haversineKm(here, station) }))
    .filter(({ distanceKm }) => distanceKm <= MAX_DISTANCE_KM)
    /*
     * Distance dominates, but a big junction is worth travelling a little
     * further for — that is where the trains actually are. The exponent is
     * tuned so a mainline terminus a few kilometres away beats a small halt
     * next door, while nothing 100 km off can ever win on size alone.
     */
    .sort((a, b) => weight(a) - weight(b));

  const toResult = ({ station, distanceKm }: { station: (typeof ranked)[number]["station"]; distanceKm: number }): NearestStation => ({
    code: station.code,
    name: station.name,
    city: station.city,
    distanceKm: Math.round(distanceKm),
  });

  return json<NearestResponse>({
    source,
    near: {
      city: headers.get("x-vercel-ip-city") ? decodeURIComponent(headers.get("x-vercel-ip-city")!) : null,
      region: headers.get("x-vercel-ip-country-region"),
    },
    origin: ranked[0] ? toResult(ranked[0]) : null,
    // Distinct cities only, so the list isn't four termini in one metro.
    alternatives: ranked
      .slice(1)
      .filter((entry, index, all) => all.findIndex((other) => other.station.city === entry.station.city) === index)
      .slice(0, 4)
      .map(toResult),
  });
});
