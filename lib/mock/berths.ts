import type { Berth, BerthType, CoachType } from "@/lib/types";
import { rngFor } from "./rng";

/** Berths per coach, by coach type. */
export const BERTH_COUNTS: Record<CoachType, number> = {
  ENG: 0,
  SLR: 0,
  GS: 90,
  PC: 0,
  "1A": 18,
  "2A": 46,
  "3A": 64,
  "3E": 78,
  SL: 72,
  CC: 78,
  EC: 56,
  "2S": 108,
};

/**
 * Berth type for a given 1-based berth number, per Indian Railways layouts.
 * Sleeper and 3A: bays of 8 (6 main + 2 side). 2A: bays of 6 (4 main + 2 side).
 * 1A: cabins of 4 and coupes of 2. Seated classes use window/aisle/middle.
 */
export function berthTypeFor(coachType: CoachType, n: number): { type: BerthType; bay: number } {
  switch (coachType) {
    case "SL":
    case "3A":
    case "3E": {
      const bay = Math.ceil(n / 8);
      const seq = ((n - 1) % 8) + 1;
      const map: BerthType[] = ["LB", "MB", "UB", "LB", "MB", "UB", "SL", "SU"];
      return { type: map[seq - 1], bay };
    }
    case "2A": {
      const bay = Math.ceil(n / 6);
      const seq = ((n - 1) % 6) + 1;
      const map: BerthType[] = ["LB", "UB", "LB", "UB", "SL", "SU"];
      return { type: map[seq - 1], bay };
    }
    case "1A": {
      const bay = Math.ceil(n / 4);
      const seq = ((n - 1) % 4) + 1;
      return { type: seq <= 2 ? "CB" : "LB", bay };
    }
    case "CC":
    case "EC":
    case "2S":
    case "GS": {
      const perRow = coachType === "EC" ? 4 : coachType === "2S" ? 6 : 5;
      const bay = Math.ceil(n / perRow);
      const seq = ((n - 1) % perRow) + 1;
      const type: BerthType = seq === 1 || seq === perRow ? "WS" : "AS";
      return { type, bay };
    }
    default:
      return { type: "LB", bay: 1 };
  }
}

/**
 * A coach's berth map for a given journey. Booked berths are seeded from the
 * journey key so the same coach always looks the same on the same date.
 */
export function buildBerths(
  key: string,
  coachType: CoachType,
  occupancy: number
): Berth[] {
  const total = BERTH_COUNTS[coachType];
  const rng = rngFor(`berths:${key}`);
  const berths: Berth[] = [];
  const bayCount = Math.max(1, Math.ceil(total / 8));
  for (let n = 1; n <= total; n++) {
    const { type, bay } = berthTypeFor(coachType, n);
    // Lower berths go first — they're the ones people actually want.
    const desirability = type === "LB" || type === "CB" || type === "WS" ? 1.25 : type === "SU" || type === "MB" ? 0.75 : 1;
    berths.push({
      number: n,
      type,
      bay,
      isBooked: rng.next() < Math.min(0.985, occupancy * desirability),
      nearToilet: bay === 1 || bay === bayCount,
      nearDoor: bay === 1 || bay === bayCount,
      hasCharging: coachType !== "GS" && coachType !== "2S" ? true : bay % 2 === 0,
    });
  }
  return berths;
}
