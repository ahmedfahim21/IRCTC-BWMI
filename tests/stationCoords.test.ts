import { describe, expect, it } from "vitest";
import { lookupStationCoords, stationCoordTable } from "@/lib/geo/stationCoords";
import { backfillCoords } from "@/lib/geo/coords";
import type { Station } from "@/lib/types";

const INDIA = { minLat: 6, maxLat: 37.2, minLng: 68, maxLng: 97.5 };

const stub = (code: string, lat = Number.NaN, lng = Number.NaN): Station => ({
  code,
  name: code,
  city: code,
  stateCode: "",
  lat,
  lng,
  zone: "",
  platformCount: 0,
});

describe("bundled station coordinates", () => {
  it("parses a lazy Map of CODE|lat|lng rows", () => {
    const table = stationCoordTable();
    expect(table.size).toBeGreaterThan(5000);
    expect(lookupStationCoords("")).toBeNull();
  });

  it("has sample terminals in India", () => {
    const samples = ["NDLS", "BCT", "MMCT", "HWH", "MAS", "CSMT", "CSTM"] as const;
    for (const code of samples) {
      const point = lookupStationCoords(code);
      expect(point, code).not.toBeNull();
      expect(point!.lat).toBeGreaterThanOrEqual(INDIA.minLat);
      expect(point!.lat).toBeLessThanOrEqual(INDIA.maxLat);
      expect(point!.lng).toBeGreaterThanOrEqual(INDIA.minLng);
      expect(point!.lng).toBeLessThanOrEqual(INDIA.maxLng);
    }
  });

  it("returns null for codes with no known position", () => {
    expect(lookupStationCoords("DRSV")).toBeNull();
    const filled = backfillCoords(stub("DRSV"));
    expect(Number.isFinite(filled.lat)).toBe(false);
    expect(Number.isFinite(filled.lng)).toBe(false);
    const zero = backfillCoords(stub("DRSV", 0, 0));
    expect(Number.isFinite(zero.lat)).toBe(false);
  });

  it("keeps every packed row inside the India bounding box", () => {
    for (const [code, { lat, lng }] of stationCoordTable()) {
      expect(lat, code).toBeGreaterThanOrEqual(INDIA.minLat);
      expect(lat, code).toBeLessThanOrEqual(INDIA.maxLat);
      expect(lng, code).toBeGreaterThanOrEqual(INDIA.minLng);
      expect(lng, code).toBeLessThanOrEqual(INDIA.maxLng);
      expect(lat === 0 && lng === 0, code).toBe(false);
    }
  });

  it("prefers finite API coordinates over the table", () => {
    const api = backfillCoords(stub("NDLS", 28.5, 77.1));
    expect(api.lat).toBe(28.5);
    expect(api.lng).toBe(77.1);
    const filled = backfillCoords(stub("NDLS"));
    expect(filled).toMatchObject(lookupStationCoords("NDLS")!);
  });
});
