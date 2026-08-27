"use client";

import type { Booking, ScheduleStop, Station } from "@/lib/types";
import { formatDateShort, formatMinute, formatWeekday } from "@/lib/domain/time";
import { Barcode } from "./Barcode";
import { explainStatus } from "@/lib/glossary";
import { cn } from "@/components/ui/cn";

const STATUS_TONE = {
  confirmed: "text-ok",
  rac: "text-warn",
  waitlist: "text-danger",
  cancelled: "text-faint",
} as const;

/**
 * The ticket itself. Everything a TTE needs and everything you need on the
 * platform — and it is all cached, so it renders with the network off.
 */
export function TicketCard({
  booking,
  stations,
  boardingStop,
  alightingStop,
}: {
  booking: Booking;
  stations: Record<string, Station>;
  boardingStop: ScheduleStop;
  alightingStop: ScheduleStop;
}) {
  return (
    <div className={cn("card overflow-hidden", booking.status === "cancelled" && "opacity-70")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border px-4 py-3">
        <div>
          <p className="eyebrow">PNR</p>
          <p className="tnum text-[1.125rem] tracking-[0.14em] text-text">{booking.pnr}</p>
        </div>
        <div className="text-right">
          <p className="eyebrow">{booking.classCode} · {booking.quota}</p>
          <p className={cn("text-[0.8125rem] capitalize", booking.status === "cancelled" ? "text-faint" : booking.status === "waitlist" ? "text-danger" : "text-ok")}>
            {booking.status === "partiallyConfirmed" ? "Partly confirmed" : booking.status}
          </p>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-3.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <p className="tnum text-[1.375rem] leading-none text-text">{formatMinute(booking.boardingMinute)}</p>
          <p className="mt-1 text-[0.875rem] text-dim">{stations[booking.fromCode]?.name}</p>
          <p className="text-[0.6875rem] text-faint">
            <span className="font-mono">{booking.fromCode}</span>
            {boardingStop.platform !== null && <> · Platform {boardingStop.platform}</>}
          </p>
        </div>

        <div className="hidden h-px w-10 bg-border sm:block" aria-hidden />

        <div className="sm:text-right">
          <p className="tnum text-[1.375rem] leading-none text-text">{formatMinute(booking.alightingMinute)}</p>
          <p className="mt-1 text-[0.875rem] text-dim">{stations[booking.toCode]?.name}</p>
          <p className="text-[0.6875rem] text-faint">
            <span className="font-mono">{booking.toCode}</span>
            {alightingStop.platform !== null && <> · Platform {alightingStop.platform}</>}
          </p>
        </div>
      </div>

      <p className="border-t border-border px-4 py-2.5 text-[0.8125rem] text-dim">
        <span className="tnum text-faint">{booking.trainNumber}</span> {booking.trainName}
        <span className="mx-2 text-faint">·</span>
        {formatWeekday(booking.journeyDate)} {formatDateShort(booking.journeyDate)}
      </p>

      <ul className="divide-y divide-border border-t border-border">
        {booking.passengers.map((passenger) => (
          <li key={passenger.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5">
            <span className="text-[0.875rem] text-text">{passenger.name}</span>
            <span className="text-[0.6875rem] text-faint">
              {passenger.age} · {passenger.gender === "male" ? "M" : passenger.gender === "female" ? "F" : "O"}
            </span>
            <span className={cn("tnum ml-auto text-[0.8125rem]", STATUS_TONE[passenger.status])}>
              {passenger.statusLabel}
            </span>
            {explainStatus(passenger.statusLabel) && (
              <span className="w-full text-[0.6875rem] text-faint">{explainStatus(passenger.statusLabel)}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-dashed border-border px-4 pb-3 pt-3.5">
        <Barcode value={booking.pnr} />
        <p className="mt-2 text-center text-[0.625rem] text-faint">
          Show this to the ticket examiner. Works without a network.
        </p>
      </div>
    </div>
  );
}
