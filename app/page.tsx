"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/useLocale";
import { LandingMap } from "@/components/map/LandingMap";
import { MapCanvasCard } from "@/components/map/MapCanvasCard";
import { NextTripCard } from "@/components/trip/NextTripCard";
import { SearchForm } from "@/components/search/SearchForm";

/**
 * Map-first booking: the search is the first thing a thumb reaches; the live
 * network sits beside it as a framed card, not a full-bleed rail.
 */
export default function HomePage() {
  const { t } = useLocale();

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <header className="mb-6 max-w-3xl">
        <p className="eyebrow mb-2">Indian Railways</p>
        <h1 className="text-balance text-[1.625rem] leading-tight tracking-[-0.02em] text-text sm:text-[1.875rem]">
          {t("home.heading")}
        </h1>
        <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-dim">{t("home.sub")}</p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 max-w-3xl space-y-4">
          <SearchForm />
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

        <aside className="lg:sticky lg:top-20">
          <MapCanvasCard
            label="Live map"
            expandLabel={t("home.mapExpand")}
            collapseLabel={t("home.mapCollapse")}
            bodyClassName="h-[20rem] min-h-[16rem]"
          >
            <LandingMap />
          </MapCanvasCard>
        </aside>
      </div>
    </div>
  );
}
