import type { LiveStatus, PunctualityDay, Station, Train } from "@/lib/types";
import { rngFor } from "./rng";
import { minutesSinceJourneyStart } from "@/lib/domain/time";

/**
 * A journey's delay profile: a seeded random walk along the route. Delay
 * accumulates through the run and occasionally recovers where the schedule has
 * slack, which is what real running does.
 *
 * Returns delay in minutes at each stop index.
 */
export function delayProfile(train: Train, dateIso: string): number[] {
  const rng = rngFor(`live:${train.number}:${dateIso}`);
  const stops = train.schedule.length;
  // Some days just go badly. This sets the tone for the whole run.
  const dayFactor = rng.gaussian(1, 0.55);
  const target = Math.max(0, train.avgDelayMins * dayFactor);

  const profile: number[] = [];
  let delay = Math.max(0, rng.gaussian(target * 0.25, 4));
  for (let i = 0; i < stops; i++) {
    const progress = i / Math.max(1, stops - 1);
    // Drift toward the day's target, with noise, plus occasional recovery.
    const pull = (target * (0.35 + progress * 0.9) - delay) * 0.25;
    delay += pull + rng.gaussian(0, 3.5);
    if (rng.bool(0.09)) delay -= rng.int(2, 9); // padded section, time made up
    delay = Math.max(0, delay);
    profile.push(Math.round(delay));
  }
  return profile;
}

/** Scheduled minute + that stop's delay, for every stop. */
export function actualTimes(train: Train, dateIso: string) {
  const profile = delayProfile(train, dateIso);
  return train.schedule.map((stop, i) => ({
    stop,
    delayMins: profile[i],
    actualArrival: stop.arrivalMinute === null ? null : stop.arrivalMinute + profile[i],
    actualDeparture: stop.departureMinute === null ? null : stop.departureMinute + profile[i],
  }));
}

/**
 * Where the train is right now. A pure function of `now`, so the position marker
 * genuinely moves while you watch it rather than sitting on a canned value.
 */
export function getLiveStatus(
  train: Train,
  dateIso: string,
  stations: Map<string, Station>,
  now: Date
): LiveStatus {
  const timeline = actualTimes(train, dateIso);
  const elapsed = minutesSinceJourneyStart(dateIso, now);
  const stationAt = (code: string) => stations.get(code)!;

  const etaByStation: LiveStatus["etaByStation"] = {};
  for (const entry of timeline) {
    etaByStation[entry.stop.stationCode] = {
      etaMinute: entry.actualArrival ?? entry.actualDeparture ?? 0,
      delayMins: entry.delayMins,
    };
  }

  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  const base = {
    trainNumber: train.number,
    date: dateIso,
    etaByStation,
    updatedAt: now.toISOString(),
  };

  if (elapsed < first.actualDeparture!) {
    const origin = stationAt(first.stop.stationCode);
    return {
      ...base,
      state: "notStarted",
      lastStationCode: null,
      nextStopCode: first.stop.stationCode,
      delayMins: first.delayMins,
      position: { lat: origin.lat, lng: origin.lng },
      speedKmph: 0,
      distanceCoveredKm: 0,
      haltedSinceMinute: null,
    };
  }

  if (elapsed >= last.actualArrival!) {
    const destination = stationAt(last.stop.stationCode);
    return {
      ...base,
      state: "arrived",
      lastStationCode: last.stop.stationCode,
      nextStopCode: null,
      delayMins: last.delayMins,
      position: { lat: destination.lat, lng: destination.lng },
      speedKmph: 0,
      distanceCoveredKm: train.distanceKm,
      haltedSinceMinute: last.actualArrival,
    };
  }

  for (let i = 0; i < timeline.length - 1; i++) {
    const current = timeline[i];
    const next = timeline[i + 1];

    // Standing at a halt.
    if (
      current.actualArrival !== null &&
      elapsed >= current.actualArrival &&
      elapsed < current.actualDeparture!
    ) {
      const here = stationAt(current.stop.stationCode);
      return {
        ...base,
        state: "halted",
        lastStationCode: current.stop.stationCode,
        nextStopCode: next.stop.stationCode,
        delayMins: current.delayMins,
        position: { lat: here.lat, lng: here.lng },
        speedKmph: 0,
        distanceCoveredKm: current.stop.distanceKm,
        haltedSinceMinute: current.actualArrival,
      };
    }

    // Between two stops — interpolate.
    if (elapsed >= current.actualDeparture! && elapsed < next.actualArrival!) {
      const legMins = next.actualArrival! - current.actualDeparture!;
      const t = legMins <= 0 ? 0 : (elapsed - current.actualDeparture!) / legMins;
      const a = stationAt(current.stop.stationCode);
      const b = stationAt(next.stop.stationCode);
      const legKm = next.stop.distanceKm - current.stop.distanceKm;
      return {
        ...base,
        state: "running",
        lastStationCode: current.stop.stationCode,
        nextStopCode: next.stop.stationCode,
        delayMins: next.delayMins,
        position: {
          lat: a.lat + (b.lat - a.lat) * t,
          lng: a.lng + (b.lng - a.lng) * t,
        },
        speedKmph: legMins <= 0 ? 0 : Math.round((legKm / legMins) * 60),
        distanceCoveredKm: Math.round(current.stop.distanceKm + legKm * t),
        haltedSinceMinute: null,
      };
    }
  }

  // Unreachable given the checks above; if it ever fires, the timeline is broken
  // and we want to know rather than silently return a plausible-looking position.
  throw new Error(`Could not place ${train.number} on ${dateIso} at elapsed ${elapsed}`);
}

/** Arrival delay over the last 30 runs — the punctuality sparkline. */
export function punctualityHistory(train: Train, today: string, days = 30): PunctualityDay[] {
  const out: PunctualityDay[] = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    if (!train.runsOn.includes(d.getUTCDay())) continue;
    const cancelled = rngFor(`cancel:${train.number}:${date}`).bool(0.015);
    const profile = delayProfile(train, date);
    out.push({ date, delayMins: cancelled ? 0 : profile[profile.length - 1], cancelled });
  }
  return out;
}
