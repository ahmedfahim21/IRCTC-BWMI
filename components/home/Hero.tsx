"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/useLocale";
import { SearchForm } from "@/components/search/SearchForm";
import { HERO_FRAMES, HERO_FRAME_MS } from "@/lib/heroFrames";
import { cn } from "@/components/ui/cn";
import { Flourish } from "@/components/ui/Ornament";

/**
 * Indian Railways, photographed, and the search floating on top of it.
 * Everything else on this page is below the fold on purpose — the reason
 * people come here is to find a train.
 *
 * The plate is cinematic rather than tinted-to-page-background: white type on
 * a dark scrim. A photograph that dissolves into the page's near-white leaves
 * nothing to look at, and the hero is the one place a dark treatment on a
 * light site is a composition rather than a bug.
 *
 * The scrim is painted on the element that *contains* the type, not a sibling
 * overlay, and written as literal rgba rather than Tailwind's gradient
 * utilities — those compile to color-mix() in oklab, which the contrast audit
 * cannot parse, so white-on-scrim gets measured as white-on-page and fails.
 *
 * The first frame is `priority` because it is the LCP element. The rest load
 * lazily and only ever cross-fade over it.
 */
export function Hero() {
  const { t, locale } = useLocale();
  // A destination card links here with ?to= when it had no origin to search from.
  const destination = useSearchParams().get("to");

  const [frame, setFrame] = useState(0);
  const [animate, setAnimate] = useState(false);
  // Paused once someone picks a frame themselves — taking the wheel away again
  // two seconds later is the kind of carousel everybody hates.
  const [paused, setPaused] = useState(false);

  /*
   * Motion is opt-in, not opt-out: the carousel starts still and only begins
   * once we have confirmed on the client that reduced motion is not requested.
   * Deciding this during render would mismatch the server HTML.
   */
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAnimate(!query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!animate || paused) return;
    const id = window.setInterval(
      () => setFrame((current) => (current + 1) % HERO_FRAMES.length),
      HERO_FRAME_MS
    );
    return () => window.clearInterval(id);
  }, [animate, paused]);

  return (
    <section className="relative">
      <div className="relative min-h-[19rem] overflow-hidden bg-neutral-950 sm:min-h-[24rem]">
        {HERO_FRAMES.map((item, index) => {
          const showing = index === frame;
          return (
            <div
              key={item.src}
              aria-hidden={!showing}
              className={cn(
                "absolute inset-0 transition-opacity duration-[1400ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                showing ? "opacity-100" : "opacity-0"
              )}
            >
              <Image
                src={item.src}
                alt={showing ? item.alt : ""}
                fill
                priority={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                sizes="100vw"
                quality={82}
                style={{ objectPosition: item.focus }}
                /*
                 * A slow push-in on the frame that is showing. It is the
                 * difference between a slideshow and something that feels
                 * alive, and at 1.08 over six seconds it is barely perceptible
                 * — which is the point.
                 */
                className={cn(
                  "object-cover transition-transform duration-[7000ms] ease-linear motion-reduce:transition-none motion-reduce:scale-100",
                  showing && animate ? "scale-[1.08]" : "scale-100"
                )}
              />
            </div>
          );
        })}

        {/* Rounds the light off at the corners so the plate has a lens to it. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 95% at 62% 12%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.45) 100%)",
          }}
          aria-hidden
        />
        {/* Fine grain, which reads as photography and hides the softness of the two smaller frames. */}
        <div className="pointer-events-none absolute inset-0 grain" aria-hidden />

        <div
          className="absolute inset-x-0 bottom-0 pt-44"
          /*
           * Literal rgba, on the type's own element — see the note above. The
           * type sits in the bottom third where this is at least 0.82 opaque,
           * so white over it clears AA regardless of the photograph.
           */
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.82) 26%, rgba(0,0,0,0.5) 58%, rgba(0,0,0,0) 100%)",
          }}
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-14 text-center sm:px-6 sm:pb-16 lg:px-8">
            <Flourish className="mb-3 text-white/70" />
            <p className="flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.14em] text-neutral-300">
              <span className="h-px w-8 bg-white/30" aria-hidden />
              {t("home.eyebrow")}
              <span className="h-px w-8 bg-white/30" aria-hidden />
            </p>
            <h1 className="font-display mt-2.5 max-w-2xl text-balance text-[2rem] leading-[1.08] text-white sm:text-[2.75rem]">
              {t("home.heading")}
            </h1>
            <p className="mt-2.5 max-w-lg text-balance text-[0.875rem] leading-relaxed text-neutral-200 sm:text-[0.9375rem]">
              {t("home.sub")}
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              {HERO_FRAMES.map((item, index) => (
                <button
                  key={item.src}
                  type="button"
                  onClick={() => {
                    setFrame(index);
                    setPaused(true);
                  }}
                  aria-current={index === frame ? "true" : undefined}
                  aria-label={
                    locale === "hi"
                      ? `तस्वीर ${index + 1} में से ${HERO_FRAMES.length} दिखाएँ`
                      : `Show photograph ${index + 1} of ${HERO_FRAMES.length}`
                  }
                  className={cn(
                    "h-[3px] rounded-full transition-all duration-500",
                    index === frame
                      ? "w-8 bg-white"
                      : "w-4 bg-white/40 hover:bg-white/70"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Screen readers get the change announced; the photographs are decoration to them otherwise. */}
        <p className="sr-only" role="status">
          {HERO_FRAMES[frame].alt}
        </p>
      </div>

      {/*
        * Lifted over the seam so the search reads as the point of the page,
        * and so the panel lands on the darkest part of the scrim.
        *
        * The hero earns its place but must not push the search below the fold —
        * it was starting at 554px, which left only the two station fields
        * visible on a 700px laptop and hid the button entirely.
        */}
      <div className="relative z-10 mx-auto -mt-8 max-w-6xl px-4 sm:-mt-10 sm:px-6 lg:px-8">
        <div className="card-floating p-1.5 sm:p-2">
          <SearchForm variant="panel" prefillTo={destination} />
        </div>
      </div>
    </section>
  );
}
