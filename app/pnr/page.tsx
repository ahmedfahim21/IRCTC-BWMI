"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatDateShort } from "@/lib/domain/time";
import { Flourish } from "@/components/ui/Ornament";
import { useLocale } from "@/lib/i18n/useLocale";

/** PNR lookup with no login. Checking a ticket should never need an account. */
export default function PnrLookupPage() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const [pnr, setPnr] = useState("");
  const { data } = useQuery({ queryKey: ["bookings"], queryFn: ({ signal }) => api.bookings(signal) });

  const digits = pnr.trim().length;
  const valid = digits === 10;

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-14 sm:px-6">
      {/* A single-purpose page earns a centred composition. */}
      <header className="mb-8 flex flex-col items-center text-center">
        <Flourish className="mb-3 text-accent/70" />
        <p className="flex items-center gap-3 text-[0.6875rem] uppercase tracking-[0.14em] text-faint">
          <span className="h-px w-8 bg-border-strong" aria-hidden />
          {t("pnr.eyebrow")}
          <span className="h-px w-8 bg-border-strong" aria-hidden />
        </p>
        <h1 className="font-display mt-2.5 text-[1.875rem] leading-none">{t("pnr.heading")}</h1>
        <p className="mt-2.5 max-w-xs text-[0.875rem] leading-relaxed text-dim">{t("pnr.sub")}</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) router.push(`/trips/${pnr.trim()}`);
        }}
        className="field card-raised flex items-center gap-2 rounded-full p-1.5 pl-3"
      >
        <input
          value={pnr}
          onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="1234567890"
          aria-label="PNR number"
          className="tnum h-12 min-w-0 flex-1 bg-transparent px-2 text-center text-[1.1875rem] tracking-[0.16em] text-text outline-none placeholder:tracking-[0.16em] placeholder:text-faint/60"
        />
        <button
          type="submit"
          disabled={!valid}
          className="btn btn-primary h-12 shrink-0 px-6 text-[0.875rem]"
        >
          <Search className="size-4" aria-hidden />
          {t("pnr.check")}
        </button>
      </form>
      {/* Says how far along you are, not that you are wrong. */}
      <p className="mt-2 h-4 px-1 text-center text-[0.6875rem] text-faint" aria-live="polite">
        {digits > 0 &&
          !valid &&
          `${10 - digits} ${t(10 - digits === 1 ? "pnr.moreDigits" : "pnr.moreDigitsPlural")}`}
      </p>

      {data && data.bookings.length > 0 && (
        <div className="mt-8">
          <h2 className="eyebrow mb-3">{t("pnr.tryThese")}</h2>
          <ul className="space-y-2">
            {data.bookings.map((booking) => (
              <li key={booking.pnr}>
                <Link
                  href={`/trips/${booking.pnr}`}
                  className="card lift group flex items-center gap-3.5 p-3.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="tnum block text-[0.9375rem] tracking-[0.1em] text-text">{booking.pnr}</span>
                    <span className="mt-0.5 block truncate text-[0.75rem] text-faint">
                      <span className="tnum font-mono text-[0.6875rem]">{booking.trainNumber}</span> ·{" "}
                      {data.stations[booking.fromCode]?.name} → {data.stations[booking.toCode]?.name} ·{" "}
                      {formatDateShort(booking.journeyDate, locale)}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
