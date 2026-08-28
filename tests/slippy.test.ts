import { describe, expect, it } from "vitest";
import {
  MIN_ZOOM,
  clampView,
  latToWorldY,
  lngLatToViewPx,
  lngToWorldX,
  viewportBbox,
  worldXToLng,
  worldYToLat,
  zoomToFit,
} from "@/lib/geo/slippy";

const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [68.1, 6.6],
  [97.4, 37.1],
];

function viewExtents(
  centerLng: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number
) {
  const box = viewportBbox(centerLng, centerLat, zoom, width, height).split(",").map(Number);
  return { west: box[0], south: box[1], east: box[2], north: box[3] };
}

describe("slippy projection", () => {
  it("round-trips lng/lat at zoom 4", () => {
    const lng = 77.2;
    const lat = 28.6;
    const z = 4;
    expect(worldXToLng(lngToWorldX(lng, z), z)).toBeCloseTo(lng, 6);
    expect(worldYToLat(latToWorldY(lat, z), z)).toBeCloseTo(lat, 6);
  });

  it("fits India into a landscape pane without exceeding zoom 12", () => {
    const view = zoomToFit(68.1, 6.6, 97.4, 37.1, 900, 700, 28);
    expect(view.zoom).toBeGreaterThanOrEqual(MIN_ZOOM);
    expect(view.zoom).toBeLessThanOrEqual(12);
    expect(view.centerLng).toBeCloseTo((68.1 + 97.4) / 2, 5);
  });

  it("emits a bbox string for the live-map query", () => {
    const box = viewportBbox(80, 22.5, 5, 800, 600);
    const [west, south, east, north] = box.split(",").map(Number);
    expect(west).toBeLessThan(east);
    expect(south).toBeLessThan(north);
  });

  it("projects New Delhi onto a landscape India view", () => {
    const pt = lngLatToViewPx(77.2, 28.6, 82.75, 21.85, 4.5, 800, 600);
    expect(pt.x).toBeGreaterThan(0);
    expect(pt.x).toBeLessThan(800);
    expect(pt.y).toBeGreaterThan(0);
    expect(pt.y).toBeLessThan(600);
  });
});

describe("clampView", () => {
  const width = 352;
  const height = 320;
  const [[west, south], [east, north]] = INDIA_BOUNDS;

  it("returns an already-valid view unchanged", () => {
    const view = { centerLng: 82.75, centerLat: 21.85, zoom: 6 };
    const clamped = clampView(view.centerLng, view.centerLat, view.zoom, width, height, INDIA_BOUNDS);
    expect(clamped.centerLng).toBeCloseTo(view.centerLng, 6);
    expect(clamped.centerLat).toBeCloseTo(view.centerLat, 6);
    expect(clamped.zoom).toBe(view.zoom);
  });

  it("raises zoom below MIN_ZOOM", () => {
    const clamped = clampView(82.75, 21.85, 2, width, height, INDIA_BOUNDS);
    expect(clamped.zoom).toBe(MIN_ZOOM);
  });

  it("clamps pan far west, east, north, and south inside India", () => {
    const cases = [
      { centerLng: 10, centerLat: 21.85 },
      { centerLng: 140, centerLat: 21.85 },
      { centerLng: 82.75, centerLat: -10 },
      { centerLng: 82.75, centerLat: 60 },
    ];
    for (const sample of cases) {
      const clamped = clampView(sample.centerLng, sample.centerLat, 7, width, height, INDIA_BOUNDS);
      const extents = viewExtents(clamped.centerLng, clamped.centerLat, clamped.zoom, width, height);
      expect(extents.west).toBeGreaterThanOrEqual(west - 0.01);
      expect(extents.east).toBeLessThanOrEqual(east + 0.01);
      expect(extents.south).toBeGreaterThanOrEqual(south - 0.01);
      expect(extents.north).toBeLessThanOrEqual(north + 0.01);
    }
  });

  it("pins the center when the viewport is wider than India at MIN_ZOOM", () => {
    const clamped = clampView(10, 5, MIN_ZOOM, width, height, INDIA_BOUNDS);
    expect(clamped.centerLng).toBeCloseTo((west + east) / 2, 4);
    expect(clamped.zoom).toBe(MIN_ZOOM);
  });
});
