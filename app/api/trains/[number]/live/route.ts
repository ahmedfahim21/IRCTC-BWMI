import type { NextRequest } from "next/server";
import { getWorld } from "@/lib/mock/seed";
import { getLiveStatus, actualTimes } from "@/lib/mock/live";
import { todayIso } from "@/lib/domain/time";
import { liveTrain, liveStatus } from "@/lib/railradar/source";
import { handler, json, notFound } from "@/lib/api/http";

/**
 * Live position. Real when a RailRadar key is configured; otherwise simulated
 * as a pure function of the request time, so the marker moves either way.
 */
export const GET = handler(async (request: NextRequest, ctx: { params: Promise<{ number: string }> }) => {
  const { number } = await ctx.params;
  const date = request.nextUrl.searchParams.get("date") ?? todayIso();

  const upstream = await liveTrain(number);
  if (upstream) {
    const result = await liveStatus(number, date, upstream.stations);
    if (result) return json({ source: "live", ...result });
  }

  const world = getWorld();
  const train = world.trains.get(number);
  if (!train) return notFound(`No train ${number}`);

  return json({
    source: "generated",
    live: getLiveStatus(train, date, world.stations, new Date()),
    timeline: actualTimes(train, date).map((entry) => ({
      stationCode: entry.stop.stationCode,
      delayMins: entry.delayMins,
      actualArrival: entry.actualArrival,
      actualDeparture: entry.actualDeparture,
    })),
  });
});
