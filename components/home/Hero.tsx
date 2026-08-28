"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/i18n/useLocale";
import { SearchForm } from "@/components/search/SearchForm";

/**
 * A single photograph, a line of type, and the search. Everything else on this
 * page is below the fold on purpose — the reason people come here is to find a
 * train, and it should be the only thing competing for attention.
 *
 * The image is `priority` because it is the LCP element; every other photograph
 * on the page is lazy.
 */
export function Hero() {
  const { t } = useLocale();
  // A destination card links here with ?to= when it had no origin to search from.
  const destination = useSearchParams().get("to");

  return (
    <section className="relative">
      <div className="relative min-h-[17rem] overflow-hidden sm:min-h-[21rem]">
        <Image
          src="https://media-cdn.tripadvisor.com/media/attractions-splice-spp-720x480/15/70/4d/c0.jpg"
          alt="The Taj Mahal seen across its lawns and flower beds under a bright sky"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/*
          * Three layers rather than one flat wash: a vignette to round the
          * light off at the corners, a vertical scrim to seat the type, and a
          * directional one so the left-hand column reads clearly whatever the
          * photograph is doing behind it.
          */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(130% 100% at 65% 10%, transparent 35%, rgb(0 0 0 / 0.4) 100%)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/45 to-transparent" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/75 via-bg/10 to-transparent" aria-hidden />

        <div className="relative mx-auto flex min-h-[17rem] max-w-6xl flex-col justify-end px-4 pb-14 pt-12 sm:min-h-[21rem] sm:px-6 sm:pb-16 lg:px-8">
          <p className="eyebrow mb-2.5">Indian Railways</p>
          <h1 className="max-w-2xl text-balance text-[1.875rem] leading-[1.05] tracking-[-0.035em] text-text sm:text-[2.5rem]">
            {t("home.heading")}
          </h1>
          <p className="mt-2 max-w-lg text-balance text-[0.875rem] leading-relaxed text-dim sm:text-[0.9375rem]">
            {t("home.sub")}
          </p>
        </div>
      </div>

      {/* Lifted over the seam so the search reads as the point of the page. */}
      {/*
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
