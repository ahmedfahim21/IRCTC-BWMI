import type { Availability, Station, Train } from "@/lib/types";
import type { JourneyOption } from "@/lib/domain/search";

/** A train, minus its 80-stop schedule — enough to render a results row. */
export interface TrainSummary {
  number: string;
  name: string;
  type: Train["type"];
  hasPantry: boolean;
  runsOn: number[];
  avgDelayMins: number;
  classes: Train["classes"];
  originCode: string;
  destinationCode: string;
  totalDistanceKm: number;
}

export function toTrainSummary(train: Train): TrainSummary {
  return {
    number: train.number,
    name: train.name,
    type: train.type,
    hasPantry: train.hasPantry,
    runsOn: train.runsOn,
    avgDelayMins: train.avgDelayMins,
    classes: train.classes,
    originCode: train.schedule[0].stationCode,
    destinationCode: train.schedule[train.schedule.length - 1].stationCode,
    totalDistanceKm: train.distanceKm,
  };
}

export interface JourneyDto {
  train: TrainSummary;
  fromCode: string;
  toCode: string;
  fromPlatform: number | null;
  toPlatform: number | null;
  departureMinute: number;
  arrivalMinute: number;
  durationMins: number;
  distanceKm: number;
  daySpan: number;
  runsToday: boolean;
  /** Where boarding and alighting sit along the train's whole run, 0..1. */
  boardAtFraction: number;
  alightAtFraction: number;
  availability: Availability[];
}

export function toJourneyDto(j: JourneyOption): JourneyDto {
  return {
    train: toTrainSummary(j.train),
    fromCode: j.fromStop.stationCode,
    toCode: j.toStop.stationCode,
    fromPlatform: j.fromStop.platform,
    toPlatform: j.toStop.platform,
    departureMinute: j.departureMinute,
    arrivalMinute: j.arrivalMinute,
    durationMins: j.durationMins,
    distanceKm: j.distanceKm,
    daySpan: j.daySpan,
    runsToday: j.runsToday,
    boardAtFraction: j.fromStop.distanceKm / j.train.distanceKm,
    alightAtFraction: j.toStop.distanceKm / j.train.distanceKm,
    availability: j.availability,
  };
}

/** Stations referenced by a response, so the client never needs a second lookup. */
export function stationSidecar(codes: Iterable<string>, all: Map<string, Station>): Record<string, Station> {
  const out: Record<string, Station> = {};
  for (const code of codes) {
    const station = all.get(code);
    if (station) out[code] = station;
  }
  return out;
}
