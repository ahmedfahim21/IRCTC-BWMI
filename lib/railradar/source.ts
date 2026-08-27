import type { Availability, ClassCode, Coach, LiveStatus, QuotaCode, Station, Train } from "@/lib/types";
import { callRailRadar, isLive, TTL } from "./client";
import {
  availabilityFromSeatDay,
  liveFromResponse,
  rakeFromCoaches,
  stationsFromSearch,
  stationFromRef,
  titleCase,
  toJourneyMinute,
  toRunsOn,
  trainFromResponse,
} from "./map";
import { toLiveCode, searchDirectory } from "./stations";
import type {
  RrBetweenResponse,
  RrCoachesResponse,
  RrLiveResponse,
  RrSeatsResponse,
  RrStationSearchResult,
  RrTrainResponse,
} from "./types";

export { isLive, quotaStatus } from "./client";

/**
 * Live data, shaped into the app's own domain types.
 *
 * Every function returns null when no key is configured, so each route handler
 * can fall back to the generated world. Nothing here invents data: if the API
 * is reachable but has nothing, that's what comes back.
 */

export async function liveStationSearch(query: string, limit: number): Promise<Station[] | null> {
  if (!isLive()) return null;

  // The full directory covers every station; the autocomplete endpoint ranks by
  // popularity and drops obvious answers ("delhi" came back without New Delhi).
  const fromDirectory = await searchDirectory(query, limit).catch(() => null);
  if (fromDirectory?.length) return fromDirectory;

  const results = await callRailRadar<RrStationSearchResult[]>(
    "/lookup/search/stations",
    { q: query, limit },
    TTL.static
  );
  return results ? stationsFromSearch(results.filter((r) => r.isActive)) : null;
}

export async function liveTrain(
  number: string
): Promise<{ train: Train; stations: Record<string, Station> } | null> {
  if (!isLive()) return null;
  const [schedule, coaches] = await Promise.all([
    callRailRadar<RrTrainResponse>(`/trains/${number}`, {}, TTL.static),
    callRailRadar<RrCoachesResponse>(`/trains/${number}/coaches`, {}, TTL.static).catch(() => null),
  ]);
  if (!schedule) return null;
  const rake: Coach[] = coaches ? rakeFromCoaches(coaches) : [];
  return trainFromResponse(schedule, rake);
}

export async function liveStatus(
  number: string,
  journeyDate: string,
  stations: Record<string, Station>
): Promise<{ live: LiveStatus; timeline: Array<{ stationCode: string; delayMins: number; actualArrival: number | null; actualDeparture: number | null }> } | null> {
  if (!isLive()) return null;
  const response = await callRailRadar<RrLiveResponse>(
    `/trains/${number}/live`,
    { journeyDate },
    TTL.live
  );
  return response ? liveFromResponse(response, stations) : null;
}

export interface LiveJourney {
  trainNumber: string;
  trainName: string;
  trainType: string;
  runsOn: number[];
  fromCode: string;
  toCode: string;
  fromName: string;
  toName: string;
  departureMinute: number;
  arrivalMinute: number;
  durationMins: number;
  distanceKm: number;
  haltsBetween: number;
}

export async function liveTrainsBetween(
  from: string,
  to: string,
  date: string
): Promise<{ journeys: LiveJourney[]; stations: Record<string, Station>; answered: boolean } | null> {
  if (!isLive()) return null;
  const response = await callRailRadar<RrBetweenResponse>(
    `/trains/between/${toLiveCode(from)}/${toLiveCode(to)}`,
    { date },
    TTL.routes
  );
  if (!response) return null;

  const stations: Record<string, Station> = {
    [response.from.code]: stationFromRef(response.from),
    [response.to.code]: stationFromRef(response.to),
  };

  const journeys = response.trains.flatMap((entry) => {
    const departureMinute = toJourneyMinute(entry.from.departure, entry.from.day);
    const arrivalMinute = toJourneyMinute(entry.to.arrival, entry.to.day);
    if (departureMinute === null || arrivalMinute === null) return [];
    stations[entry.from.code] = stationFromRef(entry.from);
    stations[entry.to.code] = stationFromRef(entry.to);
    return [
      {
        trainNumber: entry.train.number,
        trainName: titleCase(entry.train.name),
        trainType: entry.train.type,
        runsOn: toRunsOn(entry.train.runDays),
        fromCode: entry.from.code,
        toCode: entry.to.code,
        fromName: titleCase(entry.from.name),
        toName: titleCase(entry.to.name),
        departureMinute,
        arrivalMinute,
        durationMins: entry.duration,
        distanceKm: entry.distance,
        haltsBetween: entry.totalHaltsBetween,
      },
    ];
  });

  /*
   * `answered: true` means the network genuinely replied for this pair — even
   * with an empty list. That's a real answer ("no direct train"), not a reason
   * to fall back to the generated world and mislabel a valid station as unknown.
   */
  return { journeys, stations, answered: true };
}

/**
 * A 14-day availability calendar for one class. One upstream call covers the
 * whole fortnight, which is what makes the date strip affordable on a
 * 1,000-request budget.
 */
export async function liveSeatCalendar(
  train: Train,
  classCode: ClassCode,
  quota: QuotaCode,
  from: string,
  to: string,
  journeyDate: string,
  distanceKm: number
): Promise<Availability[] | null> {
  if (!isLive()) return null;
  const response = await callRailRadar<RrSeatsResponse>(
    `/trains/${train.number}/seats`,
    { journeyDate, source: toLiveCode(from), destination: toLiveCode(to), classCode, quotaCode: quota },
    TTL.seats
  );
  if (!response) return null;
  return response.calendar.map((day) =>
    availabilityFromSeatDay(day, train, classCode, quota, distanceKm)
  );
}
