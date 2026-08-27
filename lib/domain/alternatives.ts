import type { Availability, ClassCode, QuotaCode, Station, Train } from "@/lib/types";
import { getWorld } from "@/lib/mock/seed";
import { getAvailability, getAvailabilityMatrix, runsOnDate } from "@/lib/mock/availability";
import { addDays } from "./time";
import {
  bestAvailability,
  buildJourney,
  haversineKm,
  isConfirmable,
  searchJourneys,
  trainsServing,
  type JourneyOption,
} from "./search";

export type AlternativeKind =
  | "nearbyDates"
  | "nearbyStations"
  | "splitTicketing"
  | "connections"
  | "classOrQuotaShift";

export interface AlternativeGroup {
  kind: AlternativeKind;
  title: string;
  /** Why this group is being suggested, in the user's terms. */
  rationale: string;
  items: AlternativeItem[];
}

export interface AlternativeItem {
  id: string;
  headline: string;
  detail: string;
  trainNumbers: string[];
  dateIso: string;
  fromCode: string;
  toCode: string;
  classCode: ClassCode;
  quota: QuotaCode;
  availabilityLabel: string;
  confirmProbability: number | null;
  fareTotal: number;
  /** Set when the suggestion costs the traveller something — extra time, a change of berth. */
  tradeoff: string | null;
}

interface Context {
  fromCode: string;
  toCode: string;
  dateIso: string;
  quota: QuotaCode;
  classCode: ClassCode;
  today: string;
}

const label = (a: Availability) => a.label;

/** 1 — the same train, a few days either side. */
export function nearbyDates(ctx: Context): AlternativeGroup {
  const items: AlternativeItem[] = [];
  for (const offset of [-3, -2, -1, 1, 2, 3]) {
    const dateIso = addDays(ctx.dateIso, offset);
    if (dateIso < ctx.today) continue;
    for (const { train, fromStop, toStop } of trainsServing(ctx.fromCode, ctx.toCode)) {
      if (!train.classes.includes(ctx.classCode)) continue;
      if (!runsOnDate(train, dateIso)) continue;
      const a = getAvailability({
        train,
        dateIso,
        classCode: ctx.classCode,
        quota: ctx.quota,
        fromCode: ctx.fromCode,
        toCode: ctx.toCode,
        today: ctx.today,
      });
      if (!isConfirmable(a)) continue;
      items.push({
        id: `date:${train.number}:${dateIso}`,
        headline: `${train.number} ${train.name}`,
        detail: dateIso,
        trainNumbers: [train.number],
        dateIso,
        fromCode: ctx.fromCode,
        toCode: ctx.toCode,
        classCode: ctx.classCode,
        quota: ctx.quota,
        availabilityLabel: label(a),
        confirmProbability: a.confirmProbability,
        fareTotal: a.fare.total,
        tradeoff: `${Math.abs(offset)} day${Math.abs(offset) > 1 ? "s" : ""} ${offset < 0 ? "earlier" : "later"}`,
      });
    }
  }
  return {
    kind: "nearbyDates",
    title: "Shift your date",
    rationale: "The same trains, within three days either side of what you asked for.",
    items: items.sort((a, b) => (b.confirmProbability ?? 1) - (a.confirmProbability ?? 1)).slice(0, 6),
  };
}

/** 2 — board or alight somewhere close by. */
export function nearbyStations(ctx: Context): AlternativeGroup {
  const world = getWorld();
  const origin = world.stations.get(ctx.fromCode);
  const destination = world.stations.get(ctx.toCode);
  const items: AlternativeItem[] = [];
  if (!origin || !destination) return { kind: "nearbyStations", title: "Nearby stations", rationale: "", items };

  const near = (anchor: Station) =>
    world.stationList
      .filter((s) => s.code !== anchor.code && haversineKm(anchor, s) <= 60)
      .sort((a, b) => haversineKm(anchor, a) - haversineKm(anchor, b))
      .slice(0, 8);

  const pairs: Array<{ from: string; to: string; note: string }> = [
    ...near(origin).map((s) => ({ from: s.code, to: ctx.toCode, note: `Board at ${s.name} — ${Math.round(haversineKm(origin, s))} km from ${origin.name}` })),
    ...near(destination).map((s) => ({ from: ctx.fromCode, to: s.code, note: `Get off at ${s.name} — ${Math.round(haversineKm(destination, s))} km from ${destination.name}` })),
  ];

  for (const pair of pairs) {
    for (const { train, fromStop, toStop } of trainsServing(pair.from, pair.to)) {
      if (!train.classes.includes(ctx.classCode)) continue;
      if (!runsOnDate(train, ctx.dateIso)) continue;
      const a = getAvailability({
        train,
        dateIso: ctx.dateIso,
        classCode: ctx.classCode,
        quota: ctx.quota,
        fromCode: pair.from,
        toCode: pair.to,
        today: ctx.today,
      });
      if (!isConfirmable(a)) continue;
      items.push({
        id: `station:${train.number}:${pair.from}:${pair.to}`,
        headline: `${train.number} ${train.name}`,
        detail: `${pair.from} → ${pair.to}`,
        trainNumbers: [train.number],
        dateIso: ctx.dateIso,
        fromCode: pair.from,
        toCode: pair.to,
        classCode: ctx.classCode,
        quota: ctx.quota,
        availabilityLabel: label(a),
        confirmProbability: a.confirmProbability,
        fareTotal: a.fare.total,
        tradeoff: pair.note,
      });
      if (items.length >= 24) break;
    }
  }
  return {
    kind: "nearbyStations",
    title: "Start or finish somewhere else",
    rationale: "Stations within 60 km that have space on the same day.",
    items: items.sort((a, b) => (b.confirmProbability ?? 1) - (a.confirmProbability ?? 1)).slice(0, 6),
  };
}

/**
 * 3 — two tickets on one train. Common trick when a long segment is full but
 * the two halves aren't. Flags the berth change honestly, because it's real.
 */
export function splitTicketing(ctx: Context): AlternativeGroup {
  const items: AlternativeItem[] = [];
  for (const { train, fromStop, toStop } of trainsServing(ctx.fromCode, ctx.toCode)) {
    if (!train.classes.includes(ctx.classCode)) continue;
    if (!runsOnDate(train, ctx.dateIso)) continue;

    const between = train.schedule.filter(
      (s) => s.isHalt && s.distanceKm > fromStop.distanceKm && s.distanceKm < toStop.distanceKm
    );
    for (const mid of between) {
      const legs = [
        { from: ctx.fromCode, to: mid.stationCode },
        { from: mid.stationCode, to: ctx.toCode },
      ].map((leg) =>
        getAvailability({
          train,
          dateIso: ctx.dateIso,
          classCode: ctx.classCode,
          quota: ctx.quota,
          fromCode: leg.from,
          toCode: leg.to,
          today: ctx.today,
        })
      );
      if (!legs.every(isConfirmable)) continue;

      const world = getWorld();
      const midName = world.stations.get(mid.stationCode)?.name ?? mid.stationCode;
      items.push({
        id: `split:${train.number}:${mid.stationCode}`,
        headline: `${train.number} ${train.name}`,
        detail: `Two tickets, split at ${midName}`,
        trainNumbers: [train.number],
        dateIso: ctx.dateIso,
        fromCode: ctx.fromCode,
        toCode: ctx.toCode,
        classCode: ctx.classCode,
        quota: ctx.quota,
        availabilityLabel: `${legs[0].label} + ${legs[1].label}`,
        confirmProbability: Math.min(legs[0].confirmProbability ?? 1, legs[1].confirmProbability ?? 1),
        fareTotal: legs[0].fare.total + legs[1].fare.total,
        tradeoff: `You may have to change berth at ${midName}`,
      });
      break; // one split per train is enough
    }
  }
  return {
    kind: "splitTicketing",
    title: "Split the journey into two tickets",
    rationale: "Same train, same seat number where possible — booked as two segments instead of one.",
    items: items.slice(0, 4),
  };
}

/** 4 — change trains once, with a layover you can actually make. */
export function connections(ctx: Context, minLayoverMins = 90): AlternativeGroup {
  const world = getWorld();
  const items: AlternativeItem[] = [];

  const firstLegs = world.trainList.flatMap((train) => {
    const i = train.schedule.findIndex((s) => s.stationCode === ctx.fromCode && s.isHalt);
    if (i < 0 || !runsOnDate(train, ctx.dateIso)) return [];
    return train.schedule
      .slice(i + 1)
      .filter((s) => s.isHalt && (world.stations.get(s.stationCode)?.platformCount ?? 0) >= 5)
      .map((s) => ({ train, fromStop: train.schedule[i], hubStop: s }));
  });

  for (const leg of firstLegs) {
    const hub = leg.hubStop.stationCode;
    if (hub === ctx.toCode) continue;
    for (const { train: second, fromStop, toStop } of trainsServing(hub, ctx.toCode)) {
      if (second.number === leg.train.number) continue;
      const layover = fromStop.departureMinute! - leg.hubStop.arrivalMinute!;
      if (layover < minLayoverMins || layover > 10 * 60) continue;

      const classFor = (t: Train) => (t.classes.includes(ctx.classCode) ? ctx.classCode : t.classes[t.classes.length - 1]);
      const a1 = getAvailability({ train: leg.train, dateIso: ctx.dateIso, classCode: classFor(leg.train), quota: ctx.quota, fromCode: ctx.fromCode, toCode: hub, today: ctx.today });
      const a2 = getAvailability({ train: second, dateIso: ctx.dateIso, classCode: classFor(second), quota: ctx.quota, fromCode: hub, toCode: ctx.toCode, today: ctx.today });
      if (!isConfirmable(a1) || !isConfirmable(a2)) continue;

      const hubName = world.stations.get(hub)?.name ?? hub;
      const totalMins = toStop.arrivalMinute! - leg.fromStop.departureMinute!;
      items.push({
        id: `connect:${leg.train.number}:${second.number}:${hub}`,
        headline: `${leg.train.number} → ${second.number}`,
        detail: `Change at ${hubName}`,
        trainNumbers: [leg.train.number, second.number],
        dateIso: ctx.dateIso,
        fromCode: ctx.fromCode,
        toCode: ctx.toCode,
        classCode: ctx.classCode,
        quota: ctx.quota,
        availabilityLabel: `${a1.label} + ${a2.label}`,
        confirmProbability: Math.min(a1.confirmProbability ?? 1, a2.confirmProbability ?? 1),
        fareTotal: a1.fare.total + a2.fare.total,
        tradeoff: `${Math.floor(totalMins / 60)}h total · ${Math.floor(layover / 60)}h ${layover % 60}m to change`,
      });
      if (items.length >= 30) break;
    }
  }

  const seen = new Set<string>();
  const unique = items.filter((i) => (seen.has(i.detail) ? false : seen.add(i.detail)));
  return {
    kind: "connections",
    title: "Change trains once",
    rationale: "Two-leg journeys with enough time between them to make the connection.",
    items: unique.slice(0, 5),
  };
}

/** 5 — a different class or quota on the train you already wanted. */
export function classOrQuotaShift(ctx: Context): AlternativeGroup {
  const items: AlternativeItem[] = [];
  const quotas: QuotaCode[] = ["GN", "TQ", "PT", "LD", "SS"];

  for (const { train, fromStop, toStop } of trainsServing(ctx.fromCode, ctx.toCode)) {
    if (!runsOnDate(train, ctx.dateIso)) continue;
    for (const classCode of train.classes) {
      for (const quota of quotas) {
        if (classCode === ctx.classCode && quota === ctx.quota) continue;
        const a = getAvailability({ train, dateIso: ctx.dateIso, classCode, quota, fromCode: ctx.fromCode, toCode: ctx.toCode, today: ctx.today });
        if (!isConfirmable(a)) continue;
        items.push({
          id: `shift:${train.number}:${classCode}:${quota}`,
          headline: `${train.number} ${train.name}`,
          detail: `${classCode} · ${quota} quota`,
          trainNumbers: [train.number],
          dateIso: ctx.dateIso,
          fromCode: ctx.fromCode,
          toCode: ctx.toCode,
          classCode,
          quota,
          availabilityLabel: a.label,
          confirmProbability: a.confirmProbability,
          fareTotal: a.fare.total,
          tradeoff:
            classCode !== ctx.classCode && quota !== ctx.quota
              ? `Different class and quota`
              : classCode !== ctx.classCode
                ? `${classCode} instead of ${ctx.classCode}`
                : `${quota} quota`,
        });
      }
    }
  }
  return {
    kind: "classOrQuotaShift",
    title: "Another class or quota",
    rationale: "Space on the same train, in a compartment or quota you didn't ask for.",
    items: items.sort((a, b) => a.fareTotal - b.fareTotal).slice(0, 6),
  };
}

/** Everything, in the order worth showing when the asked-for journey is full. */
export function buildAlternatives(ctx: Context): AlternativeGroup[] {
  return [
    classOrQuotaShift(ctx),
    nearbyDates(ctx),
    splitTicketing(ctx),
    nearbyStations(ctx),
    connections(ctx),
  ].filter((group) => group.items.length > 0);
}

export type { Context as AlternativeContext };
