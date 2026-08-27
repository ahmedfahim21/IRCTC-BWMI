"use client";

import Link from "next/link";
import { SearchForm } from "@/components/search/SearchForm";
import { NextTripCard } from "@/components/trip/NextTripCard";
import { LayoutGrid, PercentCircle, Armchair, Radar } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * One job. No language modal, no tourism catalogue, no flights and hotels
 * competing for the space — the reason people come here is to get on a train.
 */
const DIFFERENCES = [
  {
    icon: LayoutGrid,
    title: "Every class, at once",
    body: "Sleeper, 3A, 2A and 1A availability for every train on one screen. No clicking a cell to find out.",
  },
  {
    icon: PercentCircle,
    title: "Waitlists with odds",
    body: "Every WL number carries a confirmation chance and the number of past journeys it was read from.",
  },
  {
    icon: Armchair,
    title: "Pick your actual berth",
    body: "A real coach diagram with free berths, not a preference dropdown that disappears into a void.",
  },
  {
    icon: Radar,
    title: "It doesn't end at payment",
    body: "Live position, your platform, where your coach stops on it, and an arrival alarm — in the ticket.",
  },
];

export default function HomePage() {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
      <div className="mb-7 text-center">
        <h1 className="text-balance text-[1.75rem] leading-tight tracking-[-0.02em] text-text sm:text-[2.125rem]">
          {t("home.heading")}
        </h1>
        <p className="mx-auto mt-2.5 max-w-md text-balance text-[0.9375rem] leading-relaxed text-dim">
          {t("home.sub")}
        </p>
      </div>

      <SearchForm />

      <div className="mt-6">
        <NextTripCard />
      </div>

      <div className="mt-14">
        <h2 className="eyebrow mb-4 text-center">{t("home.differences")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {DIFFERENCES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="card p-4">
              <Icon className="mb-2.5 size-4 text-brand" aria-hidden />
              <h3 className="text-[0.875rem] text-text">{title}</h3>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-dim">{body}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-10 text-center text-[0.75rem] leading-relaxed text-faint">
        <span className="text-dim">
          An independent redesign concept. This is not the official IRCTC service, is not
          affiliated with IRCTC or Indian Railways, and cannot issue a real ticket — payment is
          simulated and no reservation is made.
        </span>
        <br />
        Live timetables, running positions and station data come from the RailRadar API; seat
        availability, fares and confirmation odds are modelled.
        <br />
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
