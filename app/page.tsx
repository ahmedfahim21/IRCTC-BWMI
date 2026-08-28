"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/useLocale";
import { LandingMap } from "@/components/map/LandingMap";
import { MapCanvasCard } from "@/components/map/MapCanvasCard";
import { NextTripCard } from "@/components/trip/NextTripCard";
import { SearchForm } from "@/components/search/SearchForm";

/**
 * Book: a compact search panel beside a live map that fills the rest of the
 * screen, matching the search-results split rather than a tall stacked form.
 */
export default function HomePage() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <header className="shrink-0 px-4 pt-5 sm:px-6 lg:px-8">
        <p className="eyebrow mb-1">Indian Railways</p>
        <h1 className="text-[1.375rem] tracking-[-0.02em] text-text sm:text-[1.5rem]">{t("home.heading")}</h1>
        <p className="mt-1 max-w-xl text-[0.875rem] text-dim">{t("home.sub")}</p>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(26rem,0.95fr)] lg:px-8">
        <div className="flex min-w-0 flex-col gap-4 lg:overflow-y-auto lg:pb-8">
          <SearchForm variant="panel" />
          <NextTripCard />
          <p className="text-[0.6875rem] leading-relaxed text-faint">
            An independent redesign concept. This is not the official IRCTC service, is not affiliated
            with IRCTC or Indian Railways, and cannot issue a real ticket — payment is simulated and no
            reservation is made. Live timetables, running positions and station data come from the
            RailRadar API; seat availability, fares and confirmation odds are modelled.{" "}
            <Link href="/pnr" className="underline decoration-dotted underline-offset-2 hover:text-dim">
              Look up a PNR
            </Link>{" "}
            or{" "}
            <Link href="/trips" className="underline decoration-dotted underline-offset-2 hover:text-dim">
              see the demo trips
            </Link>
            .
          </p>
        </div>

        <aside className="min-h-[16rem] lg:min-h-0">
          <MapCanvasCard
            label="Live map"
            className="flex h-full min-h-[16rem] flex-col lg:min-h-0"
            expandLabel={t("home.mapExpand")}
            collapseLabel={t("home.mapCollapse")}
            bodyClassName="h-[20rem] min-h-[16rem] lg:h-auto lg:min-h-0 lg:flex-1"
          >
            <LandingMap />
          </MapCanvasCard>
        </aside>
      </div>
    </div>
  );
}
