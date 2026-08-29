"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, LocateFixed, Loader2 } from "lucide-react";
import { DESTINATIONS, localizedDestination } from "@/lib/destinations";
import { addDays, todayIso } from "@/lib/domain/time";
import { useOrigin } from "@/lib/location/useOrigin";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/components/ui/cn";

/**
 * Places, and the station you actually alight at. Each card is a real search —
 * decoration that doesn't do anything is just weight on the page.
 *
 * The origin is whatever we can honestly work out: the station you last
 * searched from, a precise fix if you ask for one, or the coarse city your
 * host derives from the connection. Never a hardcoded Delhi. If we have
 * nothing, the cards say so and offer to find you rather than guessing.
 */
export function Destinations({ className }: { className?: string }) {
  const { t, locale } = useLocale();
  const { station: origin, source, locating, error, useMyLocation } = useOrigin();
  const date = addDays(todayIso(), 7);

  return (
    <section className={cn("mx-auto max-w-6xl px-4 sm:px-6 lg:px-8", className)} aria-labelledby="destinations-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="destinations-heading" className="font-display text-[1.375rem] text-text sm:text-[1.625rem]">
            {t("home.destHeading")}
          </h2>
          <p className="mt-1 text-[0.875rem] text-dim">{t("home.destSub")}</p>
        </div>
        {origin ? (
          <p className="flex flex-wrap items-center gap-x-1.5 text-[0.75rem] text-faint">
            {locale === "hi" ? "यहाँ से" : "From"} <span className="text-dim">{origin.name}</span>
            {source === "coords" && (
              <span className="text-ok">· {locale === "hi" ? "आपके सबसे पास" : "nearest to you"}</span>
            )}
            {source === "network" && (
              <span>· {locale === "hi" ? "आपके कनेक्शन के आधार पर" : "going by your connection"}</span>
            )}
            {source === "recent" && <span>· {locale === "hi" ? "आपकी पिछली खोज" : "your last search"}</span>}
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="btn ml-1 gap-1 border border-border bg-surface px-2 py-0.5 text-[0.6875rem] text-dim hover:border-border-strong hover:text-text disabled:opacity-60"
            >
              {locating ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <LocateFixed className="size-3" aria-hidden />}
              {source === "coords" ? t("home.updateLocation") : t("home.useMyLocation")}
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="btn btn-secondary gap-1.5 px-3 py-1.5 text-[0.75rem] text-dim hover:text-text"
          >
            {locating ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <LocateFixed className="size-3.5" aria-hidden />}
            {t("home.findNearest")}
          </button>
        )}
      </div>

      {error && (
        <p role="status" className="mb-3 text-[0.75rem] text-warn">
          {error}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DESTINATIONS.map((destination, index) => {
          const local = localizedDestination(destination, locale);
          return (
          <li key={destination.slug}>
            <Link
              href={
                origin
                  ? `/search?from=${origin.code}&to=${destination.railhead}&date=${date}&quota=GN`
                  : `/?to=${destination.railhead}`
              }
              className="lift group block overflow-hidden rounded-[14px] border border-border bg-surface shadow-[var(--shadow-md),var(--edge)]"
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-surface-2">
                <Image
                  src={destination.image}
                  alt={destination.alt}
                  fill
                  loading={index < 3 ? "eager" : "lazy"}
                  sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
                  className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                />
                {/*
                  * A tall, smooth scrim — no hard edge. It reaches 88% black
                  * where the text sits and fades to nothing well above it, so
                  * the caption stays legible over a bright frame like the tea
                  * gardens without a band being visible.
                  */}
                <div
                  className="absolute inset-x-0 bottom-0 p-4 pt-16"
                  /*
                   * Written out as rgba rather than Tailwind's gradient
                   * utilities: those compile to color-mix() in oklab, which
                   * neither a canvas nor a contrast checker can parse, so the
                   * scrim became invisible to the audit and white-on-scrim text
                   * was measured as white-on-card.
                   */
                  style={{
                    backgroundImage:
                      "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.62) 45%, rgba(0,0,0,0) 100%)",
                  }}
                >
                  <p className="text-[1.0625rem] leading-tight tracking-[-0.01em] text-white">{local.name}</p>
                  <p className="mt-0.5 text-[0.75rem] text-white">{local.region}</p>
                </div>
              </div>

              {/* A caption, set like one: label, station, then the last leg. */}
              <div className="px-4 pb-3.5 pt-3">
                <p className="text-[0.625rem] uppercase tracking-[0.09em] text-faint">
                  {locale === "hi" ? "यहाँ उतरें" : "Alight at"}
                </p>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[0.875rem] text-text">
                    {local.railheadName}{" "}
                    <span className="tnum font-mono text-[0.6875rem] text-faint">{destination.railhead}</span>
                  </p>
                  <ArrowUpRight
                    className="size-4 shrink-0 self-center text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                    aria-hidden
                  />
                </div>
                <p className="mt-1 border-t border-border pt-1.5 text-[0.75rem] leading-relaxed text-faint">
                  {local.lastLeg
                    ? locale === "hi"
                      ? `फिर ${local.lastLeg}।`
                      : `Then ${local.lastLeg}.`
                    : t("home.destStationIsIt")}
                </p>
              </div>
            </Link>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
