import type { Availability, ClassCode, QuotaCode, ScheduleStop, Station, Train } from "@/lib/types";
import { getWorld } from "@/lib/mock/seed";
import { getAvailabilityMatrix, runsOnDate } from "@/lib/mock/availability";
import { PRINCIPAL_TERMINAL, toMockCode } from "@/lib/railradar/codes";

export interface JourneyOption {
  train: Train;
  fromStop: ScheduleStop;
  toStop: ScheduleStop;
  departureMinute: number;
  arrivalMinute: number;
  durationMins: number;
  distanceKm: number;
  /** Days the journey spans, 1 = arrives the same calendar day. */
  daySpan: number;
  runsToday: boolean;
  availability: Availability[];
}

/** Great-circle distance in km. */
export function haversineKm(a: Station, b: Station): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** A waitlisted seat you'd actually accept. */
export function isConfirmable(a: Availability): boolean {
  if (a.state === "available") return true;
  if (a.state === "rac") return true;
  if (a.state === "waitlist") return (a.confirmProbability ?? 0) >= 0.7;
  return false;
}

export function bestAvailability(options: Availability[]): Availability | null {
  const rank = (a: Availability) =>
    a.state === "available" ? 0 : a.state === "rac" ? 1 : a.state === "waitlist" ? 2 : 3;
  return [...options].sort((x, y) => rank(x) - rank(y) || (y.confirmProbability ?? 0) - (x.confirmProbability ?? 0))[0] ?? null;
}

/** Trains that halt at both stations, in the right order. */
export function trainsServing(fromCode: string, toCode: string): Array<{ train: Train; fromStop: ScheduleStop; toStop: ScheduleStop }> {
  const { trainList } = getWorld();
  const out = [];
  for (const train of trainList) {
    const fromIndex = train.schedule.findIndex((s) => s.stationCode === fromCode && s.isHalt);
    if (fromIndex < 0) continue;
    const toIndex = train.schedule.findIndex((s) => s.stationCode === toCode && s.isHalt);
    if (toIndex <= fromIndex) continue;
    out.push({ train, fromStop: train.schedule[fromIndex], toStop: train.schedule[toIndex] });
  }
  return out;
}

export function buildJourney(
  train: Train,
  fromStop: ScheduleStop,
  toStop: ScheduleStop,
  dateIso: string,
  quota: QuotaCode,
  today: string
): JourneyOption {
  const departureMinute = fromStop.departureMinute!;
  const arrivalMinute = toStop.arrivalMinute!;
  return {
    train,
    fromStop,
    toStop,
    departureMinute,
    arrivalMinute,
    durationMins: arrivalMinute - departureMinute,
    distanceKm: toStop.distanceKm - fromStop.distanceKm,
    daySpan: Math.floor(arrivalMinute / 1440) - Math.floor(departureMinute / 1440) + 1,
    runsToday: runsOnDate(train, dateIso),
    availability: getAvailabilityMatrix(train, dateIso, fromStop.stationCode, toStop.stationCode, quota, today),
  };
}

export interface SearchParams {
  fromCode: string;
  toCode: string;
  dateIso: string;
  quota: QuotaCode;
  today: string;
  classes?: ClassCode[];
}

export function searchJourneys(params: SearchParams): JourneyOption[] {
  const { fromCode, toCode, dateIso, quota, today, classes } = params;
  return trainsServing(fromCode, toCode)
    .map(({ train, fromStop, toStop }) => buildJourney(train, fromStop, toStop, dateIso, quota, today))
    .filter((j) => !classes?.length || j.train.classes.some((c) => classes.includes(c)))
    .sort((a, b) => a.departureMinute - b.departureMinute);
}

/** Stations serving the same city, so "Delhi" means NDLS, NZM, DLI and ANVT. */
export function resolveStationGroup(token: string): string[] {
  const world = getWorld();
  if (token.startsWith("city:")) {
    const city = token.slice(5);
    const grouped = world.stationsByCity.get(city);
    if (grouped && grouped.length > 0) return grouped;
    const principal = PRINCIPAL_TERMINAL[city.toUpperCase()];
    if (principal && world.stations.has(principal)) return [principal];
    const mapped = principal ? toMockCode(principal) : "";
    return mapped && world.stations.has(mapped) ? [mapped] : [];
  }
  if (world.stations.has(token)) return [token];
  const mapped = toMockCode(token);
  return world.stations.has(mapped) ? [mapped] : [];
}
