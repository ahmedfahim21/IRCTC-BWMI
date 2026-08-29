"use client";

import { Suspense } from "react";
import { useLocale } from "@/lib/i18n/useLocale";
import { LandingMap } from "@/components/map/LandingMap";
import { MapCanvasCard } from "@/components/map/MapCanvasCard";
import { NextTripCard } from "@/components/trip/NextTripCard";
import { Hero } from "@/components/home/Hero";
import { Destinations } from "@/components/home/Destinations";

/**
 * A photograph, the search, then the whole network moving.
 *
 * The live map sits directly under the search rather than at the foot of the
 * page: it is the thing this does that nothing else does, so it should be the
 * first thing a new visitor sees after the form. Destinations come after it.
 *
 * Hero is behind a Suspense boundary because it reads search params — both for
 * its own ?to= prefill and for the SearchForm it contains.
 */
export default function HomePage() {
  const { t } = useLocale();

  return (
    <div className="pb-16">
      <Suspense fallback={<div className="min-h-[17rem] sm:min-h-[21rem]" />}>
        <Hero />
      </Suspense>

      <div className="mx-auto mt-6 max-w-6xl px-4 sm:px-6 lg:px-8">
        <NextTripCard />
      </div>

      <section className="mx-auto mt-12 max-w-6xl px-4 sm:mt-16 sm:px-6 lg:px-8" aria-labelledby="network-heading">
        <div className="mb-5">
          <h2 id="network-heading" className="font-display text-[1.375rem] text-text sm:text-[1.625rem]">
            The whole network, right now
          </h2>
          <p className="mt-1 max-w-lg text-[0.875rem] leading-relaxed text-dim">
            Every train running across India this minute. Tap one to follow it stop by stop.
          </p>
        </div>

        {/*
          * Height goes on the card, not the body: the body is `flex-1 min-h-0`,
          * so a height there loses to flex-basis and the map collapses to a
          * 160px letterbox slit.
          */}
        <MapCanvasCard
          label="Live map"
          className="card-raised flex h-[26rem] flex-col sm:h-[32rem] lg:h-[38rem]"
          expandLabel={t("home.mapExpand")}
          collapseLabel={t("home.mapCollapse")}
        >
          <LandingMap />
        </MapCanvasCard>
      </section>

      <Destinations className="mt-14 sm:mt-20" />

    </div>
  );
}
