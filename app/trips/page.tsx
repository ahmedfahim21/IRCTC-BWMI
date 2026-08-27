"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Ticket } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatDateShort, formatMinute, formatWeekday, todayIso } from "@/lib/domain/time";
import { RouteRibbon } from "@/components/rail/RouteRibbon";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/components/ui/cn";
import { useLocale } from "@/lib/i18n/useLocale";

const STATUS_TONE = {
  confirmed: "text-ok",
  partiallyConfirmed: "text-warn",
  waitlist: "text-danger",
  cancelled: "text-faint",
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
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6">
      <h1 className="mb-5 text-[1.375rem] tracking-[-0.01em]">{t("trips.title")}</h1>

      {data.bookings.length === 0 ? (
        <div className="card p-10 text-center">
          <Ticket className="mx-auto mb-3 size-5 text-faint" aria-hidden />
          <p className="text-[0.9375rem] text-text">{t("trips.none")}</p>
          <Link href="/" className="mt-2 inline-block text-[0.8125rem] text-brand underline decoration-dotted underline-offset-2">
            {t("trips.findTrain")}
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
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
      <h2 className="eyebrow mb-2.5">{title}</h2>
      {bookings.length === 0 ? (
        <p className="text-[0.8125rem] text-faint">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {bookings.map((booking) => (
            <li key={booking.pnr}>
              <Link
                href={`/trips/${booking.pnr}`}
                className={cn("card block p-4 transition-colors hover:border-border-strong", booking.status === "cancelled" && "opacity-60")}
              >
                <div className="mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="tnum text-[0.75rem] text-faint">{booking.trainNumber}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-text">{booking.trainName}</span>
                  <span className={cn("text-[0.75rem] capitalize", STATUS_TONE[booking.status])}>
                    {booking.status === "partiallyConfirmed" ? "Partly confirmed" : booking.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-dim">
                  <span className="tnum text-text">{formatMinute(booking.boardingMinute)}</span>
                  <span className="truncate">{stations[booking.fromCode]?.name}</span>
                  <ArrowRight className="size-3 shrink-0 text-faint" aria-hidden />
                  <span className="truncate">{stations[booking.toCode]?.name}</span>
                  <span className="ml-auto text-[0.75rem] text-faint">
                    {formatWeekday(booking.journeyDate)} {formatDateShort(booking.journeyDate)}
                  </span>
                </div>

                <p className="mt-2 flex flex-wrap gap-x-3 text-[0.6875rem] text-faint">
                  <span className="tnum tracking-[0.08em]">PNR {booking.pnr}</span>
                  <span className="font-mono">{booking.classCode}</span>
                  <span>
                    {booking.passengers.length} passenger{booking.passengers.length === 1 ? "" : "s"}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
