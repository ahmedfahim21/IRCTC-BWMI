"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, GitBranch, MapPinned, Layers, Split } from "lucide-react";
import type { AlternativeGroup, AlternativeItem, AlternativeKind } from "@/lib/domain/alternatives";
import type { Station } from "@/lib/types";
import { formatDateShort } from "@/lib/domain/time";
import { formatRupees } from "./ClassCell";
import { cn } from "@/components/ui/cn";

const ICONS: Record<AlternativeKind, typeof CalendarDays> = {
  nearbyDates: CalendarDays,
  nearbyStations: MapPinned,
  splitTicketing: Split,
  connections: GitBranch,
  classOrQuotaShift: Layers,
};

/**
 * What to do when the journey you asked for is full. An empty results page is a
 * dead end; these are the five things a person would actually try next, worked
 * out for them.
 */
export function AlternativesPanel({
  groups,
  stations,
}: {
  groups: AlternativeGroup[];
  stations: Record<string, Station>;
}) {
  if (groups.length === 0) return null;
  const name = (code: string) => stations[code]?.name ?? code;

  return (
    <section className="space-y-5" aria-label="Alternatives">
      {groups.map((group) => {
        const Icon = ICONS[group.kind];
        return (
          <div key={group.kind}>
            <div className="mb-2.5 flex items-baseline gap-2">
              <Icon className="size-4 shrink-0 translate-y-0.5 text-brand" aria-hidden />
              <div>
                <h3 className="text-[0.9375rem] text-text">{group.title}</h3>
                <p className="mt-0.5 text-[0.75rem] leading-relaxed text-faint">{group.rationale}</p>
              </div>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {group.items.map((item) => (
                <AlternativeCard key={item.id} item={item} stationName={name} />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function brandedHeadline(text: string) {
  const parts = text.split(/(\d{5})/g);
  return parts.map((part, index) =>
    /^\d{5}$/.test(part) ? (
      <span key={index} className="tnum text-brand">
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

function AlternativeCard({
  item,
  stationName,
}: {
  item: AlternativeItem;
  stationName: (code: string) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="card flex h-full flex-col overflow-hidden">
      <Link
        href={`/search?from=${item.fromCode}&to=${item.toCode}&date=${item.dateIso}&quota=${item.quota}`}
        className="flex flex-1 flex-col gap-2 p-3 transition-colors hover:bg-surface-2"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[0.8125rem] text-dim">{brandedHeadline(item.headline)}</span>
          <span className="tnum shrink-0 text-[0.75rem] text-text">{formatRupees(item.fareTotal)}</span>
        </div>
        <p className="text-[0.75rem] text-dim">{item.detail}</p>
        <span className="tnum mt-auto w-fit rounded bg-ok-soft px-1.5 py-0.5 text-[0.6875rem] text-ok">
          {item.availabilityLabel}
        </span>
      </Link>
      <div className="border-t border-border">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-1 px-3 py-1.5 text-[0.6875rem] text-faint hover:text-dim"
        >
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} aria-hidden />
          {open ? "Hide extras" : "Date, stations"}
        </button>
        {open && (
          <div className="space-y-1 px-3 pb-3 text-[0.6875rem] text-dim">
            <p className="text-faint">
              {formatDateShort(item.dateIso)} · {stationName(item.fromCode)} → {stationName(item.toCode)}
            </p>
            {item.tradeoff && <p className="leading-relaxed text-warn">{item.tradeoff}</p>}
          </div>
        )}
      </div>
    </li>
  );
}
