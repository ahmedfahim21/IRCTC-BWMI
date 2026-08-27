"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchForm } from "@/components/search/SearchForm";
import { NextTripCard } from "@/components/trip/NextTripCard";
import { LandingMap } from "@/components/map/LandingMap";
import { useLocale } from "@/lib/i18n/useLocale";
import { ChevronDown } from "lucide-react";
import { cn } from "@/components/ui/cn";

/**
 * Map-first booking: the search is the first thing a thumb reaches; the live
 * network sits beside it on a wide screen and folds away on a phone.
 */
export default function HomePage() {
  const { t } = useLocale();
  const [mapOpen, setMapOpen] = useState(false);

  return (
    <div className="lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(20rem,28rem)_1fr]">
      <div className="flex min-h-0 flex-col overflow-y-auto px-4 pb-8 pt-6 sm:px-6 lg:pt-10">
        <header className="mb-6">
          <p className="eyebrow mb-2">Indian Railways</p>
          <h1 className="text-balance text-[1.625rem] leading-tight tracking-[-0.02em] text-text sm:text-[1.875rem]">
            {t("home.heading")}
          </h1>
          <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-dim">{t("home.sub")}</p>
        </header>

        <SearchForm />

        <div className="mt-5">
          <NextTripCard />
        </div>

        <p className="mt-8 text-[0.6875rem] leading-relaxed text-faint">
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

      <div className="lg:min-h-0">
        <button
          type="button"
          className="flex w-full items-center justify-between border-y border-border px-4 py-2.5 text-[0.8125rem] text-dim lg:hidden"
          aria-expanded={mapOpen}
          onClick={() => setMapOpen((open) => !open)}
        >
          {mapOpen ? t("home.mapCollapse") : t("home.mapExpand")}
          <ChevronDown className={cn("size-4 transition-transform", mapOpen && "rotate-180")} aria-hidden />
        </button>
        <div className={cn("relative bg-surface-2", mapOpen ? "h-[40vh]" : "h-28", "lg:h-full lg:min-h-0")}>
          <LandingMap />
        </div>
      </div>
    </div>
  );
}
