import { describe, expect, it } from "vitest";
import { latToWorldY, lngLatToViewPx, lngToWorldX, viewportBbox, worldXToLng, worldYToLat, zoomToFit } from "@/lib/geo/slippy";

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
    expect(view.zoom).toBeGreaterThan(3);
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
