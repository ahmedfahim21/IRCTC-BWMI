import type { Corridor, Crossing, Train } from "@/lib/types";

/**
 * Trains you meet along the way. Two trains on one corridor are placed on a
 * shared distance axis, and wherever the gap between their timings flips sign,
 * they have passed each other.
 *
 * Opposite directions meet head-on (a crossing); same direction means one
 * overtook the other.
 */
export function findCrossings(
  train: Train,
  corridor: Corridor,
  candidates: Train[],
  dateIso: string
): Crossing[] {
  const corridorKm = new Map(corridor.stops.map((s) => [s.stationCode, s.distanceKm]));

  // My path on the corridor axis: (absolute km, minute).
  const mine = train.schedule.map((stop) => ({
    code: stop.stationCode,
    km: corridorKm.get(stop.stationCode)!,
    minute: stop.arrivalMinute ?? stop.departureMinute!,
  }));

  const dayOfWeek = new Date(`${dateIso}T00:00:00Z`).getUTCDay();
  const crossings: Crossing[] = [];

  for (const other of candidates) {
    if (other.number === train.number) continue;
    if (other.corridorId !== train.corridorId) continue;
    if (!other.runsOn.includes(dayOfWeek)) continue;

    const theirs = new Map(
      other.schedule.map((stop) => [
        stop.stationCode,
        { km: corridorKm.get(stop.stationCode)!, minute: stop.arrivalMinute ?? stop.departureMinute! },
      ])
    );

    // Stations we both traverse, walked in my order.
    const shared = mine.filter((point) => theirs.has(point.code));
    if (shared.length < 2) continue;

    let previous: { code: string; km: number; gap: number; minute: number } | null = null;
    for (const point of shared) {
      const gap = point.minute - theirs.get(point.code)!.minute;
      if (previous && Math.sign(gap) !== Math.sign(previous.gap) && previous.gap !== 0) {
        // They swapped places between `previous` and `point` — interpolate the meeting.
        const t = Math.abs(previous.gap) / (Math.abs(previous.gap) + Math.abs(gap));
        const atMinute = Math.round(previous.minute + (point.minute - previous.minute) * t);
        const nearer = t < 0.5 ? previous.code : point.code;
        crossings.push({
          stationCode: nearer,
          atMinute,
          trainNumber: other.number,
          trainName: other.name,
          kind:
            other.direction === train.direction
              ? previous.gap < 0
                ? "overtakenBy"
                : "overtakes"
              : "crosses",
        });
      }
      previous = { code: point.code, km: point.km, gap, minute: point.minute };
    }
  }

  return crossings.sort((a, b) => a.atMinute - b.atMinute);
}
