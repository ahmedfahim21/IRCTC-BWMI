import type {
  Availability,
  AvailabilityState,
  ClassCode,
  QuotaCode,
  Train,
} from "@/lib/types";
import { rngFor } from "./rng";
import { BERTH_COUNTS } from "./berths";
import { computeFare } from "@/lib/domain/fares";
import { addDays, daysBetween } from "@/lib/domain/time";

export { addDays, daysBetween };

/** Share of a class's capacity carved out for each quota. */
const QUOTA_SHARE: Record<QuotaCode, number> = {
  GN: 0.72,
  TQ: 0.1,
  PT: 0.04,
  LD: 0.03,
  SS: 0.03,
  DF: 0.08,
};

/** Classes that run an RAC pool before spilling into waitlist. */
const HAS_RAC: ClassCode[] = ["SL", "3A", "3E", "2A", "CC"];

export const ALL_QUOTAS: QuotaCode[] = ["GN", "TQ", "PT", "LD", "SS"];

export function dayOfWeek(dateIso: string): number {
  return new Date(`${dateIso}T00:00:00Z`).getUTCDay();
}

export function runsOnDate(train: Train, dateIso: string): boolean {
  return train.runsOn.includes(dayOfWeek(dateIso));
}

/** Seats in a class across the whole rake. */
export function classCapacity(train: Train, classCode: ClassCode): number {
  return train.rake
    .filter((c) => c.type === (classCode as string))
    .reduce((sum, c) => sum + BERTH_COUNTS[c.type], 0);
}

/**
 * How sought-after a journey is, 0..1+. Driven by the train's own pull, the day
 * of week, how close to departure we are, and how much of the route you're using.
 */
function demandFactor(
  train: Train,
  dateIso: string,
  classCode: ClassCode,
  segmentShare: number,
  today: string
): number {
  const rng = rngFor(`demand:${train.number}:${classCode}:${dateIso}`);
  const trainPull = rngFor(`pull:${train.number}`).next(); // 0..1, stable per train
  const dow = dayOfWeek(dateIso);
  const weekendLift = dow === 5 || dow === 0 ? 0.18 : dow === 6 ? 0.1 : 0;
  const daysOut = daysBetween(today, dateIso);
  // Bookings pile up as departure nears; far-out dates are wide open.
  const proximity = 0.3 + 0.7 * Math.exp(-Math.max(0, daysOut) / 18);
  // Sleeper fills before AC; premium classes stay open longer.
  const classLift = classCode === "SL" ? 0.14 : classCode === "3A" ? 0.08 : classCode === "1A" ? -0.18 : classCode === "2A" ? -0.06 : 0;

  /*
   * Inventory is per-segment, not per-train. A train that is full end to end
   * usually still has room on a short hop near one end, because far fewer people
   * ride that leg. This is what makes split ticketing and boarding at a nearby
   * station real options rather than decoration.
   */
  const segmentFactor = 0.38 + 0.62 * segmentShare;

  return Math.max(
    0.05,
    (0.62 + trainPull * 0.8 + weekendLift + classLift) * segmentFactor * proximity * rng.gaussian(1, 0.09)
  );
}

/**
 * How deep the waitlist cleared on each of the last 60 runs of this journey.
 * This is the ground truth the confirmation-probability model reads from — the
 * number is derived from history rather than invented at display time.
 */
export function clearedDepthHistory(
  train: Train,
  classCode: ClassCode,
  quota: QuotaCode,
  daysOut: number
): number[] {
  // Cancellations come from the whole class, not just this quota's slice —
  // a berth freed anywhere in 3A is a berth the general waitlist can take.
  const capacity = classCapacity(train, classCode);
  const rng = rngFor(`history:${train.number}:${classCode}:${quota}`);
  const trainPull = rngFor(`pull:${train.number}`).next();
  // Late cancellations and quota releases free up roughly this share of capacity.
  const baseChurn = 0.1 + (1 - trainPull) * 0.16;
  // Booking early means more time for the queue ahead of you to dissolve.
  const timeBonus = Math.min(1.6, 0.45 + daysOut / 22);

  return Array.from({ length: 60 }, () =>
    Math.max(0, Math.round(capacity * baseChurn * timeBonus * rng.gaussian(1, 0.42)))
  );
}

/**
 * Chance a given waitlist position confirms, read straight off the history:
 * of the last N runs, how often did the queue clear at least this deep?
 * Always returned with its sample size — a bare percentage is not honest.
 */
export function confirmProbability(
  train: Train,
  classCode: ClassCode,
  quota: QuotaCode,
  waitlistPosition: number,
  daysOut: number
): { probability: number; sampleSize: number } {
  const history = clearedDepthHistory(train, classCode, quota, daysOut);
  const cleared = history.filter((depth) => depth >= waitlistPosition).length;
  return { probability: cleared / history.length, sampleSize: history.length };
}

export interface AvailabilityQuery {
  train: Train;
  dateIso: string;
  classCode: ClassCode;
  quota: QuotaCode;
  fromCode: string;
  toCode: string;
  today: string;
}

/** Waitlist label prefix. Boarding mid-route puts you in a different, worse queue. */
function waitlistPrefix(train: Train, fromCode: string, quota: QuotaCode): string {
  if (quota === "TQ") return "TQWL";
  if (quota === "PT") return "PQWL";
  if (quota === "LD") return "LDWL";
  const isOrigin = train.schedule[0].stationCode === fromCode;
  const isDestination = train.schedule[train.schedule.length - 1].stationCode === fromCode;
  if (isOrigin || isDestination) return "GNWL";
  // Remote-location quota: a small pool held for intermediate stations.
  return "RLWL";
}

export function getAvailability(query: AvailabilityQuery): Availability {
  const { train, dateIso, classCode, quota, fromCode, toCode, today } = query;

  const fromStop = train.schedule.find((s) => s.stationCode === fromCode);
  const toStop = train.schedule.find((s) => s.stationCode === toCode);
  if (!fromStop || !toStop) {
    throw new Error(`${train.number} does not serve ${fromCode} → ${toCode}`);
  }

  const distanceKm = toStop.distanceKm - fromStop.distanceKm;
  const segmentShare = distanceKm / train.distanceKm;
  const daysOut = daysBetween(today, dateIso);

  const capacity = Math.round(classCapacity(train, classCode) * QUOTA_SHARE[quota]);
  const demand = demandFactor(train, dateIso, classCode, segmentShare, today);
  const booked = Math.round(capacity * demand);

  const racCapacity = HAS_RAC.includes(classCode) ? Math.round(capacity * 0.09) : 0;
  const maxWaitlist = Math.round(capacity * 0.85);

  let state: AvailabilityState;
  let count: number;
  let label: string;

  if (daysOut < 0) {
    state = "departed";
    count = 0;
    label = "DEPARTED";
  } else if (!runsOnDate(train, dateIso)) {
    state = "notAvailable";
    count = 0;
    label = "NOT RUNNING";
  } else if (booked < capacity) {
    state = "available";
    count = capacity - booked;
    label = `AVL ${count}`;
  } else if (booked < capacity + racCapacity) {
    state = "rac";
    count = booked - capacity + 1;
    label = `RAC ${count}`;
  } else if (booked < capacity + racCapacity + maxWaitlist) {
    state = "waitlist";
    count = booked - capacity - racCapacity + 1;
    label = `${waitlistPrefix(train, fromCode, quota)} ${count}`;
  } else {
    state = "regretted";
    count = 0;
    label = "REGRET";
  }

  const occupancy = Math.min(1, booked / Math.max(1, capacity));
  const fare = computeFare({
    classCode,
    quota,
    trainType: train.type,
    distanceKm,
    occupancy,
    includeCatering: true,
  });

  const odds =
    state === "waitlist" || state === "rac"
      ? confirmProbability(train, classCode, quota, state === "rac" ? 0 : count, daysOut)
      : null;

  return {
    trainNumber: train.number,
    date: dateIso,
    classCode,
    quota,
    state,
    count,
    label,
    fare,
    confirmProbability: state === "rac" ? 0.97 : odds ? odds.probability : null,
    sampleSize: odds ? odds.sampleSize : 0,
  };
}

/** Every class of a train for one journey — the row behind the availability matrix. */
export function getAvailabilityMatrix(
  train: Train,
  dateIso: string,
  fromCode: string,
  toCode: string,
  quota: QuotaCode,
  today: string
): Availability[] {
  return train.classes.map((classCode) =>
    getAvailability({ train, dateIso, classCode, quota, fromCode, toCode, today })
  );
}

export { QUOTA_SHARE };
