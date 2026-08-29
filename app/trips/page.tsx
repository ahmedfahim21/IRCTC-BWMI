"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMinute, formatWeekday, todayIso } from "@/lib/domain/time";
import { RouteGlyph } from "@/components/rail/RouteGlyph";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/components/ui/cn";
import { useLocale } from "@/lib/i18n/useLocale";

const STATUS_TONE = {
  confirmed: { text: "text-ok", dot: "bg-ok" },
  partiallyConfirmed: { text: "text-warn", dot: "bg-warn" },
  waitlist: { text: "text-danger", dot: "bg-danger" },
  cancelled: { text: "text-faint", dot: "bg-faint" },
} as const;

export default function TripsPage() {
  const today = todayIso();
  const { t } = useLocale();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["bookings"],
    queryFn: ({ signal }) => api.bookings(signal),
  });

  if (isPending) return <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><SkeletonRows rows={3} /></div>;
  if (isError)
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );

  const upcoming = data.bookings.filter((b) => b.journeyDate >= today && b.status !== "cancelled");
  const past = data.bookings.filter((b) => b.journeyDate < today || b.status === "cancelled");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6">
      <header className="mb-8">
        <p className="eyebrow mb-2">Your journeys</p>
        <h1 className="font-display text-[1.75rem] leading-none">{t("trips.title")}</h1>
      </header>

      {data.bookings.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong p-12 text-center">
          <Ticket className="mx-auto mb-3 size-5 text-faint" aria-hidden />
          <p className="text-[0.9375rem] text-text">{t("trips.none")}</p>
          <Link href="/" className="mt-2 inline-block text-[0.8125rem] text-brand underline decoration-dotted underline-offset-2">
            {t("trips.findTrain")}
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title={t("trips.upcoming")} bookings={upcoming} stations={data.stations} empty="Nothing booked ahead." />
          <Section title={t("trips.past")} bookings={past} stations={data.stations} empty="Nothing here yet." />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  bookings,
  stations,
  empty,
}: {
  title: string;
  bookings: Array<import("@/lib/types").Booking>;
  stations: Record<string, import("@/lib/types").Station>;
  empty: string;
}) {
  return (
    <section>
      <h2 className="eyebrow mb-3">{title}</h2>
      {bookings.length === 0 ? (
        <p className="text-[0.8125rem] text-faint">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => {
            const tone = STATUS_TONE[booking.status];
            return (
              <li key={booking.pnr}>
                <Link
                  href={`/trips/${booking.pnr}`}
                  className={cn("card lift block p-4 sm:p-5", booking.status === "cancelled" && "opacity-60")}
                >
                  <div className="flex items-baseline gap-x-2.5">
                    <span className="tnum font-mono text-[0.6875rem] text-faint">{booking.trainNumber}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-text">{booking.trainName}</span>
                    <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-[0.75rem]", tone.text)}>
                      <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
                      {booking.status === "partiallyConfirmed" ? "Partly confirmed" : <span className="capitalize">{booking.status}</span>}
                    </span>
                  </div>

                  <div className="mt-3.5 flex items-center gap-4 sm:gap-5">
                    <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                      <div className="min-w-0">
                        <p className="tnum text-[1.125rem] leading-none text-text">{formatMinute(booking.boardingMinute)}</p>
                        <p className="mt-1 truncate text-[0.75rem] text-faint">{stations[booking.fromCode]?.name}</p>
                      </div>
                      <RouteGlyph className="mb-4" />
                      <div className="min-w-0 text-right">
                        <p className="tnum text-[1.125rem] leading-none text-text">{formatMinute(booking.alightingMinute)}</p>
                        <p className="mt-1 truncate text-[0.75rem] text-faint">{stations[booking.toCode]?.name}</p>
                      </div>
                    </div>

                    {/* The date as a calendar leaf, not a clause at the end of a sentence. */}
                    <div className="shrink-0 border-l border-border pl-4 text-center sm:pl-5">
                      <p className="text-[0.625rem] uppercase tracking-[0.09em] text-faint">{formatWeekday(booking.journeyDate)}</p>
                      <p className="tnum text-[1.25rem] leading-tight text-text">{Number(booking.journeyDate.slice(8, 10))}</p>
                      <p className="text-[0.6875rem] leading-none text-faint">
                        {new Date(`${booking.journeyDate}T00:00:00`).toLocaleString("en-IN", { month: "short" })}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3.5 flex flex-wrap gap-x-3 border-t border-border pt-2.5 text-[0.6875rem] text-faint">
                    <span className="tnum tracking-[0.08em]">PNR {booking.pnr}</span>
                    <span className="font-mono">{booking.classCode}</span>
                    <span>
                      {booking.passengers.length} passenger{booking.passengers.length === 1 ? "" : "s"}
                    </span>
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
