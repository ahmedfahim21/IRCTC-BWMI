import type { NextRequest } from "next/server";
import { getBooking, cancelBooking } from "@/lib/mock/bookings";
import { quoteRefund, hoursUntilDeparture } from "@/lib/domain/refunds";
import { handler, json, notFound, badRequest } from "@/lib/api/http";

export const POST = handler(async (_request: NextRequest, ctx: { params: Promise<{ pnr: string }> }) => {
  const { pnr } = await ctx.params;
  const booking = getBooking(pnr);
  if (!booking) return notFound(`No booking with PNR ${pnr}`);
  if (booking.status === "cancelled") return badRequest("This ticket is already cancelled");

  const quote = quoteRefund({
    classCode: booking.classCode,
    passengerCount: booking.passengers.length,
    ticketTotal: booking.fareBreakdown.total,
    hoursBeforeDeparture: hoursUntilDeparture(booking, new Date()),
    isConfirmed: booking.status === "confirmed" || booking.status === "partiallyConfirmed",
  });

  const cancelled = cancelBooking(pnr, quote.refundAmount);
  return json({ booking: cancelled, quote });
});
