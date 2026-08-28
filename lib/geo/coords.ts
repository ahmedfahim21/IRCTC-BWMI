import type { Station } from "@/lib/types";
import { lookupStationCoords } from "./stationCoords";

function isUsable(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

/**
 * Prefer coordinates already on the station; otherwise look the code up in
 * the bundled table. A miss stays NaN — never (0, 0), which would pin the
 * Himalayas to the Gulf of Guinea.
 */
export function backfillCoords(station: Station): Station {
  if (isUsable(station.lat, station.lng)) return station;
  const found = lookupStationCoords(station.code);
  if (!found) return { ...station, lat: Number.NaN, lng: Number.NaN };
  return { ...station, lat: found.lat, lng: found.lng };
}
