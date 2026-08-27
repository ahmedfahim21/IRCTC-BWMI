import type { NextRequest } from "next/server";
import { getWorld } from "@/lib/mock/seed";
import { findCrossings } from "@/lib/domain/crossings";
import { punctualityHistory } from "@/lib/mock/live";
import { todayIso } from "@/lib/domain/time";
import { liveTrain, isLive } from "@/lib/railradar/source";
import { handler, json, notFound } from "@/lib/api/http";
import { stationSidecar } from "@/lib/api/dto";

/** Everything the train page needs in one request: schedule, rake, who you meet, how late it runs. */
export const GET = handler(async (request: NextRequest, ctx: { params: Promise<{ number: string }> }) => {
  const { number } = await ctx.params;
  const date = request.nextUrl.searchParams.get("date") ?? todayIso();
  const world = getWorld();

  const live = await liveTrain(number);
  if (live) {
    const { train, stations } = live;
    return json({
      source: "live",
      train,
      date,
      /*
       * Crossings need the timetable of every other train on the same line.
       * Fetching those one by one would exhaust the request budget, so this is
       * only computed for the generated world rather than faked here.
       */
      crossings: [],
      crossingsAvailable: false,
      punctuality: [],
      punctualityAvailable: false,
      stations,
    });
  }

  const train = world.trains.get(number);
  if (!train) {
    return notFound(
      isLive()
        ? `No train ${number}. Check the number — the live directory covers the whole network.`
        : `No train ${number} in the generated timetable.`
    );
  }

  const corridor = world.corridors.find((c) => c.id === train.corridorId)!;

  return json({
    source: "generated",
    train: {
      number: train.number,
      name: train.name,
      type: train.type,
      runsOn: train.runsOn,
      classes: train.classes,
      hasPantry: train.hasPantry,
      returnTrainNumber: train.returnTrainNumber,
      departureMinute: train.departureMinute,
      distanceKm: train.distanceKm,
      durationMins: train.durationMins,
      haltCount: train.haltCount,
      avgSpeedKmph: train.avgSpeedKmph,
      maxSpeedKmph: train.maxSpeedKmph,
      avgDelayMins: train.avgDelayMins,
      schedule: train.schedule,
      rake: train.rake,
    },
    date,
    crossings: findCrossings(train, corridor, world.trainList, date),
    crossingsAvailable: true,
    punctuality: punctualityHistory(train, todayIso()),
    punctualityAvailable: true,
    stations: stationSidecar(
      train.schedule.map((s) => s.stationCode),
      world.stations
    ),
  });
});
