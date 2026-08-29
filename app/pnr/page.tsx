"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatDateShort } from "@/lib/domain/time";

/** PNR lookup with no login. Checking a ticket should never need an account. */
export default function PnrLookupPage() {
  const router = useRouter();
  const [pnr, setPnr] = useState("");
  const { data } = useQuery({ queryKey: ["bookings"], queryFn: ({ signal }) => api.bookings(signal) });

  const digits = pnr.trim().length;
  const valid = digits === 10;

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-14 sm:px-6">
      <header className="mb-7">
        <p className="eyebrow mb-2">Ticket status</p>
        <h1 className="text-[1.625rem] leading-none tracking-[-0.02em]">Check a PNR</h1>
        <p className="mt-2.5 text-[0.875rem] leading-relaxed text-dim">
          Ten digits from your ticket. No sign-in, no CAPTCHA.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) router.push(`/trips/${pnr.trim()}`);
        }}
        className="card-raised flex items-center gap-2 p-2"
      >
        <input
          value={pnr}
          onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="1234567890"
          aria-label="PNR number"
          className="tnum h-12 min-w-0 flex-1 bg-transparent px-3 text-[1.1875rem] tracking-[0.16em] text-text outline-none placeholder:tracking-[0.16em] placeholder:text-faint/60"
        />
        <button
          type="submit"
          disabled={!valid}
          className="flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-brand px-5 text-[0.875rem] text-on-brand transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Search className="size-4" aria-hidden />
          Check
        </button>
      </form>
      {/* Says how far along you are, not that you are wrong. */}
      <p className="mt-2 h-4 px-1 text-[0.6875rem] text-faint" aria-live="polite">
        {digits > 0 && !valid && `${10 - digits} more digit${10 - digits === 1 ? "" : "s"}`}
      </p>

      {data && data.bookings.length > 0 && (
        <div className="mt-8">
          <h2 className="eyebrow mb-3">Or try one of these</h2>
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
                      {formatDateShort(booking.journeyDate)}
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
