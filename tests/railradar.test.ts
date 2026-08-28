import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  availabilityFromSeatDay,
  classesFromRake,
  isoToJourneyMinute,
  liveFromResponse,
  parseCoachPosition,
  rakeFromCoaches,
  stationsFromSearch,
  titleCase,
  toCoachType,
  toJourneyMinute,
  toRunsOn,
  toTrainType,
  trainFromResponse,
} from "@/lib/railradar/map";
import { packedTrainKey, uniquePackedTrains, type PackedTrain } from "@/lib/railradar/packedTrain";
import { resolveLiveStationCode, toLiveCode, toMockCode } from "@/lib/railradar/stations";
import type {
  RrCoachesResponse,
  RrLiveResponse,
  RrStationSearchResult,
  RrTrainResponse,
} from "@/lib/railradar/types";

const fixture = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(__dirname, "fixtures", `${name}.json`), "utf8")) as T;

const trainResponse = fixture<RrTrainResponse>("train-12723");
const coachesResponse = fixture<RrCoachesResponse>("coaches-12723");
const liveResponse = fixture<RrLiveResponse>("live-12723");
const searchResults = fixture<RrStationSearchResult[]>("stations-search");

/**
 * These run against responses recorded from the real API, so the mapping is
 * tested without spending the monthly request budget or depending on whatever
 * the railway happens to be doing today.
 */
describe("RailRadar mapping", () => {
  describe("primitives", () => {
    it("maps run days to weekday indices with Sunday as zero", () => {
      expect(toRunsOn(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).toEqual([1, 2, 3, 4, 5, 6, 0]);
      expect(toRunsOn(["sun"])).toEqual([0]);
      expect(toRunsOn(["nonsense"])).toEqual([]);
    });

    it("converts a clock time on day N into minutes from day one", () => {
      expect(toJourneyMinute("21:35", 1)).toBe(1295);
      expect(toJourneyMinute("00:05", 2)).toBe(1445);
      expect(toJourneyMinute("12:40", 2)).toBe(2200);
      expect(toJourneyMinute(undefined, 1)).toBeNull();
    });

    it("converts an IST timestamp into the same minute space", () => {
      expect(isoToJourneyMinute("2026-08-27T21:35:00+05:30", "2026-08-27")).toBe(1295);
      expect(isoToJourneyMinute("2026-08-28T00:05:00+05:30", "2026-08-27")).toBe(1445);
      expect(isoToJourneyMinute(undefined, "2026-08-27")).toBeNull();
    });

    it("classifies train types from name and category", () => {
      expect(toTrainType("Rajdhani Express")).toBe("rajdhani");
      expect(toTrainType("Mail/Express", "Express")).toBe("express");
      expect(toTrainType("SuperFast", "Superfast")).toBe("superfast");
      expect(toTrainType("MEMU", "Passenger")).toBe("passenger");
      expect(toTrainType("Vande Bharat")).toBe("vandeBharat");
    });

    it("maps coach codes to classes", () => {
      expect(toCoachType("ENG")).toBe("ENG");
      expect(toCoachType("LPR")).toBe("SLR");
      expect(toCoachType("GEN")).toBe("GS");
      expect(toCoachType("S7")).toBe("SL");
      expect(toCoachType("B2")).toBe("3A");
      expect(toCoachType("A1")).toBe("2A");
      expect(toCoachType("H1")).toBe("1A");
      expect(toCoachType("C4")).toBe("CC");
      expect(toCoachType("X9", "2A")).toBe("2A");
    });

    it("title-cases shouted station names without mangling normal ones", () => {
      expect(titleCase("DELHI JN.")).toBe("Delhi Jn.");
      expect(titleCase("KSR Bengaluru")).toBe("KSR Bengaluru");
    });

    it("maps generated codes onto live ones and back", () => {
      expect(toLiveCode("BCT")).toBe("MMCT");
      expect(toMockCode("MMCT")).toBe("BCT");
      expect(toLiveCode("NDLS")).toBe("NDLS");
    });
  });

  describe("search tokens", () => {
    it("turns a city token into the city's principal terminal", async () => {
      expect(await resolveLiveStationCode("city:Delhi")).toBe("NDLS");
      expect(await resolveLiveStationCode("city:Mumbai")).toBe("CSMT");
      expect(await resolveLiveStationCode("BCT")).toBe("MMCT");
      expect(await resolveLiveStationCode("")).toBeNull();
    });
  });

  describe("station search", () => {
    it("maps every result and keeps ordering information", () => {
      const stations = stationsFromSearch(searchResults);
      expect(stations.length).toBe(searchResults.length);
      for (const station of stations) {
        expect(station.code).toMatch(/^[A-Z]+$/);
        expect(station.name.length).toBeGreaterThan(0);
        expect(station.platformCount).toBeGreaterThanOrEqual(0);
      }
      expect(stations[0].code).toBe(searchResults[0].code);
    });
  });

  describe("rake", () => {
    it("reads the real formation and derives bookable classes", () => {
      const rake = rakeFromCoaches(coachesResponse);
      expect(rake.length).toBe(coachesResponse.totalCoaches);
      expect(rake[0].type).toBe("ENG");
      for (let i = 0; i < rake.length; i++) expect(rake[i].position).toBe(i + 1);

      const classes = classesFromRake(rake);
      expect(classes.length).toBeGreaterThan(0);
      expect(classes).toEqual(expect.arrayContaining(["SL", "3A"]));
      // Only bookable classes; engines and generator vans are not offered.
      expect(classes).not.toContain("ENG");
      expect(classes).not.toContain("SLR");
    });

    it("falls back to the dash-separated position string", () => {
      const rake = parseCoachPosition("ENG-LPR-GEN-S1-B1-A1-H1-PC-GEN-LPR");
      expect(rake.map((c) => c.type)).toEqual(["ENG", "SLR", "GS", "SL", "3A", "2A", "1A", "PC", "GS", "SLR"]);
      expect(parseCoachPosition(undefined)).toEqual([]);
    });
  });

  describe("train schedule", () => {
    const { train, stations } = trainFromResponse(trainResponse, rakeFromCoaches(coachesResponse));

    it("keeps the real identity and figures", () => {
      expect(train.number).toBe(trainResponse.train.number);
      expect(train.distanceKm).toBe(trainResponse.train.distance);
      expect(train.durationMins).toBe(trainResponse.train.duration);
      expect(train.avgSpeedKmph).toBe(trainResponse.train.avgSpeed);
      expect(train.haltCount).toBe(trainResponse.train.totalHalts);
      expect(train.classes.length).toBeGreaterThan(0);
    });

    it("produces a schedule that moves forward in both time and distance", () => {
      expect(train.schedule.length).toBe(trainResponse.route.length);
      let previousKm = -1;
      let previousMinute = -1;
      for (const stop of train.schedule) {
        expect(stop.distanceKm).toBeGreaterThanOrEqual(previousKm);
        previousKm = stop.distanceKm;
        const at = stop.arrivalMinute ?? stop.departureMinute;
        if (at !== null) {
          expect(at, `${stop.stationCode} goes backwards`).toBeGreaterThanOrEqual(previousMinute);
          previousMinute = stop.departureMinute ?? at;
        }
        expect(stations[stop.stationCode], `${stop.stationCode} missing from sidecar`).toBeDefined();
      }
    });

    it("keeps halts and pass-throughs distinct, and only halts get a platform", () => {
      const halts = train.schedule.filter((s) => s.isHalt);
      const passes = train.schedule.filter((s) => !s.isHalt);
      expect(halts.length).toBeGreaterThan(0);
      expect(passes.length).toBeGreaterThan(0);
      for (const stop of passes) expect(stop.platform).toBeNull();
    });

    it("carries usable coordinates for the map", () => {
      const located = Object.values(stations).filter((s) => Number.isFinite(s.lat));
      expect(located.length).toBeGreaterThan(Object.keys(stations).length * 0.9);
      for (const station of located) {
        expect(station.lat).toBeGreaterThan(6);
        expect(station.lat).toBeLessThan(37);
        expect(station.lng).toBeGreaterThan(68);
        expect(station.lng).toBeLessThan(98);
      }
    });
  });

  describe("live status", () => {
    const { train, stations } = trainFromResponse(trainResponse, []);
    const { live, timeline } = liveFromResponse(liveResponse, stations);

    it("maps position, delay and next stop", () => {
      expect(live.trainNumber).toBe(liveResponse.trainNumber);
      expect(live.date).toBe(liveResponse.startDate);
      expect(["notStarted", "running", "halted", "arrived"]).toContain(live.state);
      expect(live.delayMins).toBeGreaterThanOrEqual(0);
      expect(live.distanceCoveredKm).toBeGreaterThanOrEqual(0);
      expect(live.distanceCoveredKm).toBeLessThanOrEqual(train.distanceKm + 5);
      expect(live.updatedAt).toBe(liveResponse.lastUpdatedAt);
    });

    it("builds an ETA for every station on the route", () => {
      expect(timeline.length).toBe(liveResponse.route.length);
      for (const entry of timeline) {
        expect(live.etaByStation[entry.stationCode]).toBeDefined();
        expect(entry.delayMins).toEqual(expect.any(Number));
      }
    });

    it("never reports a speed it was not given", () => {
      // The upstream payload carries no instantaneous speed, so this must be 0
      // rather than a plausible-looking invention.
      expect(live.speedKmph).toBe(0);
    });
  });

  describe("seat availability", () => {
    const { train } = trainFromResponse(trainResponse, rakeFromCoaches(coachesResponse));

    it("maps each upstream status into our own states and labels", () => {
      const cases = [
        { statusCode: "AVAILABLE", availableSeats: 42, expected: { state: "available", label: "AVL 42" } },
        { statusCode: "WAITLIST", waitlistNumber: 31, waitlistType: "GNWL", expected: { state: "waitlist", label: "GNWL 31" } },
        { statusCode: "RAC", waitlistNumber: 4, expected: { state: "rac", label: "RAC 4" } },
        { statusCode: "REGRET", expected: { state: "regretted", label: "REGRET" } },
      ];

      for (const testCase of cases) {
        const availability = availabilityFromSeatDay(
          { date: "2026-09-03", rawDate: "2026-09-03", status: "x", isAvailable: false, ...testCase } as never,
          train,
          "3A",
          "GN",
          1682
        );
        expect(availability.state).toBe(testCase.expected.state);
        expect(availability.label).toBe(testCase.expected.label);
        expect(availability.date).toBe("2026-09-03");
        expect(availability.fare.total).toBeGreaterThan(0);
        // Odds come from our own history model, not from the seats endpoint.
        expect(availability.confirmProbability).toBeNull();
        expect(availability.sampleSize).toBe(0);
      }
    });
  });
});

describe("packed live map identity", () => {
  const a: PackedTrain = ["00168", "A", 28.6, 77.2, 5, 28.7, 77.3];
  const b: PackedTrain = ["00168", "B", 19.0, 72.8, 5, 19.1, 72.9];

  it("keeps the same number at two positions and drops bitwise copies", () => {
    expect(uniquePackedTrains([a, a, b])).toEqual([a, b]);
  });

  it("keys two 00168 rows differently", () => {
    expect(packedTrainKey(a, 0)).not.toBe(packedTrainKey(b, 1));
  });
});
