import type { NextRequest } from "next/server";
import type { ClassCode, QuotaCode } from "@/lib/types";
import { getWorld } from "@/lib/mock/seed";
import { getAvailability } from "@/lib/mock/availability";
import { addDays, todayIso } from "@/lib/domain/time";
import { liveTrain, liveSeatCalendar } from "@/lib/railradar/source";
import { handler, json, notFound, badRequest } from "@/lib/api/http";
import { findStop } from "@/lib/railradar/stations";

/**
 * The date strip: availability either side of the chosen date, so you can see a
 * dead date before you search it rather than after.
 *
 * This is the one availability surface that is affordable live — the upstream
 * seats endpoint returns a fortnight in a single request.
 */
export const GET = handler(async (request: NextRequest, ctx: { params: Promise<{ number: string }> }) => {
  const { number } = await ctx.params;
  const params = request.nextUrl.searchParams;

  const from = params.get("from");
  const to = params.get("to");
  if (!from || !to) return badRequest("from and to are required");

  const date = params.get("date") ?? todayIso();
  const quota = (params.get("quota") ?? "GN") as QuotaCode;
  const today = params.get("today") ?? todayIso();
  const span = Math.min(21, Number(params.get("span") ?? 7));

  const upstream = await liveTrain(number);
  if (upstream) {
    const { train } = upstream;
    const classCode = (params.get("class") ?? train.classes[0]) as ClassCode;
    const fromStop = findStop(train.schedule, from);
    const toStop = findStop(train.schedule, to);
    const distanceKm = (toStop?.distanceKm ?? train.distanceKm) - (fromStop?.distanceKm ?? 0);

    const calendar = await liveSeatCalendar(train, classCode, quota, from, to, date, distanceKm);
    if (calendar) {
      return json({
        source: "live",
        trainNumber: number,
        classCode,
        quota,
        days: calendar.filter((day) => day.date >= today),
      });
    }
  }

  const world = getWorld();
  const train = world.trains.get(number);
  if (!train) return notFound(`No train ${number}`);

  const classCode = (params.get("class") ?? train.classes[0]) as ClassCode;
  const days = [];
  for (let offset = -Math.floor(span / 2); offset <= Math.ceil(span / 2); offset++) {
    const dateIso = addDays(date, offset);
    if (dateIso < today) continue;
    days.push(getAvailability({ train, dateIso, classCode, quota, fromCode: from, toCode: to, today }));
  }

  return json({ source: "generated", trainNumber: number, classCode, quota, days });
});
