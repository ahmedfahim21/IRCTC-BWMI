import { describe, expect, it } from "vitest";
import { getWorld } from "@/lib/mock/seed";
import { getAvailability, confirmProbability, classCapacity } from "@/lib/mock/availability";
import { getLiveStatus, punctualityHistory } from "@/lib/mock/live";
import { computeFare, sumFares } from "@/lib/domain/fares";
import { quoteRefund } from "@/lib/domain/refunds";
import { coachPositions } from "@/lib/domain/platform";
import { findCrossings } from "@/lib/domain/crossings";
import { buildAlternatives } from "@/lib/domain/alternatives";
import { searchJourneys, isConfirmable } from "@/lib/domain/search";
import { journeyInstant, addDays } from "@/lib/domain/time";

const world = getWorld();
const TODAY = "2026-09-01";

describe("fares", () => {
  it("prices a sleeper long-haul below AC and charges GST only on AC", () => {
    const sl = computeFare({ classCode: "SL", quota: "GN", trainType: "superfast", distanceKm: 1447, occupancy: 0.5, includeCatering: false });
    const ac = computeFare({ classCode: "2A", quota: "GN", trainType: "superfast", distanceKm: 1447, occupancy: 0.5, includeCatering: false });
    expect(sl.gst).toBe(0);
    expect(ac.gst).toBeGreaterThan(0);
    expect(sl.total).toBeLessThan(ac.total);
    expect(sl.superfastCharge).toBe(30);
  });

  it("adds a Tatkal premium over the general quota", () => {
    const base = { classCode: "3A", trainType: "superfast", distanceKm: 800, occupancy: 0.6, includeCatering: false } as const;
    const gn = computeFare({ ...base, quota: "GN" });
    const tq = computeFare({ ...base, quota: "TQ" });
    expect(gn.dynamicSurge).toBe(0);
    expect(tq.dynamicSurge).toBeGreaterThan(0);
    expect(tq.total).toBeGreaterThan(gn.total);
  });

  it("charges the convenience fee once per ticket, not per passenger", () => {
    const one = computeFare({ classCode: "3A", quota: "GN", trainType: "express", distanceKm: 500, occupancy: 0.4, includeCatering: false });
    const three = sumFares([one, one, one]);
    expect(three.convenienceFee).toBe(one.convenienceFee);
    expect(three.baseFare).toBe(one.baseFare * 3);
    expect(three.total).toBe(one.total * 3 - one.convenienceFee * 2);
  });
});

describe("refunds", () => {
  const base = { classCode: "3A", passengerCount: 2, ticketTotal: 4000, isConfirmed: true } as const;

  it("steps down through every slab as departure closes in", () => {
    const far = quoteRefund({ ...base, hoursBeforeDeparture: 72 });
    const mid = quoteRefund({ ...base, hoursBeforeDeparture: 24 });
    const near = quoteRefund({ ...base, hoursBeforeDeparture: 6 });
    const late = quoteRefund({ ...base, hoursBeforeDeparture: 2 });

    expect(far.cancellationCharge).toBe(360); // flat 180 x 2
    expect(mid.cancellationCharge).toBe(1000); // 25%
    expect(near.cancellationCharge).toBe(2000); // 50%
    expect(late.refundAmount).toBe(0);
    expect(far.refundAmount).toBeGreaterThan(mid.refundAmount);
    expect(mid.refundAmount).toBeGreaterThan(near.refundAmount);
  });

  it("tells you what the next slab costs, so the deadline is visible", () => {
    const q = quoteRefund({ ...base, hoursBeforeDeparture: 72 });
    expect(q.nextSlabAt).toBe("48h before departure");
    expect(q.nextSlabRefund).toBeLessThan(q.refundAmount);
  });

  it("charges only clerkage on a waitlisted ticket", () => {
    const wl = quoteRefund({ ...base, isConfirmed: false, hoursBeforeDeparture: 6 });
    expect(wl.cancellationCharge).toBe(120); // 60 x 2
    expect(wl.refundAmount).toBeGreaterThan(3700);
  });

  it("never refunds more than was paid", () => {
    for (const h of [-1, 0.1, 1, 4, 12, 48, 200]) {
      const q = quoteRefund({ ...base, hoursBeforeDeparture: h });
      expect(q.refundAmount).toBeGreaterThanOrEqual(0);
      expect(q.refundAmount).toBeLessThanOrEqual(q.bookingTotal);
      expect(q.cancellationCharge).toBeLessThanOrEqual(q.bookingTotal);
    }
  });
});

describe("availability and probability", () => {
  const train = world.trains.get("12951")!;

  it("labels each state the way a ticket does", () => {
    const a = getAvailability({ train, dateIso: "2026-09-20", classCode: "3A", quota: "GN", fromCode: "BCT", toCode: "NDLS", today: TODAY });
    expect(a.label).toMatch(/^(AVL \d+|RAC \d+|GNWL \d+|REGRET)$/);
    expect(a.fare.total).toBeGreaterThan(0);
    expect(a.count).toBeGreaterThanOrEqual(0);
  });

  it("is deterministic for the same journey", () => {
    const q = { train, dateIso: "2026-09-20", classCode: "3A", quota: "GN", fromCode: "BCT", toCode: "NDLS", today: TODAY } as const;
    expect(getAvailability(q)).toEqual(getAvailability(q));
  });

  it("has more space further out than close to departure", () => {
    const soon = getAvailability({ train, dateIso: addDays(TODAY, 1), classCode: "SL", quota: "GN", fromCode: "BCT", toCode: "NDLS", today: TODAY });
    const later = getAvailability({ train, dateIso: addDays(TODAY, 55), classCode: "SL", quota: "GN", fromCode: "BCT", toCode: "NDLS", today: TODAY });
    const rank = (s: string) => (s === "available" ? 0 : s === "rac" ? 1 : 2);
    expect(rank(later.state)).toBeLessThanOrEqual(rank(soon.state));
  });

  it("reports a waitlist probability with the sample it came from, and it falls as the queue lengthens", () => {
    const shallow = confirmProbability(train, "SL", "GN", 5, 30);
    const deep = confirmProbability(train, "SL", "GN", 400, 30);
    expect(shallow.sampleSize).toBe(60);
    expect(deep.sampleSize).toBe(60);
    expect(shallow.probability).toBeGreaterThanOrEqual(deep.probability);
    expect(shallow.probability).toBeLessThanOrEqual(1);
    expect(deep.probability).toBeGreaterThanOrEqual(0);
  });

  it("gives a longer booking window better odds at the same waitlist position", () => {
    const early = confirmProbability(train, "SL", "GN", 40, 50);
    const late = confirmProbability(train, "SL", "GN", 40, 1);
    expect(early.probability).toBeGreaterThanOrEqual(late.probability);
  });

  it("counts class capacity off the actual rake", () => {
    expect(classCapacity(train, "3A")).toBe(10 * 64);
    expect(classCapacity(train, "1A")).toBe(18);
  });
});

describe("live status", () => {
  const train = world.trains.get("16511")!;
  const dateIso = "2026-09-10";

  it("walks notStarted → running → arrived across the journey", () => {
    const before = getLiveStatus(train, dateIso, world.stations, new Date(journeyInstant(dateIso, train.departureMinute - 60)));
    const during = getLiveStatus(train, dateIso, world.stations, new Date(journeyInstant(dateIso, train.departureMinute + 240)));
    const after = getLiveStatus(train, dateIso, world.stations, new Date(journeyInstant(dateIso, 3000)));

    expect(before.state).toBe("notStarted");
    expect(before.distanceCoveredKm).toBe(0);
    expect(["running", "halted"]).toContain(during.state);
    expect(during.distanceCoveredKm).toBeGreaterThan(0);
    expect(after.state).toBe("arrived");
    expect(after.distanceCoveredKm).toBe(train.distanceKm);
  });

  it("advances monotonically and stays on the map", () => {
    let previous = -1;
    for (let m = train.departureMinute; m < 2600; m += 17) {
      const s = getLiveStatus(train, dateIso, world.stations, new Date(journeyInstant(dateIso, m)));
      expect(s.distanceCoveredKm).toBeGreaterThanOrEqual(previous);
      previous = s.distanceCoveredKm;
      expect(s.position.lat).toBeGreaterThan(6);
      expect(s.position.lat).toBeLessThan(36);
      expect(s.speedKmph).toBeLessThan(180);
    }
  });

  it("returns a punctuality history that only covers days the train runs", () => {
    const history = punctualityHistory(train, TODAY);
    expect(history.length).toBeGreaterThan(20);
    for (const day of history) expect(day.delayMins).toBeGreaterThanOrEqual(0);
  });
});

describe("platform position", () => {
  it("places every coach on the platform with a plain-language hint", () => {
    const train = world.trains.get("12951")!;
    const station = world.stations.get("BCT")!;
    const positions = coachPositions(train, station, 5);
    expect(positions.length).toBe(train.rake.length);
    for (const p of positions) {
      expect(p.distanceFromEntryM).toBeGreaterThanOrEqual(0);
      expect(p.distanceFromEntryM).toBeLessThan(p.platformLengthM);
      expect(p.hint).toMatch(/Coach|Engine/);
    }
    const b3 = positions.find((p) => p.coach.code === "B3")!;
    console.log("12951 at BCT:", b3.hint);
  });
});

describe("crossings", () => {
  it("finds trains met along the way, ordered by when you meet them", () => {
    const train = world.trains.get("12951")!;
    const corridor = world.corridors.find((c) => c.id === train.corridorId)!;
    const crossings = findCrossings(train, corridor, world.trainList, "2026-09-10");
    expect(crossings.length).toBeGreaterThan(0);
    for (let i = 1; i < crossings.length; i++) {
      expect(crossings[i].atMinute).toBeGreaterThanOrEqual(crossings[i - 1].atMinute);
    }
    expect(crossings.some((c) => c.kind === "crosses")).toBe(true);
    console.log(`12951 meets ${crossings.length} trains, first:`, crossings[0]);
  });
});

describe("search and alternatives", () => {
  it("finds trains for a real route with a full availability matrix", () => {
    const journeys = searchJourneys({ fromCode: "NDLS", toCode: "HWH", dateIso: "2026-09-15", quota: "GN", today: TODAY });
    expect(journeys.length).toBeGreaterThan(2);
    for (const j of journeys) {
      expect(j.availability.length).toBe(j.train.classes.length);
      expect(j.durationMins).toBeGreaterThan(0);
      expect(j.arrivalMinute).toBeGreaterThan(j.departureMinute);
    }
    expect(journeys[0].departureMinute).toBeLessThanOrEqual(journeys[journeys.length - 1].departureMinute);
  });

  it("produces every alternative strategy for a busy route", () => {
    const groups = buildAlternatives({ fromCode: "NDLS", toCode: "MAS", dateIso: addDays(TODAY, 2), quota: "GN", classCode: "SL", today: TODAY });
    const kinds = groups.map((g) => g.kind);
    console.log("alternative groups:", groups.map((g) => `${g.kind}(${g.items.length})`).join(" "));
    expect(kinds).toContain("nearbyDates");
    expect(kinds).toContain("classOrQuotaShift");
    for (const group of groups) {
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.fareTotal).toBeGreaterThan(0);
        expect(item.availabilityLabel.length).toBeGreaterThan(0);
      }
    }
  });

  it("only ever suggests alternatives that are actually confirmable", () => {
    const ctx = { fromCode: "NDLS", toCode: "HWH", dateIso: addDays(TODAY, 3), quota: "GN", classCode: "SL", today: TODAY } as const;
    for (const group of buildAlternatives(ctx)) {
      for (const item of group.items) {
        expect(item.confirmProbability === null || item.confirmProbability >= 0.7).toBe(true);
      }
    }
  });
});

describe("glossary", () => {
  it("reads a berth allotment into plain words", async () => {
    const { explainStatus } = await import("@/lib/glossary");
    expect(explainStatus("CNF B1/10 MB")).toBe("Confirmed — coach B1, berth 10, middle berth");
    expect(explainStatus("CNF S4/23 SL")).toBe("Confirmed — coach S4, berth 23, side lower");
    expect(explainStatus("CNF A1/5")).toBe("Confirmed — coach A1, berth 5");
  });

  it("counts a waitlist in people rather than repeating the code", async () => {
    const { explainStatus } = await import("@/lib/glossary");
    expect(explainStatus("GNWL 38")).toBe("38 ahead of you");
    expect(explainStatus("RLWL 12")).toContain("12 ahead of you");
    expect(explainStatus("AVL 42")).toBe("42 seats free");
    expect(explainStatus("RAC 3")).toContain("sharing a side berth");
  });

  it("returns nothing for a code it cannot explain, so callers can skip it", async () => {
    const { explainStatus } = await import("@/lib/glossary");
    expect(explainStatus("WHATEVER")).toBe("");
  });
});
