import { describe, expect, it } from "vitest";
import { lookupStationCoords, stationCoordTable } from "@/lib/geo/stationCoords";
import { backfillCoords } from "@/lib/geo/coords";

const INDIA_BBOX = { minLat: 6, maxLat: 37.2, minLng: 68, maxLng: 97.5 };

const SAMPLE = ["NDLS", "NZM", "MAS", "HWH", "SBC", "BZA", "JP", "LKO", "PNBE", "ADI", "KYQ", "BCT", "MMCT", "CSTM", "CSMT"];

describe("bundled station coordinates", () => {
  it("parses a table of unique IR codes", () => {
    const table = stationCoordTable();
    expect(table.size).toBeGreaterThan(9000);
    expect(new Set(table.keys()).size).toBe(table.size);
  });

  it("resolves the sample codes used across the app", () => {
    for (const code of SAMPLE) {
      const coords = lookupStationCoords(code);
      expect(coords, code).not.toBeNull();
      expect(Number.isFinite(coords!.lat)).toBe(true);
      expect(Number.isFinite(coords!.lng)).toBe(true);
    }
  });

  it("returns null for a known-missing code rather than (0, 0)", () => {
    expect(lookupStationCoords("DRSV")).toBeNull();
    expect(lookupStationCoords("")).toBeNull();
    expect(lookupStationCoords("not-a-code")).toBeNull();
  });

  it("keeps every entry inside the India bbox", () => {
    for (const [code, { lat, lng }] of stationCoordTable()) {
      expect(lat, code).toBeGreaterThanOrEqual(INDIA_BBOX.minLat);
      expect(lat, code).toBeLessThanOrEqual(INDIA_BBOX.maxLat);
      expect(lng, code).toBeGreaterThanOrEqual(INDIA_BBOX.minLng);
      expect(lng, code).toBeLessThanOrEqual(INDIA_BBOX.maxLng);
    }
  });

  it("backfills NaN coordinates from the table", () => {
    const filled = backfillCoords({
      code: "NDLS",
      name: "New Delhi",
      city: "Delhi",
      stateCode: "DL",
      zone: "NR",
      platformCount: 16,
      lat: Number.NaN,
      lng: Number.NaN,
    });
    expect(filled.lat).toBeCloseTo(28.64, 1);
    expect(filled.lng).toBeCloseTo(77.22, 1);

    const missed = backfillCoords({
      code: "DRSV",
      name: "Dharashiv",
      city: "Dharashiv",
      stateCode: "MH",
      zone: "CR",
      platformCount: 2,
      lat: Number.NaN,
      lng: Number.NaN,
    });
    expect(Number.isFinite(missed.lat)).toBe(false);
  });
});
