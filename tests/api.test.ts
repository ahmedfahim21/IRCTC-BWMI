import { describe, expect, it, beforeAll } from "vitest";
import { NextRequest } from "next/server";

import { GET as getStations } from "@/app/api/stations/route";
import { GET as getSearch } from "@/app/api/search/route";
import { GET as getRouteAvailability } from "@/app/api/route-availability/route";
import { GET as getTrain } from "@/app/api/trains/[number]/route";
import { GET as getLive } from "@/app/api/trains/[number]/live/route";
import { GET as getDateStrip } from "@/app/api/trains/[number]/availability/route";
import { GET as getCoaches } from "@/app/api/trains/[number]/coaches/[classCode]/route";
import { POST as postDraft } from "@/app/api/bookings/draft/route";
import { GET as getDraftRoute, PATCH as patchDraftRoute } from "@/app/api/bookings/draft/[draftId]/route";
import { POST as confirmRoute } from "@/app/api/bookings/draft/[draftId]/confirm/route";
import { GET as getBookings } from "@/app/api/bookings/route";
import { GET as getPnr } from "@/app/api/pnr/[pnr]/route";
import { GET as getStatus } from "@/app/api/status/route";
import { GET as getRefundQuote } from "@/app/api/bookings/[pnr]/refund-quote/route";
import { POST as postCancel } from "@/app/api/bookings/[pnr]/cancel/route";
import { todayIso, addDays } from "@/lib/domain/time";

const BASE = "http://localhost:3210";
const req = (path: string) => new NextRequest(`${BASE}${path}`);
const post = (path: string, body: unknown) =>
  new NextRequest(`${BASE}${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const patch = (path: string, body: unknown) =>
  new NextRequest(`${BASE}${path}`, { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const params = <T>(value: T) => ({ params: Promise.resolve(value) });

const TODAY = todayIso();
const SOON = addDays(TODAY, 12);

describe("GET /api/stations", () => {
  it("returns the biggest stations with no query", async () => {
    const body = await (await getStations(req("/api/stations"))).json();
    expect(body.results.length).toBeGreaterThan(5);
    for (const r of body.results) {
      expect(r).toMatchObject({
        kind: expect.stringMatching(/station|city/),
        token: expect.any(String),
        code: expect.any(String),
        name: expect.any(String),
        city: expect.any(String),
        stateCode: expect.any(String),
        platformCount: expect.any(Number),
      });
      expect(Array.isArray(r.memberCodes)).toBe(true);
    }
  });

  it("offers a city group before individual stations", async () => {
    const body = await (await getStations(req("/api/stations?q=delhi"))).json();
    expect(body.results[0].kind).toBe("city");
    expect(body.results[0].token).toBe("city:Delhi");
    expect(body.results[0].memberCodes).toEqual(expect.arrayContaining(["NDLS", "NZM", "DEC"]));
    expect(body.results.some((r: { code: string }) => r.code === "NDLS")).toBe(true);
  });

  it("matches on code, name and city", async () => {
    const byCode = await (await getStations(req("/api/stations?q=CLT"))).json();
    expect(byCode.results[0].code).toBe("CLT");
    const byName = await (await getStations(req("/api/stations?q=howrah"))).json();
    expect(byName.results.some((r: { code: string }) => r.code === "HWH")).toBe(true);
  });

  it("honours the limit", async () => {
    const body = await (await getStations(req("/api/stations?q=a&limit=3"))).json();
    expect(body.results.length).toBe(3);
  });
});

describe("GET /api/search", () => {
  it("rejects a request missing required params", async () => {
    const res = await getSearch(req("/api/search?from=NDLS"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/);
  });

  it("rejects an unknown station", async () => {
    const res = await getSearch(req(`/api/search?from=ZZZZ&to=HWH&date=${SOON}`));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unknown origin/);
  });

  it("returns every class of every train in one response", async () => {
    const body = await (await getSearch(req(`/api/search?from=NDLS&to=HWH&date=${SOON}`))).json();
    expect(body.journeys.length).toBeGreaterThan(2);

    for (const j of body.journeys) {
      expect(j.fromCode).toBe("NDLS");
      expect(j.toCode).toBe("HWH");
      expect(j.arrivalMinute).toBeGreaterThan(j.departureMinute);
      expect(j.durationMins).toBe(j.arrivalMinute - j.departureMinute);
      expect(j.distanceKm).toBeGreaterThan(0);
      expect(j.daySpan).toBeGreaterThanOrEqual(1);
      expect(j.boardAtFraction).toBeGreaterThanOrEqual(0);
      expect(j.alightAtFraction).toBeLessThanOrEqual(1);
      expect(typeof j.runsToday).toBe("boolean");

      // The whole point: one row carries every class, already resolved.
      expect(j.availability.length).toBe(j.train.classes.length);
      for (const a of j.availability) {
        expect(a.trainNumber).toBe(j.train.number);
        expect(a.date).toBe(SOON);
        expect(a.label.length).toBeGreaterThan(0);
        expect(a.fare.total).toBeGreaterThan(0);
        expect(a.fare.total).toBe(
          a.fare.baseFare + a.fare.reservationCharge + a.fare.superfastCharge +
          a.fare.dynamicSurge + a.fare.cateringCharge + a.fare.gst + a.fare.convenienceFee
        );
        if (a.state === "waitlist") {
          expect(a.confirmProbability).toBeGreaterThanOrEqual(0);
          expect(a.sampleSize).toBe(60);
        }
      }
    }
  });

  it("resolves a city group to any of its stations", async () => {
    const body = await (await getSearch(req(`/api/search?from=city:Delhi&to=city:Mumbai&date=${SOON}`))).json();
    expect(body.query.fromCodes.length).toBeGreaterThan(1);
    expect(body.journeys.length).toBeGreaterThan(0);
    for (const j of body.journeys) {
      expect(body.query.fromCodes).toContain(j.fromCode);
      expect(body.query.toCodes).toContain(j.toCode);
    }
  });

  it("includes a station sidecar covering every code it referenced", async () => {
    const body = await (await getSearch(req(`/api/search?from=NDLS&to=HWH&date=${SOON}`))).json();
    for (const j of body.journeys) {
      expect(body.stations[j.fromCode]).toBeDefined();
      expect(body.stations[j.toCode]).toBeDefined();
      expect(body.stations[j.fromCode].name).toEqual(expect.any(String));
    }
  });

  it("only spends effort on alternatives when nothing is confirmable", async () => {
    const body = await (await getSearch(req(`/api/search?from=NDLS&to=HWH&date=${SOON}`))).json();
    if (body.anyConfirmable) {
      expect(body.alternatives).toEqual([]);
    } else {
      expect(body.alternatives.length).toBeGreaterThan(0);
      for (const group of body.alternatives) {
        expect(group.items.length).toBeGreaterThan(0);
        expect(group.rationale.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("GET /api/route-availability", () => {
  it("rejects a request missing stations", async () => {
    const res = await getRouteAvailability(req(`/api/route-availability?from=NDLS&date=${TODAY}`));
    expect(res.status).toBe(400);
  });

  it("returns a day-by-day strip for a generated-world pair", async () => {
    const res = await getRouteAvailability(req(`/api/route-availability?from=NDLS&to=BCT&date=${TODAY}&span=7`));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.days.length).toBe(7);
    for (const day of body.days) {
      expect(day.date >= TODAY).toBe(true);
      expect(day.trainCount).toBeGreaterThan(0);
      expect(day.label.length).toBeGreaterThan(0);
    }
  });

  it("accepts a live Mumbai Central code that the generated world spells BCT", async () => {
    const res = await getRouteAvailability(req(`/api/route-availability?from=NDLS&to=MMCT&date=${TODAY}&span=5`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.days.length).toBeGreaterThan(3);
    expect(body.days.some((d: { trainCount: number }) => d.trainCount > 0)).toBe(true);
  });
});

describe("GET /api/trains/[number]", () => {
  it("404s on an unknown train", async () => {
    const res = await getTrain(req("/api/trains/99999"), params({ number: "99999" }));
    expect(res.status).toBe(404);
  });

  it("returns the full stop-level schedule, rake, crossings and punctuality", async () => {
    const res = await getTrain(req("/api/trains/16511"), params({ number: "16511" }));
    const body = await res.json();

    expect(body.train.number).toBe("16511");
    expect(body.train.distanceKm).toBe(587);
    expect(body.train.haltCount).toBeLessThan(body.train.schedule.length);
    expect(body.train.schedule.length).toBeGreaterThan(70);
    expect(body.train.avgSpeedKmph).toBeGreaterThan(0);
    expect(body.train.maxSpeedKmph).toBeGreaterThanOrEqual(body.train.avgSpeedKmph);

    // Every stop resolves in the sidecar — that's what makes the timeline renderable.
    for (const stop of body.train.schedule) {
      expect(body.stations[stop.stationCode]).toBeDefined();
      expect(typeof stop.isHalt).toBe("boolean");
      expect(stop.distanceKm).toEqual(expect.any(Number));
      if (stop.isHalt && stop.arrivalMinute !== null) expect(stop.platform).toBeGreaterThan(0);
      if (!stop.isHalt) expect(stop.platform).toBeNull();
    }

    expect(body.train.rake[0].type).toBe("ENG");
    expect(body.crossings.length).toBeGreaterThan(0);
    for (const c of body.crossings) {
      expect(["crosses", "overtakes", "overtakenBy"]).toContain(c.kind);
      expect(c.trainNumber).not.toBe("16511");
    }
    expect(body.punctuality.length).toBeGreaterThan(20);
  });
});

describe("GET /api/trains/[number]/live", () => {
  it("places the train and reports delay at every station", async () => {
    const res = await getLive(req(`/api/trains/16511/live?date=${TODAY}`), params({ number: "16511" }));
    const body = await res.json();

    expect(["notStarted", "running", "halted", "arrived"]).toContain(body.live.state);
    expect(body.live.position.lat).toBeGreaterThan(6);
    expect(body.live.position.lng).toBeGreaterThan(68);
    expect(body.live.distanceCoveredKm).toBeGreaterThanOrEqual(0);
    expect(body.live.speedKmph).toBeGreaterThanOrEqual(0);
    expect(body.live.updatedAt).toEqual(expect.any(String));
    expect(body.timeline.length).toBeGreaterThan(70);
    for (const entry of body.timeline) {
      expect(entry.delayMins).toBeGreaterThanOrEqual(0);
      expect(body.live.etaByStation[entry.stationCode]).toBeDefined();
    }
  });

  it("moves the train forward as time passes", async () => {
    const early = await (await getLive(req(`/api/trains/12951/live?date=${TODAY}`), params({ number: "12951" }))).json();
    await new Promise((r) => setTimeout(r, 5));
    const later = await (await getLive(req(`/api/trains/12951/live?date=${TODAY}`), params({ number: "12951" }))).json();
    expect(later.live.distanceCoveredKm).toBeGreaterThanOrEqual(early.live.distanceCoveredKm);
    expect(Date.parse(later.live.updatedAt)).toBeGreaterThan(Date.parse(early.live.updatedAt));
  });
});

describe("GET /api/trains/[number]/availability", () => {
  it("returns a date strip that never includes a past date", async () => {
    const res = await getDateStrip(
      req(`/api/trains/12951/availability?from=BCT&to=NDLS&date=${TODAY}&class=3A&span=7`),
      params({ number: "12951" })
    );
    const body = await res.json();
    expect(body.classCode).toBe("3A");
    expect(body.quota).toBe("GN");
    expect(body.days.length).toBeGreaterThan(3);
    for (const day of body.days) {
      expect(day.date >= TODAY).toBe(true);
      expect(day.classCode).toBe("3A");
      expect(day.label.length).toBeGreaterThan(0);
    }
    const dates = body.days.map((d: { date: string }) => d.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("requires the segment", async () => {
    const res = await getDateStrip(req("/api/trains/12951/availability"), params({ number: "12951" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/trains/[number]/coaches/[classCode]", () => {
  it("returns a berth map consistent with the availability chip", async () => {
    const res = await getCoaches(
      req(`/api/trains/12951/coaches/3A?from=BCT&to=NDLS&date=${SOON}`),
      params({ number: "12951", classCode: "3A" })
    );
    const body = await res.json();

    expect(body.coaches.length).toBe(10);
    const freeBerths = body.coaches.flatMap((c: { berths: { isBooked: boolean }[] }) => c.berths.filter((b) => !b.isBooked));
    if (body.availability.state === "available") {
      expect(freeBerths.length).toBeGreaterThan(0);
    }
    for (const coach of body.coaches) {
      expect(coach.berths.length).toBe(64);
      for (const berth of coach.berths) {
        expect(["LB", "MB", "UB", "SL", "SU"]).toContain(berth.type);
        expect(berth.bay).toBeGreaterThan(0);
        expect(typeof berth.hasCharging).toBe("boolean");
      }
    }
    expect(body.positions.length).toBeGreaterThan(0);
    for (const p of body.positions) {
      expect(p.hint).toMatch(/Coach|Engine/);
      expect(p.distanceFromEntryM).toBeLessThan(p.platformLengthM);
    }
  });

  it("rejects a class the train does not have", async () => {
    const res = await getCoaches(
      req(`/api/trains/12951/coaches/2S?from=BCT&to=NDLS&date=${SOON}`),
      params({ number: "12951", classCode: "2S" })
    );
    expect(res.status).toBe(400);
  });
});

describe("booking lifecycle", () => {
  let draftId = "";
  let pnr = "";

  it("creates a draft with a hold in the future", async () => {
    const res = await postDraft(
      post("/api/bookings/draft", {
        trainNumber: "12951",
        journeyDate: SOON,
        fromCode: "BCT",
        toCode: "NDLS",
        classCode: "3A",
        quota: "GN",
      })
    );
    expect(res.status).toBe(201);
    const { draft } = await res.json();
    draftId = draft.draftId;

    expect(draft).toMatchObject({
      trainNumber: "12951",
      journeyDate: SOON,
      fromCode: "BCT",
      toCode: "NDLS",
      classCode: "3A",
      quota: "GN",
      passengers: [],
      keepTogether: true,
      tatkalOpensAt: null,
    });
    expect(Date.parse(draft.holdExpiresAt)).toBeGreaterThan(Date.now());
  });

  it("rejects a draft missing required fields", async () => {
    const res = await postDraft(post("/api/bookings/draft", { trainNumber: "12951" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Missing/);
  });

  it("reads the draft back with its train and stations", async () => {
    const body = await (await getDraftRoute(req(`/api/bookings/draft/${draftId}`), params({ draftId }))).json();
    expect(body.draft.draftId).toBe(draftId);
    expect(body.train.number).toBe("12951");
    expect(body.stations.BCT.name).toBe("Mumbai Central");
    expect(body.stations.NDLS.name).toBe("New Delhi");
  });

  it("patches only the fields it was given and leaves everything else alone", async () => {
    const before = (await (await getDraftRoute(req(`/api/bookings/draft/${draftId}`), params({ draftId }))).json()).draft;

    const passengers = [
      { id: "p1", name: "Ahmed Fahim", age: 29, gender: "male", berthPreference: "LB", allocatedCoach: null, allocatedBerth: null, allocatedBerthType: null, status: "confirmed", statusLabel: "" },
      { id: "p2", name: "Rhea Nair", age: 31, gender: "female", berthPreference: "UB", allocatedCoach: null, allocatedBerth: null, allocatedBerthType: null, status: "confirmed", statusLabel: "" },
    ];
    const res = await patchDraftRoute(
      patch(`/api/bookings/draft/${draftId}`, { passengers, addMeals: true, contactPhone: "9876543210" }),
      params({ draftId })
    );
    const after = (await res.json()).draft;

    // What we asked to change, changed.
    expect(after.passengers).toHaveLength(2);
    expect(after.passengers[0].name).toBe("Ahmed Fahim");
    expect(after.addMeals).toBe(true);
    expect(after.contactPhone).toBe("9876543210");

    // Everything else is byte-identical, apart from the hold being extended.
    const ignore = new Set(["passengers", "addMeals", "contactPhone", "holdExpiresAt"]);
    for (const key of Object.keys(before)) {
      if (ignore.has(key)) continue;
      expect(after[key], `${key} must not change`).toEqual(before[key]);
    }
    expect(Date.parse(after.holdExpiresAt)).toBeGreaterThanOrEqual(Date.parse(before.holdExpiresAt));
  });

  it("ignores fields that are not patchable", async () => {
    const before = (await (await getDraftRoute(req(`/api/bookings/draft/${draftId}`), params({ draftId }))).json()).draft;
    const after = (
      await (
        await patchDraftRoute(
          patch(`/api/bookings/draft/${draftId}`, { draftId: "hacked", journeyDate: "1999-01-01", fromCode: "ZZZZ" }),
          params({ draftId })
        )
      ).json()
    ).draft;

    expect(after.draftId).toBe(before.draftId);
    expect(after.journeyDate).toBe(before.journeyDate);
    expect(after.fromCode).toBe(before.fromCode);
  });

  it("404s for an unknown draft", async () => {
    const res = await getDraftRoute(req("/api/bookings/draft/nope"), params({ draftId: "nope" }));
    expect(res.status).toBe(404);
  });

  it("confirms the draft into a PNR with a berth for each passenger", async () => {
    const res = await confirmRoute(post(`/api/bookings/draft/${draftId}/confirm`, {}), params({ draftId }));
    expect(res.status).toBe(201);
    const { booking } = await res.json();
    pnr = booking.pnr;

    expect(booking.pnr).toMatch(/^\d{10}$/);
    expect(booking.trainNumber).toBe("12951");
    expect(booking.trainName).toBe("Mumbai Central – New Delhi Rajdhani");
    expect(booking.journeyDate).toBe(SOON);
    expect(booking.classCode).toBe("3A");
    expect(booking.passengers).toHaveLength(2);
    expect(booking.fareBreakdown.total).toBeGreaterThan(0);
    expect(booking.cancelledAt).toBeNull();
    expect(booking.refundAmount).toBeNull();
    expect(booking.chartStatus).toBe("notPrepared");
    expect(booking.alightingMinute).toBeGreaterThan(booking.boardingMinute);

    for (const p of booking.passengers) {
      expect(["confirmed", "rac", "waitlist"]).toContain(p.status);
      expect(p.statusLabel.length).toBeGreaterThan(0);
      if (p.status === "confirmed") {
        expect(p.allocatedCoach).toMatch(/^B\d+$/);
        expect(p.allocatedBerth).toBeGreaterThan(0);
        expect(p.statusLabel).toContain(p.allocatedCoach);
      }
    }
    // Two passengers must never land on the same berth.
    const seats = booking.passengers.map((p: { allocatedCoach: string; allocatedBerth: number }) => `${p.allocatedCoach}/${p.allocatedBerth}`);
    expect(new Set(seats).size).toBe(seats.length);
  });

  it("consumes the draft on confirmation", async () => {
    const res = await getDraftRoute(req(`/api/bookings/draft/${draftId}`), params({ draftId }));
    expect(res.status).toBe(404);
  });

  it("lists the new booking alongside the seeded ones", async () => {
    const body = await (await getBookings()).json();
    expect(body.bookings.length).toBeGreaterThanOrEqual(4);
    expect(body.bookings.some((b: { pnr: string }) => b.pnr === pnr)).toBe(true);
    for (const b of body.bookings) {
      expect(body.trains[b.trainNumber]).toBeDefined();
      expect(body.stations[b.fromCode]).toBeDefined();
      expect(body.stations[b.toCode]).toBeDefined();
    }
    const dates = body.bookings.map((b: { journeyDate: string }) => b.journeyDate);
    expect([...dates].sort()).toEqual(dates);
  });

  it("serves the trip screen with live position, platform and coach position", async () => {
    const body = await (await getPnr(req(`/api/pnr/${pnr}`), params({ pnr }))).json();
    expect(body.booking.pnr).toBe(pnr);
    expect(body.train.number).toBe("12951");
    expect(body.boardingStop.stationCode).toBe("BCT");
    expect(body.alightingStop.stationCode).toBe("NDLS");
    expect(body.boardingStop.platform).toBeGreaterThan(0);
    expect(["notStarted", "running", "halted", "arrived"]).toContain(body.live.state);
    expect(body.boardingDelayMins).toBeGreaterThanOrEqual(0);
    expect(body.arrivalDelayMins).toBeGreaterThanOrEqual(0);
    expect(body.coachPosition.hint).toMatch(/Coach/);
    expect(body.stations.BCT).toBeDefined();
  });

  it("404s an unknown PNR", async () => {
    const res = await getPnr(req("/api/pnr/0000000000"), params({ pnr: "0000000000" }));
    expect(res.status).toBe(404);
  });

  it("quotes a refund before anything is cancelled", async () => {
    const body = await (await getRefundQuote(req(`/api/bookings/${pnr}/refund-quote`), params({ pnr }))).json();
    expect(body.pnr).toBe(pnr);
    expect(body.quote.bookingTotal).toBeGreaterThan(0);
    expect(body.quote.refundAmount).toBeLessThanOrEqual(body.quote.bookingTotal);
    expect(body.quote.slab.length).toBeGreaterThan(0);
    expect(body.quote.hoursBeforeDeparture).toBeGreaterThan(0);
  });

  it("cancels once, refunds the quoted amount, and refuses a second cancellation", async () => {
    const quoteBefore = (await (await getRefundQuote(req(`/api/bookings/${pnr}/refund-quote`), params({ pnr }))).json()).quote;
    const bookingBefore = (await (await getPnr(req(`/api/pnr/${pnr}`), params({ pnr }))).json()).booking;
    expect(bookingBefore.status).not.toBe("cancelled");

    const res = await postCancel(post(`/api/bookings/${pnr}/cancel`, {}), params({ pnr }));
    const { booking, quote } = await res.json();

    expect(booking.status).toBe("cancelled");
    expect(booking.refundAmount).toBe(quote.refundAmount);
    expect(quote.refundAmount).toBe(quoteBefore.refundAmount);
    expect(booking.cancelledAt).toEqual(expect.any(String));
    expect(booking.passengers.every((p: { status: string }) => p.status === "cancelled")).toBe(true);

    // Only status, refund, cancelledAt and passenger statuses moved.
    for (const key of ["pnr", "trainNumber", "journeyDate", "fromCode", "toCode", "classCode", "quota", "boardingMinute", "bookedAt"]) {
      expect(booking[key], `${key} must not change on cancel`).toEqual(bookingBefore[key]);
    }
    expect(booking.fareBreakdown).toEqual(bookingBefore.fareBreakdown);

    const second = await postCancel(post(`/api/bookings/${pnr}/cancel`, {}), params({ pnr }));
    expect(second.status).toBe(400);
    expect((await second.json()).error).toMatch(/already cancelled/);
  });
});

describe("GET /api/status", () => {
  it("reports scripted chat when no Anthropic key is set", async () => {
    const body = await (await getStatus()).json();
    expect(body.chatLive).toBe(false);
    expect(body.voiceModels).toBeNull();
  });
});
