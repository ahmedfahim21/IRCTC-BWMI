import type { NextRequest } from "next/server";
import { getBooking } from "@/lib/mock/bookings";
import { getWorld } from "@/lib/mock/seed";
import { getLiveStatus } from "@/lib/mock/live";
import { positionOfCoach } from "@/lib/domain/platform";
import { handler, json, notFound } from "@/lib/api/http";
import { stationSidecar } from "@/lib/api/dto";

/**
 * The trip screen payload. A PNR alone gets you the live position, your
 * platform, and where your coach stops on it — the things that today live in
 * three different apps.
 */
export const GET = handler(async (_request: NextRequest, ctx: { params: Promise<{ pnr: string }> }) => {
  const { pnr } = await ctx.params;
  const booking = getBooking(pnr);
  if (!booking) return notFound(`No booking with PNR ${pnr}`);

  const world = getWorld();
  const train = world.trains.get(booking.trainNumber)!;
  const boardingStation = world.stations.get(booking.fromCode)!;
  const boardingStop = train.schedule.find((s) => s.stationCode === booking.fromCode)!;
  const alightingStop = train.schedule.find((s) => s.stationCode === booking.toCode)!;

  const live = getLiveStatus(train, booking.journeyDate, world.stations, new Date());
  const coachCode = booking.passengers.find((p) => p.allocatedCoach)?.allocatedCoach ?? null;

  return json({
    booking,
    train: {
      number: train.number,
      name: train.name,
      type: train.type,
      distanceKm: train.distanceKm,
      avgDelayMins: train.avgDelayMins,
      schedule: train.schedule,
      rake: train.rake,
    },
    live,
    boardingStop,
    alightingStop,
    /** Delay at *your* boarding station, not at the train's origin. */
    boardingDelayMins: live.etaByStation[booking.fromCode]?.delayMins ?? 0,
    arrivalDelayMins: live.etaByStation[booking.toCode]?.delayMins ?? 0,
    coachPosition: coachCode ? positionOfCoach(train, boardingStation, boardingStop.platform, coachCode) : null,
    stations: stationSidecar(
      train.schedule.map((s) => s.stationCode),
      world.stations
    ),
  });
});
