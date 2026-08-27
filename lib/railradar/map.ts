import type {
  Availability,
  ClassCode,
  Coach,
  CoachType,
  LiveStatus,
  QuotaCode,
  ScheduleStop,
  Station,
  Train,
  TrainType,
} from "@/lib/types";
import { BERTH_COUNTS } from "@/lib/mock/berths";
import { computeFare } from "@/lib/domain/fares";
import { IST_OFFSET_MINUTES } from "@/lib/domain/time";
import type {
  RrCoachesResponse,
  RrLiveResponse,
  RrSeatDay,
  RrStationSearchResult,
  RrTrainResponse,
} from "./types";

const DAY_INDEX: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function toRunsOn(runDays: string[]): number[] {
  return runDays.map((d) => DAY_INDEX[d.toLowerCase().slice(0, 3)]).filter((n) => n !== undefined);
}

/** "21:35" on day N -> minutes from midnight on day 1. */
export function toJourneyMinute(time: string | undefined, day: number | undefined): number | null {
  if (!time) return null;
  const [hh, mm] = time.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return (Math.max(1, day ?? 1) - 1) * 1440 + hh * 60 + mm;
}

/** "2026-08-27T21:35:00+05:30" -> minutes from midnight IST on `startDate`. */
export function isoToJourneyMinute(iso: string | undefined, startDate: string): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return null;
  const dayStart = Date.parse(`${startDate}T00:00:00Z`) - IST_OFFSET_MINUTES * 60_000;
  return Math.round((at - dayStart) / 60_000);
}

const TRAIN_TYPE: Array<[RegExp, TrainType]> = [
  [/rajdhani/i, "rajdhani"],
  [/shatabdi/i, "shatabdi"],
  [/vande/i, "vandeBharat"],
  [/duronto/i, "duronto"],
  [/superfast|super fast/i, "superfast"],
  [/passenger|memu|demu|local/i, "passenger"],
];

export function toTrainType(type: string, category?: string): TrainType {
  const haystack = `${type} ${category ?? ""}`;
  for (const [pattern, value] of TRAIN_TYPE) {
    if (pattern.test(haystack)) return value;
  }
  return "express";
}

/** "S7" -> SL, "B2" -> 3A, "LPR" -> SLR, and so on. */
export function toCoachType(code: string, classType?: string): CoachType {
  const upper = (classType ?? "").toUpperCase();
  if (upper === "LOCO" || code === "ENG") return "ENG";
  if (upper === "EOG" || upper === "SLR" || upper === "SLRD" || /^(LPR|SLR|EOG)/.test(code)) return "SLR";
  if (upper === "GEN" || upper === "GS" || /^GEN/.test(code)) return "GS";
  if (upper === "PC" || /^PC/.test(code)) return "PC";

  const direct: Record<string, CoachType> = { "1A": "1A", "2A": "2A", "3A": "3A", "3E": "3E", SL: "SL", CC: "CC", EC: "EC", "2S": "2S" };
  if (direct[upper]) return direct[upper];

  const byLetter: Record<string, CoachType> = { H: "1A", A: "2A", B: "3A", M: "3E", S: "SL", C: "CC", E: "EC", D: "2S" };
  const letter = code.match(/^([A-Z])\d+$/)?.[1];
  return (letter && byLetter[letter]) || "GS";
}

/** "ENG-LPR-GEN-S7-B1-..." -> an ordered rake. */
export function parseCoachPosition(position: string | undefined): Coach[] {
  if (!position) return [];
  return position
    .split("-")
    .filter(Boolean)
    .map((code, index) => {
      const type = toCoachType(code);
      return { code, type, position: index + 1, berthCount: BERTH_COUNTS[type] };
    });
}

export function rakeFromCoaches(response: RrCoachesResponse): Coach[] {
  if (response.rake?.length) {
    return response.rake.map((coach) => {
      const type = toCoachType(coach.code, coach.classType);
      return {
        code: coach.code,
        type,
        position: coach.position,
        berthCount: coach.totalBerths || BERTH_COUNTS[type],
      };
    });
  }
  return parseCoachPosition(response.coachPosition);
}

export function stationFromRef(ref: { code: string; name: string; city?: string; lat?: number; lng?: number }): Station {
  return {
    code: ref.code,
    name: titleCase(ref.name),
    city: titleCase(ref.city ?? ref.name),
    stateCode: "",
    lat: ref.lat ?? Number.NaN,
    lng: ref.lng ?? Number.NaN,
    zone: "",
    platformCount: 0,
  };
}

/** RailRadar returns some names in caps; the UI is title case throughout. */
export function titleCase(value: string): string {
  if (!/[a-z]/.test(value)) {
    return value
      .toLowerCase()
      .replace(/\b[a-z]/g, (c) => c.toUpperCase())
      .replace(/\bJn\b/gi, "Jn");
  }
  return value;
}

export function stationsFromSearch(results: RrStationSearchResult[]): Station[] {
  return results.map((r) => ({
    code: r.code,
    name: titleCase(r.name),
    city: titleCase(r.city),
    stateCode: "",
    lat: Number.NaN,
    lng: Number.NaN,
    zone: "",
    // The API ranks by popularity rather than platform count; reuse the field
    // for ordering so the rest of the app can stay unchanged.
    platformCount: Math.min(20, Math.round(r.popularity / 40)),
  }));
}

export function classesFromRake(rake: Coach[]): ClassCode[] {
  const bookable: ClassCode[] = ["1A", "2A", "3A", "3E", "SL", "CC", "EC", "2S"];
  const present = new Set(rake.map((c) => c.type as string));
  return bookable.filter((code) => present.has(code));
}

export function trainFromResponse(response: RrTrainResponse, rake: Coach[]): { train: Train; stations: Record<string, Station> } {
  const meta = response.train;
  const stations: Record<string, Station> = {};

  const schedule: ScheduleStop[] = response.route.map((stop) => {
    stations[stop.station.code] = stationFromRef(stop.station);
    const arrivalMinute = toJourneyMinute(stop.arrival, stop.arrivalDay);
    const departureMinute = toJourneyMinute(stop.departure, stop.departureDay);
    return {
      stationCode: stop.station.code,
      arrivalMinute,
      departureMinute,
      dayOffset: Math.max(0, (stop.arrivalDay ?? stop.departureDay ?? 1) - 1),
      distanceKm: stop.distance,
      isHalt: stop.isHalt,
      haltMins:
        arrivalMinute !== null && departureMinute !== null ? Math.max(0, departureMinute - arrivalMinute) : 0,
      platform: stop.platform ? Number(stop.platform) || null : null,
    };
  });

  const effectiveRake = rake.length ? rake : parseCoachPosition(meta.coachPosition);
  const first = schedule[0];
  const last = schedule[schedule.length - 1];

  return {
    train: {
      number: meta.number,
      name: titleCase(meta.name),
      type: toTrainType(meta.type, meta.category),
      // Corridors are a construct of the generated world; live trains have none.
      corridorId: "",
      direction: "up",
      runsOn: toRunsOn(meta.runDays),
      classes: classesFromRake(effectiveRake),
      hasPantry: effectiveRake.some((c) => c.type === "PC"),
      returnTrainNumber: meta.returnTrain ?? "",
      departureMinute: first?.departureMinute ?? 0,
      schedule,
      rake: effectiveRake,
      avgDelayMins: 0,
      distanceKm: meta.distance || last?.distanceKm || 0,
      durationMins: meta.duration,
      haltCount: meta.totalHalts || schedule.filter((s) => s.isHalt).length,
      avgSpeedKmph: meta.avgSpeed,
      maxSpeedKmph: meta.maxSpeed,
    },
    stations,
  };
}

const LIVE_STATE: Record<string, LiveStatus["state"]> = {
  "not-started": "notStarted",
  running: "running",
  completed: "arrived",
  terminated: "arrived",
};

export function liveFromResponse(
  response: RrLiveResponse,
  stations: Record<string, Station>
): { live: LiveStatus; timeline: Array<{ stationCode: string; delayMins: number; actualArrival: number | null; actualDeparture: number | null }> } {
  const startDate = response.startDate;
  const current = response.currentLocation;

  const timeline = response.route.map((stop) => ({
    stationCode: stop.stationCode,
    delayMins: stop.delayArrival ?? stop.delayDeparture ?? 0,
    actualArrival:
      isoToJourneyMinute(stop.actualArrival, startDate) ?? isoToJourneyMinute(stop.scheduledArrival, startDate),
    actualDeparture:
      isoToJourneyMinute(stop.actualDeparture, startDate) ?? isoToJourneyMinute(stop.scheduledDeparture, startDate),
  }));

  const etaByStation: LiveStatus["etaByStation"] = {};
  for (const entry of timeline) {
    etaByStation[entry.stationCode] = {
      etaMinute: entry.actualArrival ?? entry.actualDeparture ?? 0,
      delayMins: entry.delayMins,
    };
  }

  const here = current ? stations[current.stationCode] : undefined;
  const state = LIVE_STATE[response.status] ?? (current?.status === "at-station" ? "halted" : "running");

  return {
    live: {
      trainNumber: response.trainNumber,
      date: startDate,
      state: state === "running" && current?.status === "at-station" ? "halted" : state,
      lastStationCode: current?.stationCode ?? null,
      nextStopCode: response.nextHalt?.stationCode ?? null,
      delayMins: response.delayMinutes ?? current?.delayMinutes ?? 0,
      position: {
        lat: here?.lat ?? Number.NaN,
        lng: here?.lng ?? Number.NaN,
      },
      speedKmph: 0,
      distanceCoveredKm: current?.distanceFromOriginKm ?? 0,
      etaByStation,
      updatedAt: response.lastUpdatedAt,
      haltedSinceMinute: null,
    },
    timeline,
  };
}

/** RailRadar's seat calendar -> our Availability, with fares computed locally. */
export function availabilityFromSeatDay(
  day: RrSeatDay,
  train: Train,
  classCode: ClassCode,
  quota: QuotaCode,
  distanceKm: number
): Availability {
  let state: Availability["state"];
  let count: number;
  let label: string;

  switch (day.statusCode) {
    case "AVAILABLE":
      state = "available";
      count = day.availableSeats ?? 0;
      label = `AVL ${count}`;
      break;
    case "RAC":
      state = "rac";
      count = day.waitlistNumber ?? 1;
      label = `RAC ${count}`;
      break;
    case "WAITLIST":
      state = "waitlist";
      count = day.waitlistNumber ?? 1;
      label = `${day.waitlistType ?? "GNWL"} ${count}`;
      break;
    case "REGRET":
      state = "regretted";
      count = 0;
      label = "REGRET";
      break;
    default:
      state = "notAvailable";
      count = 0;
      label = day.status || "NOT AVAILABLE";
  }

  return {
    trainNumber: train.number,
    date: day.rawDate ?? day.date,
    classCode,
    quota,
    state,
    count,
    label,
    fare: computeFare({
      classCode,
      quota,
      trainType: train.type,
      distanceKm,
      occupancy: state === "available" ? 0.6 : 0.97,
      includeCatering: true,
    }),
    confirmProbability: null,
    sampleSize: 0,
  };
}
