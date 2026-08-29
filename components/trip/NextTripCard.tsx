"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, MapPin, Train as TrainIcon } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatDelay, formatMinute, journeyInstant, todayIso } from "@/lib/domain/time";
import { RouteRibbon } from "@/components/rail/RouteRibbon";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/components/ui/cn";

function countdown(ms: number, locale: "en" | "hi", departedLabel: string): string {
  if (ms <= 0) return departedLabel;
  const mins = Math.floor(ms / 60000);
  const inWord = locale === "hi" ? "में" : "in";
  if (mins < 60) return locale === "hi" ? `${mins} मिनट ${inWord}` : `${inWord} ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === "hi" ? `${hours}घं ${mins % 60}मि ${inWord}` : `${inWord} ${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return locale === "hi"
    ? `${days} दिन ${inWord}`
    : `${inWord} ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * The reason to open this app on a day you aren't booking anything. IRCTC
 * forgets you the moment you pay; this is the other half of the product.
 */
export function NextTripCard() {
  const { t, locale } = useLocale();
  const today = todayIso();

  const { data: list, isPending: listPending } = useQuery({
    queryKey: ["bookings"],
    queryFn: ({ signal }) => api.bookings(signal),
  });

  const next = list?.bookings.find((b) => b.status !== "cancelled" && b.journeyDate >= today);

  const { data: trip } = useQuery({
    queryKey: ["trip", next?.pnr],
    queryFn: ({ signal }) => api.trip(next!.pnr, signal),
    enabled: Boolean(next),
    // Live position moves; poll it while this card is on screen.
    refetchInterval: 20_000,
  });

  if (listPending) return <Skeleton className="h-40 w-full rounded-[14px]" />;
  if (!next) return null;

  const station = (code: string) => list?.stations[code]?.name ?? code;
  const departureMs = journeyInstant(next.journeyDate, next.boardingMinute);
  const delay = trip?.boardingDelayMins ?? 0;
  const live = trip?.live;
  const isRunning = live?.state === "running" || live?.state === "halted";

  return (
    <Link
      href={`/trips/${next.pnr}`}
      className="card group block p-4 transition-colors hover:border-border-strong sm:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        {isRunning ? (
          <span className="relative flex items-center gap-1.5 text-ok">
            <span className="live-ring relative inline-flex size-1.5 rounded-full bg-ok" aria-hidden />
            <span className="text-[0.6875rem] uppercase tracking-wider">{t("trip.runningNow")}</span>
          </span>
        ) : (
          <span className="eyebrow">{t("home.upcoming")}</span>
        )}
        <span className="ml-auto tnum text-[0.75rem] text-faint">
          {countdown(departureMs - Date.now(), locale, t("trip.departed"))}
        </span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[0.9375rem] text-text">
            <TrainIcon className="size-4 shrink-0 text-faint" aria-hidden />
            <span className="tnum text-faint">{next.trainNumber}</span>
            <span className="truncate">{next.trainName}</span>
          </p>
          <p className="mt-1 truncate text-[0.8125rem] text-dim">
            {station(next.fromCode)} <ArrowRight className="inline size-3 text-faint" aria-hidden /> {station(next.toCode)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tnum text-lg text-text">{formatMinute(next.boardingMinute)}</p>
          <p className={cn("tnum text-[0.6875rem]", delay > 5 ? "text-warn" : "text-ok")}>{formatDelay(delay, locale)}</p>
        </div>
      </div>

      {trip && (
        <>
          <RouteRibbon
            className="mt-4"
            originCode={trip.train.schedule[0].stationCode}
            destinationCode={trip.train.schedule[trip.train.schedule.length - 1].stationCode}
            boardCode={next.fromCode}
            alightCode={next.toCode}
            boardAtFraction={trip.boardingStop.distanceKm / trip.train.distanceKm}
            alightAtFraction={trip.alightingStop.distanceKm / trip.train.distanceKm}
            liveFraction={isRunning ? live!.distanceCoveredKm / trip.train.distanceKm : null}
          />

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-[0.75rem]">
            <span className="flex items-center gap-1.5 text-dim">
              <MapPin className="size-3.5 text-faint" aria-hidden />
              {t("common.platform")} <span className="tnum text-text">{trip.boardingStop.platform ?? "—"}</span>
            </span>
            {trip.coachPosition && (
              <span className="flex items-center gap-1.5 text-dim">
                {t("trip.coach")} <span className="tnum text-text">{trip.coachPosition.coach.code}</span>
                <span className="text-faint">
                  {" "}
                  ·{" "}
                  {locale === "hi"
                    ? `पुल से ${trip.coachPosition.distanceFromEntryM} मी.`
                    : `${trip.coachPosition.distanceFromEntryM} m from the bridge`}
                </span>
              </span>
            )}
            <span className="ml-auto flex items-center gap-1.5 text-faint">
              <Clock className="size-3.5" aria-hidden />
              {t(trip.booking.chartStatus === "prepared" ? "trip.chartPrepared" : "trip.chartNotPrepared")}
            </span>
          </div>
        </>
      )}
    </Link>
  );
}
