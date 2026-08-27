import type { Booking, ClassCode, RefundQuote } from "@/lib/types";
import { AC_CLASSES } from "./fares";

/**
 * Indian Railways cancellation rules, made visible *before* you pay rather than
 * living in a PDF. Flat charge per passenger when cancelled well ahead; a
 * percentage of fare as departure closes in; nothing inside four hours.
 */
const FLAT_CHARGE: Record<ClassCode, number> = {
  "1A": 240,
  EC: 240,
  "2A": 200,
  CC: 200,
  "3A": 180,
  "3E": 180,
  SL: 120,
  "2S": 60,
};

/** Clerkage on an RAC or waitlisted ticket, per passenger. */
const CLERKAGE = 60;

export interface RefundInput {
  classCode: ClassCode;
  passengerCount: number;
  ticketTotal: number;
  /** Whole hours between now and scheduled departure. Negative once it has left. */
  hoursBeforeDeparture: number;
  /** RAC and waitlisted tickets refund on a different, gentler schedule. */
  isConfirmed: boolean;
}

export function quoteRefund(input: RefundInput): RefundQuote {
  const { classCode, passengerCount, ticketTotal, hoursBeforeDeparture, isConfirmed } = input;
  const flat = FLAT_CHARGE[classCode] * passengerCount;

  let cancellationCharge: number;
  let slab: string;

  if (!isConfirmed) {
    if (hoursBeforeDeparture < 0.5) {
      cancellationCharge = ticketTotal;
      slab = "No refund — RAC/waitlisted tickets must be cancelled at least 30 minutes before departure";
    } else {
      cancellationCharge = CLERKAGE * passengerCount;
      slab = "Clerkage only — RAC/waitlisted ticket cancelled more than 30 minutes before departure";
    }
  } else if (hoursBeforeDeparture < 4) {
    cancellationCharge = ticketTotal;
    slab = "No refund — confirmed ticket cancelled within 4 hours of departure";
  } else if (hoursBeforeDeparture < 12) {
    cancellationCharge = Math.max(flat, Math.round(ticketTotal * 0.5));
    slab = "50% of fare — cancelled between 4 and 12 hours before departure";
  } else if (hoursBeforeDeparture < 48) {
    cancellationCharge = Math.max(flat, Math.round(ticketTotal * 0.25));
    slab = "25% of fare — cancelled between 12 and 48 hours before departure";
  } else {
    cancellationCharge = flat;
    slab = "Flat charge — cancelled more than 48 hours before departure";
  }

  cancellationCharge = Math.min(cancellationCharge, ticketTotal);
  const gstOnCharge = AC_CLASSES.includes(classCode) ? Math.round(cancellationCharge * 0.05) : 0;
  const refundAmount = Math.max(0, ticketTotal - cancellationCharge - gstOnCharge);

  const boundaries = isConfirmed ? [48, 12, 4] : [0.5];
  const nextBoundary = boundaries.find((b) => b < hoursBeforeDeparture) ?? null;
  const nextSlabRefund =
    nextBoundary === null
      ? null
      : quoteRefund({ ...input, hoursBeforeDeparture: nextBoundary - 0.01 }).refundAmount;

  return {
    bookingTotal: ticketTotal,
    cancellationCharge,
    gstOnCharge,
    refundAmount,
    slab,
    hoursBeforeDeparture,
    nextSlabAt: nextBoundary === null ? null : `${nextBoundary}h before departure`,
    nextSlabRefund,
  };
}

/** Hours from `now` until a booking's scheduled departure. */
export function hoursUntilDeparture(booking: Booking, now: Date): number {
  const departureUtcMs =
    Date.parse(`${booking.journeyDate}T00:00:00Z`) - 330 * 60000 + booking.boardingMinute * 60000;
  return (departureUtcMs - now.getTime()) / 3600000;
}
