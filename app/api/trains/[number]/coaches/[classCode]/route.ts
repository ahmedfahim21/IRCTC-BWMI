import type { NextRequest } from "next/server";
import type { ClassCode, CoachType, QuotaCode } from "@/lib/types";
import { getWorld } from "@/lib/mock/seed";
import { coachLayouts } from "@/lib/mock/coaches";
import { buildBerths } from "@/lib/mock/berths";
import { coachPositions } from "@/lib/domain/platform";
import { todayIso } from "@/lib/domain/time";
import { liveTrain, liveSeatCalendar } from "@/lib/railradar/source";
import { getAvailability } from "@/lib/mock/availability";
import { handler, json, notFound, badRequest } from "@/lib/api/http";
import { findStop } from "@/lib/railradar/stations";

/** Berth map for a class, plus where each coach stops on the boarding platform. */
export const GET = handler(
  async (request: NextRequest, ctx: { params: Promise<{ number: string; classCode: string }> }) => {
    const { number, classCode } = await ctx.params;
    const params = request.nextUrl.searchParams;
    const from = params.get("from");
    const to = params.get("to");
    if (!from || !to) return badRequest("from and to are required");

    const date = params.get("date") ?? todayIso();
    const quota = (params.get("quota") ?? "GN") as QuotaCode;
    const today = params.get("today") ?? todayIso();

    const upstream = await liveTrain(number);
    if (upstream) {
      const { train, stations } = upstream;
      if (!train.classes.includes(classCode as ClassCode)) {
        return badRequest(`${number} has no ${classCode} coaches in its rake`);
      }

      const fromStop = findStop(train.schedule, from);
      const toStop = findStop(train.schedule, to);
      const distanceKm = (toStop?.distanceKm ?? train.distanceKm) - (fromStop?.distanceKm ?? 0);

      const calendar = await liveSeatCalendar(train, classCode as ClassCode, quota, from, to, date, distanceKm);
      const availability =
        calendar?.find((day) => day.date === date) ??
        calendar?.[0] ??
        null;

      // Berth-level inventory isn't exposed by the API, so the diagram is
      // generated at the real occupancy the availability figure implies.
      const freeSeats = availability?.state === "available" ? availability.count : 0;
      const capacity = train.rake
        .filter((c) => c.type === (classCode as string))
        .reduce((n, c) => n + c.berthCount, 0);
      const occupancy = capacity === 0 ? 1 : Math.min(0.995, 1 - freeSeats / capacity);

      const coaches = train.rake
        .filter((coach) => coach.type === (classCode as string))
        .map((coach) => ({
          ...coach,
          berths: buildBerths(`${number}:${date}:${coach.code}`, coach.type as CoachType, occupancy),
        }));

      const boardingStation = stations[from];
      const boardingStop = fromStop;

      return json({
        source: "live",
        berthMapSource: "generated",
        trainNumber: number,
        classCode,
        date,
        availability,
        coaches,
        platform: boardingStop?.platform ?? null,
        positions: boardingStation ? coachPositions(train, boardingStation, boardingStop?.platform ?? null) : [],
        boardingStation,
      });
    }

    const world = getWorld();
    const train = world.trains.get(number);
    if (!train) return notFound(`No train ${number}`);
    if (!train.classes.includes(classCode as ClassCode)) {
      return badRequest(`${number} has no ${classCode} class`);
    }

    const { layouts, availability } = coachLayouts(train, classCode as ClassCode, date, quota, from, to, today);
    const boardingStation = world.stations.get(from)!;
    const boardingStop = findStop(train.schedule, from);

    return json({
      source: "generated",
      berthMapSource: "generated",
      trainNumber: number,
      classCode,
      date,
      availability,
      coaches: layouts,
      platform: boardingStop?.platform ?? null,
      positions: coachPositions(train, boardingStation, boardingStop?.platform ?? null),
      boardingStation,
    });
  }
);
