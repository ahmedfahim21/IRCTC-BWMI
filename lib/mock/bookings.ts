import type {
  Booking,
  BookingDraft,
  ChartStatus,
  ClassCode,
  Passenger,
  QuotaCode,
  Train,
} from "@/lib/types";
import { getWorld } from "./seed";
import { getAvailability } from "./availability";
import { coachLayouts, freeBerths } from "./coaches";
import { computeFare, sumFares } from "@/lib/domain/fares";
import { addDays, journeyInstant, todayIso } from "@/lib/domain/time";
import { rngFor } from "./rng";

/** How long a draft holds its inventory. Generous, and always visible to the user. */
export const HOLD_MINUTES = 10;

interface Store {
  drafts: Map<string, BookingDraft>;
  bookings: Map<string, Booking>;
  seeded: boolean;
}

/** Survives Next.js hot reloads in dev, which module-level state does not. */
const globalStore = globalThis as unknown as { __irctcStore?: Store };
function store(): Store {
  if (!globalStore.__irctcStore) {
    globalStore.__irctcStore = { drafts: new Map(), bookings: new Map(), seeded: false };
  }
  const s = globalStore.__irctcStore;
  if (!s.seeded) {
    s.seeded = true;
    seedDemoBookings(s);
  }
  return s;
}

function makePnr(seed?: string): string {
  const rng = rngFor(seed ?? `pnr:${Math.random()}`);
  return Array.from({ length: 10 }, () => rng.int(0, 9)).join("");
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Chart is prepared roughly four hours before departure. */
export function chartStatusFor(booking: Booking, now: Date): ChartStatus {
  const departure = journeyInstant(booking.journeyDate, booking.boardingMinute);
  return now.getTime() >= departure - 4 * 3600_000 ? "prepared" : "notPrepared";
}

/**
 * Allot berths from the coach map. Honours each passenger's preference where a
 * matching berth is free, and keeps a group in one coach when asked.
 */
function allotBerths(
  train: Train,
  classCode: ClassCode,
  dateIso: string,
  quota: QuotaCode,
  fromCode: string,
  toCode: string,
  today: string,
  passengers: Passenger[],
  keepTogether: boolean
): Passenger[] {
  const availability = getAvailability({ train, dateIso, classCode, quota, fromCode, toCode, today });
  const { layouts } = coachLayouts(train, classCode, dateIso, quota, fromCode, toCode, today);
  const pool = freeBerths(layouts);

  if (availability.state === "waitlist" || availability.state === "regretted") {
    return passengers.map((p, i) => ({
      ...p,
      allocatedCoach: null,
      allocatedBerth: null,
      allocatedBerthType: null,
      status: "waitlist" as const,
      statusLabel: `${availability.label.split(" ")[0]} ${availability.count + i}`,
    }));
  }

  if (availability.state === "rac") {
    return passengers.map((p, i) => ({
      ...p,
      allocatedCoach: layouts[0]?.code ?? null,
      allocatedBerth: null,
      allocatedBerthType: "SL" as const,
      status: "rac" as const,
      statusLabel: `RAC ${availability.count + i}`,
    }));
  }

  const preferredCoach = keepTogether
    ? layouts.find((c) => c.berths.filter((b) => !b.isBooked).length >= passengers.length)?.code
    : undefined;
  const taken = new Set<string>();

  return passengers.map((passenger) => {
    const candidates = pool.filter((entry) => {
      const key = `${entry.coachCode}:${entry.berth.number}`;
      if (taken.has(key)) return false;
      if (preferredCoach && entry.coachCode !== preferredCoach) return false;
      return true;
    });
    const match =
      candidates.find((entry) => entry.berth.type === passenger.berthPreference) ?? candidates[0];

    if (!match) {
      // Availability said there was room but the map disagrees — surface it
      // rather than silently downgrading someone to a waitlist.
      throw new Error(`No free berth for ${passenger.name} in ${classCode} on ${train.number}`);
    }
    taken.add(`${match.coachCode}:${match.berth.number}`);
    return {
      ...passenger,
      allocatedCoach: match.coachCode,
      allocatedBerth: match.berth.number,
      allocatedBerthType: match.berth.type,
      status: "confirmed" as const,
      statusLabel: `CNF ${match.coachCode}/${match.berth.number} ${match.berth.type}`,
    };
  });
}

export function createDraft(input: {
  trainNumber: string;
  journeyDate: string;
  fromCode: string;
  toCode: string;
  classCode: ClassCode;
  quota: QuotaCode;
  tatkalOpensAt?: string | null;
}): BookingDraft {
  const world = getWorld();
  const train = world.trains.get(input.trainNumber);
  if (!train) throw new Error(`Unknown train ${input.trainNumber}`);
  if (!train.classes.includes(input.classCode)) {
    throw new Error(`${input.trainNumber} has no ${input.classCode} class`);
  }

  const now = Date.now();
  const draft: BookingDraft = {
    draftId: makeId("dft"),
    trainNumber: input.trainNumber,
    journeyDate: input.journeyDate,
    fromCode: input.fromCode,
    toCode: input.toCode,
    classCode: input.classCode,
    quota: input.quota,
    passengers: [],
    contactPhone: null,
    contactEmail: null,
    keepTogether: true,
    addMeals: false,
    travelInsurance: true,
    autoUpgrade: true,
    createdAt: new Date(now).toISOString(),
    holdExpiresAt: new Date(now + HOLD_MINUTES * 60_000).toISOString(),
    tatkalOpensAt: input.tatkalOpensAt ?? null,
  };
  store().drafts.set(draft.draftId, draft);
  return draft;
}

export function getDraft(draftId: string): BookingDraft | null {
  return store().drafts.get(draftId) ?? null;
}

const PATCHABLE = [
  "passengers",
  "contactPhone",
  "contactEmail",
  "keepTogether",
  "addMeals",
  "travelInsurance",
  "autoUpgrade",
  "classCode",
  "quota",
  "tatkalOpensAt",
] as const;

export type DraftPatch = Partial<Pick<BookingDraft, (typeof PATCHABLE)[number]>>;

/** Patch a draft and extend its hold. Only the listed fields can move. */
export function patchDraft(draftId: string, patch: DraftPatch): BookingDraft | null {
  const draft = store().drafts.get(draftId);
  if (!draft) return null;

  // Spread only the patchable keys that were actually supplied, so a caller
  // cannot move draftId, journeyDate or the hold clock by sending extra fields.
  const allowed: DraftPatch = {};
  for (const key of PATCHABLE) {
    if (patch[key] !== undefined) {
      Object.assign(allowed, { [key]: patch[key] });
    }
  }
  const next: BookingDraft = {
    ...draft,
    ...allowed,
    holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString(),
  };
  store().drafts.set(draftId, next);
  return next;
}

export function confirmDraft(draftId: string, now = new Date()): Booking {
  const s = store();
  const draft = s.drafts.get(draftId);
  if (!draft) throw new Error(`Unknown draft ${draftId}`);
  if (Date.parse(draft.holdExpiresAt) <= now.getTime()) {
    throw new Error("The seat hold has expired. Start a new booking to re-check availability.");
  }
  if (draft.passengers.length === 0) throw new Error("Add at least one passenger before confirming");

  const world = getWorld();
  const train = world.trains.get(draft.trainNumber)!;
  const today = todayIso(now);

  const passengers = allotBerths(
    train,
    draft.classCode,
    draft.journeyDate,
    draft.quota,
    draft.fromCode,
    draft.toCode,
    today,
    draft.passengers,
    draft.keepTogether
  );

  const fromStop = train.schedule.find((s2) => s2.stationCode === draft.fromCode)!;
  const toStop = train.schedule.find((s2) => s2.stationCode === draft.toCode)!;
  const distanceKm = toStop.distanceKm - fromStop.distanceKm;
  const availability = getAvailability({
    train,
    dateIso: draft.journeyDate,
    classCode: draft.classCode,
    quota: draft.quota,
    fromCode: draft.fromCode,
    toCode: draft.toCode,
    today,
  });
  const occupancy = availability.state === "available" ? 0.6 : 0.95;

  const fareBreakdown = sumFares(
    passengers.map(() =>
      computeFare({
        classCode: draft.classCode,
        quota: draft.quota,
        trainType: train.type,
        distanceKm,
        occupancy,
        includeCatering: draft.addMeals || train.type === "rajdhani" || train.type === "shatabdi",
      })
    )
  );

  const anyWaitlisted = passengers.some((p) => p.status === "waitlist");
  const allWaitlisted = passengers.every((p) => p.status === "waitlist");

  const booking: Booking = {
    pnr: makePnr(),
    trainNumber: train.number,
    trainName: train.name,
    journeyDate: draft.journeyDate,
    fromCode: draft.fromCode,
    toCode: draft.toCode,
    classCode: draft.classCode,
    quota: draft.quota,
    passengers,
    fareBreakdown,
    status: allWaitlisted ? "waitlist" : anyWaitlisted ? "partiallyConfirmed" : "confirmed",
    chartStatus: "notPrepared",
    bookedAt: now.toISOString(),
    boardingMinute: fromStop.departureMinute!,
    alightingMinute: toStop.arrivalMinute!,
    cancelledAt: null,
    refundAmount: null,
  };

  s.bookings.set(booking.pnr, booking);
  s.drafts.delete(draftId);
  return booking;
}

export function getBooking(pnr: string): Booking | null {
  const booking = store().bookings.get(pnr);
  if (!booking) return null;
  return { ...booking, chartStatus: chartStatusFor(booking, new Date()) };
}

export function listBookings(): Booking[] {
  const now = new Date();
  return [...store().bookings.values()]
    .map((b) => ({ ...b, chartStatus: chartStatusFor(b, now) }))
    .sort((a, b) => a.journeyDate.localeCompare(b.journeyDate) || a.boardingMinute - b.boardingMinute);
}

export function cancelBooking(pnr: string, refundAmount: number, now = new Date()): Booking | null {
  const s = store();
  const booking = s.bookings.get(pnr);
  if (!booking) return null;
  if (booking.status === "cancelled") return booking;
  const cancelled: Booking = {
    ...booking,
    status: "cancelled",
    cancelledAt: now.toISOString(),
    refundAmount,
    passengers: booking.passengers.map((p) => ({ ...p, status: "cancelled" as const, statusLabel: "CANCELLED" })),
  };
  s.bookings.set(pnr, cancelled);
  return cancelled;
}

/**
 * Three bookings so the app has a life before you've done anything: one running
 * today (so the live trip screen has something to track), one waitlisted a few
 * days out, and one already completed.
 */
function seedDemoBookings(s: Store): void {
  const world = getWorld();
  const today = todayIso();

  const specs: Array<{
    trainNumber: string;
    dateIso: string;
    fromCode: string;
    toCode: string;
    classCode: ClassCode;
    names: Array<[string, number, Passenger["gender"]]>;
    force?: "waitlist";
    pnrSeed: string;
  }> = [
    {
      trainNumber: "16511",
      dateIso: today,
      fromCode: "SBC",
      toCode: "CLT",
      classCode: "3A",
      names: [["Ahmed Fahim", 29, "male"]],
      pnrSeed: "demo-live",
    },
    {
      trainNumber: "12951",
      dateIso: addDays(today, 6),
      fromCode: "BCT",
      toCode: "NDLS",
      classCode: "2A",
      names: [
        ["Ahmed Fahim", 29, "male"],
        ["Rhea Nair", 31, "female"],
      ],
      force: "waitlist",
      pnrSeed: "demo-wl",
    },
    {
      trainNumber: "12302",
      dateIso: addDays(today, -12),
      fromCode: "NDLS",
      toCode: "HWH",
      classCode: "3A",
      names: [["Ahmed Fahim", 29, "male"]],
      pnrSeed: "demo-past",
    },
  ];

  for (const spec of specs) {
    const train = world.trains.get(spec.trainNumber);
    if (!train) continue;
    const fromStop = train.schedule.find((x) => x.stationCode === spec.fromCode);
    const toStop = train.schedule.find((x) => x.stationCode === spec.toCode);
    if (!fromStop || !toStop) continue;

    const distanceKm = toStop.distanceKm - fromStop.distanceKm;
    const { layouts } = coachLayouts(train, spec.classCode, spec.dateIso, "GN", spec.fromCode, spec.toCode, today);
    const pool = freeBerths(layouts);

    const passengers: Passenger[] = spec.names.map(([name, age, gender], i) => {
      if (spec.force === "waitlist") {
        return {
          id: `pax_${spec.pnrSeed}_${i}`,
          name,
          age,
          gender,
          berthPreference: null,
          allocatedCoach: null,
          allocatedBerth: null,
          allocatedBerthType: null,
          status: "waitlist",
          statusLabel: `GNWL ${7 + i}`,
        };
      }
      const slot = pool[i * 9 + 3];
      return {
        id: `pax_${spec.pnrSeed}_${i}`,
        name,
        age,
        gender,
        berthPreference: slot?.berth.type ?? null,
        allocatedCoach: slot?.coachCode ?? null,
        allocatedBerth: slot?.berth.number ?? null,
        allocatedBerthType: slot?.berth.type ?? null,
        status: "confirmed",
        statusLabel: slot ? `CNF ${slot.coachCode}/${slot.berth.number} ${slot.berth.type}` : "CNF",
      };
    });

    const fareBreakdown = sumFares(
      passengers.map(() =>
        computeFare({
          classCode: spec.classCode,
          quota: "GN",
          trainType: train.type,
          distanceKm,
          occupancy: 0.7,
          includeCatering: false,
        })
      )
    );

    const booking: Booking = {
      pnr: makePnr(spec.pnrSeed),
      trainNumber: train.number,
      trainName: train.name,
      journeyDate: spec.dateIso,
      fromCode: spec.fromCode,
      toCode: spec.toCode,
      classCode: spec.classCode,
      quota: "GN",
      passengers,
      fareBreakdown,
      status: spec.force === "waitlist" ? "waitlist" : "confirmed",
      chartStatus: "notPrepared",
      bookedAt: new Date(Date.now() - 5 * 86400_000).toISOString(),
      boardingMinute: fromStop.departureMinute!,
      alightingMinute: toStop.arrivalMinute!,
      cancelledAt: null,
      refundAmount: null,
    };
    s.bookings.set(booking.pnr, booking);
  }
}
