import { describe, expect, it } from "vitest";
import { getWorld } from "@/lib/mock/seed";

const fmt = (m: number | null) =>
  m === null ? "--" : `${String(Math.floor((m % 1440) / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

describe("mock world", () => {
  const world = getWorld();

  it("builds every station with usable coordinates", () => {
    expect(world.stationList.length).toBeGreaterThan(250);
    for (const s of world.stationList) {
      expect(Number.isFinite(s.lat), `${s.code} lat`).toBe(true);
      expect(Number.isFinite(s.lng), `${s.code} lng`).toBe(true);
      expect(s.lat).toBeGreaterThan(6);
      expect(s.lat).toBeLessThan(36);
      expect(s.lng).toBeGreaterThan(68);
      expect(s.lng).toBeLessThan(98);
    }
  });

  it("builds every train with a monotonic, terminating schedule", () => {
    expect(world.trainList.length).toBe(81);
    for (const t of world.trainList) {
      expect(t.schedule.length, `${t.number} stops`).toBeGreaterThan(1);
      expect(t.schedule[0].arrivalMinute).toBeNull();
      expect(t.schedule[t.schedule.length - 1].departureMinute).toBeNull();
      expect(t.durationMins).toBeGreaterThan(0);
      expect(t.distanceKm).toBeGreaterThan(0);
      let prevKm = -1;
      let prevMinute = -1;
      for (const stop of t.schedule) {
        expect(stop.distanceKm, `${t.number} ${stop.stationCode} km`).toBeGreaterThan(prevKm);
        prevKm = stop.distanceKm;
        const at = stop.arrivalMinute ?? stop.departureMinute!;
        expect(at, `${t.number} ${stop.stationCode} time`).toBeGreaterThan(prevMinute);
        prevMinute = stop.departureMinute ?? at;
      }
    }
  });

  it("is deterministic across rebuilds", () => {
    const again = getWorld();
    expect(again.trains.get("16511")!.schedule).toEqual(world.trains.get("16511")!.schedule);
  });

  it("reproduces 16511 close to its real-world shape", () => {
    const t = world.trains.get("16511")!;
    expect(t.distanceKm).toBe(587);
    // Real 16511: 15h 5m, 22 halts, 38.9 km/h average.
    expect(t.durationMins).toBeGreaterThan(13 * 60);
    expect(t.durationMins).toBeLessThan(17 * 60);
    expect(t.haltCount).toBeGreaterThan(14);
    expect(t.haltCount).toBeLessThan(34);
    expect(t.avgSpeedKmph).toBeGreaterThan(32);
    expect(t.avgSpeedKmph).toBeLessThan(46);
    console.log(
      `16511 ${fmt(t.departureMinute)} → ${fmt(t.schedule[t.schedule.length - 1].arrivalMinute)} | ` +
        `${t.distanceKm}km ${Math.floor(t.durationMins / 60)}h${t.durationMins % 60}m | ` +
        `${t.haltCount}/${t.schedule.length} halts | avg ${t.avgSpeedKmph} max ${t.maxSpeedKmph} km/h`
    );
  });

  it("marshals a plausible rake", () => {
    const rake = world.trains.get("12951")!.rake;
    expect(rake[0].type).toBe("ENG");
    expect(rake[rake.length - 1].type).toBe("SLR");
    expect(rake.some((c) => c.type === "PC")).toBe(true);
    expect(rake.filter((c) => c.type === "3A").length).toBe(10);
    expect(rake.filter((c) => c.type === "1A").length).toBe(1);
    console.log("12951 rake:", rake.map((c) => c.code).join(" · "));
  });
});
