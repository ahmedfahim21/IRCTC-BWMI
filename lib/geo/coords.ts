import type { Station } from "@/lib/types";
import { lookupStationCoords } from "./stationCoords";

/**
 * Fill missing coordinates from the bundled table. A miss stays NaN — callers
 * skip the pin rather than painting (0, 0) in the Gulf of Guinea.
 */
export function backfillCoords(station: Station): Station {
  if (Number.isFinite(station.lat) && Number.isFinite(station.lng)) return station;
  const coords = lookupStationCoords(station.code);
  if (!coords) return station;
  return { ...station, lat: coords.lat, lng: coords.lng };
}
