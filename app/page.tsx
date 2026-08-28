"use client";

import { Suspense } from "react";
import Link from "next/link";
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
          <h2 id="network-heading" className="text-[1.25rem] tracking-[-0.02em] text-text sm:text-[1.5rem]">
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

      <p className="mx-auto mt-12 max-w-2xl px-4 text-center text-[0.6875rem] leading-relaxed text-faint sm:px-6">
        <span className="text-dim">
          An independent redesign concept. This is not the official IRCTC service, is not affiliated
          with IRCTC or Indian Railways, and cannot issue a real ticket — payment is simulated and no
          reservation is made.
        </span>
        <br />
        Live timetables, running positions and station data come from the RailRadar API; seat
        availability, fares and confirmation odds are modelled. Destination photography belongs to its
        respective owners.{" "}
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
  );
}
