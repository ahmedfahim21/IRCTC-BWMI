import type { NextRequest } from "next/server";
import { getBooking } from "@/lib/mock/bookings";
import { quoteRefund, hoursUntilDeparture } from "@/lib/domain/refunds";
import { handler, json, notFound } from "@/lib/api/http";

/** What cancelling costs right now, and what it will cost after the next deadline. */
export const GET = handler(async (_request: NextRequest, ctx: { params: Promise<{ pnr: string }> }) => {
  const { pnr } = await ctx.params;
  const booking = getBooking(pnr);
  if (!booking) return notFound(`No booking with PNR ${pnr}`);

  return json({
    pnr,
    quote: quoteRefund({
      classCode: booking.classCode,
      passengerCount: booking.passengers.length,
      ticketTotal: booking.fareBreakdown.total,
      hoursBeforeDeparture: hoursUntilDeparture(booking, new Date()),
      isConfirmed: booking.status === "confirmed" || booking.status === "partiallyConfirmed",
    }),
  });
});
