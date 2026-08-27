import type { NextRequest } from "next/server";
import type { ClassCode } from "@/lib/types";
import { quoteRefund } from "@/lib/domain/refunds";
import { getWorld } from "@/lib/mock/seed";
import { journeyInstant } from "@/lib/domain/time";
import { handler, json, badRequest, notFound } from "@/lib/api/http";

/**
 * What cancelling would cost, for a booking that hasn't been made yet.
 * Refund rules belong on the checkout page, not in a PDF you find afterwards.
 */
export const GET = handler(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const trainNumber = params.get("train");
  const fromCode = params.get("from");
  const date = params.get("date");
  const classCode = params.get("class") as ClassCode | null;
  const total = Number(params.get("total"));
  const passengerCount = Number(params.get("passengers") ?? 1);
  const isConfirmed = params.get("confirmed") !== "false";

  if (!trainNumber || !fromCode || !date || !classCode || !Number.isFinite(total)) {
    return badRequest("train, from, date, class and total are required");
  }

  const train = getWorld().trains.get(trainNumber);
  if (!train) return notFound(`No train ${trainNumber}`);
  const stop = train.schedule.find((s) => s.stationCode === fromCode);
  if (!stop?.departureMinute) return badRequest(`${trainNumber} does not depart from ${fromCode}`);

  const hoursBeforeDeparture = (journeyInstant(date, stop.departureMinute) - Date.now()) / 3600000;

  return json({
    quote: quoteRefund({ classCode, passengerCount, ticketTotal: total, hoursBeforeDeparture, isConfirmed }),
  });
});
