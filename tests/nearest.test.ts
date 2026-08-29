import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/stations/nearest/route";
import type { NearestResponse } from "@/app/api/stations/nearest/route";

const ask = async (query = "", headers: Record<string, string> = {}) =>
  (await GET(new NextRequest(`http://localhost:3277/api/stations/nearest${query}`, { headers }))).json() as Promise<NearestResponse>;

const IP_BENGALURU = { "x-vercel-ip-latitude": "12.972", "x-vercel-ip-longitude": "77.594", "x-vercel-ip-city": "Bengaluru" };

describe("nearest station", () => {
  it("suggests nothing at all when it has no signal, rather than guessing a city", async () => {
    const body = await ask();
    expect(body.source).toBe("none");
    expect(body.origin).toBeNull();
    expect(body.alternatives).toEqual([]);
  });

  it("does not read a missing coordinate as zero", async () => {
    // Number(null) is 0, which is a valid-looking fix in the Gulf of Guinea.
    for (const query of ["", "?lat=", "?lat=&lng=", "?lat=abc&lng=def", "?lng=77.5"]) {
      const body = await ask(query);
      expect(body.source, query).toBe("none");
      expect(body.origin, query).toBeNull();
    }
  });

  it("uses the coarse location a host derives from the connection", async () => {
    const body = await ask("", IP_BENGALURU);
    expect(body.source).toBe("network");
    expect(body.origin?.code).toBe("SBC");
    expect(body.near?.city).toBe("Bengaluru");
  });

  it("prefers a precise fix over the network guess", async () => {
    const body = await ask("?lat=26.912&lng=75.787", IP_BENGALURU);
    expect(body.source).toBe("coords");
    expect(body.origin?.code).toBe("JP");
  });

  it("finds the right terminus for every major city", async () => {
    const cities: Array<[string, number, number, string]> = [
      ["Delhi", 28.61, 77.21, "NDLS"],
      ["Kolkata", 22.572, 88.363, "HWH"],
      ["Chennai", 13.083, 80.27, "MAS"],
      ["Bengaluru", 12.972, 77.594, "SBC"],
      ["Hyderabad", 17.385, 78.487, "HYB"],
      ["Guwahati", 26.144, 91.736, "GHY"],
      ["Amritsar", 31.634, 74.872, "ASR"],
      ["Madurai", 9.925, 78.12, "MDU"],
    ];
    for (const [name, lat, lng, expected] of cities) {
      const body = await ask(`?lat=${lat}&lng=${lng}`);
      expect(body.origin?.code, name).toBe(expected);
      expect(body.origin?.distanceKm, name).toBeLessThan(25);
    }
  });

  it("returns nothing when the nearest station is unusably far", async () => {
    // Middle of the Indian Ocean.
    const body = await ask("?lat=0&lng=70");
    expect(body.origin).toBeNull();
  });

  it("offers alternatives in distinct cities, nearest first", async () => {
    const body = await ask("?lat=28.61&lng=77.21");
    expect(body.alternatives.length).toBeGreaterThan(0);
    const cities = body.alternatives.map((a) => a.city);
    expect(new Set(cities).size, "no two alternatives in the same city").toBe(cities.length);
    expect(body.alternatives.every((a) => a.code !== body.origin!.code)).toBe(true);
    const distances = body.alternatives.map((a) => a.distanceKm);
    expect([...distances].sort((x, y) => x - y)).toEqual(distances);
  });
});
