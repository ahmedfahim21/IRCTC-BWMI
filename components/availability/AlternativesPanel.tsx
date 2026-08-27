"use client";

import Link from "next/link";
import { CalendarDays, GitBranch, MapPinned, Layers, Split } from "lucide-react";
import type { AlternativeGroup, AlternativeKind } from "@/lib/domain/alternatives";
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
                <li key={item.id}>
                  <Link
                    href={`/search?from=${item.fromCode}&to=${item.toCode}&date=${item.dateIso}&quota=${item.quota}`}
                    className="card flex h-full flex-col gap-2 p-3 transition-colors hover:border-border-strong"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[0.8125rem] text-text">{item.headline}</span>
                      <span className="tnum shrink-0 text-[0.75rem] text-dim">{formatRupees(item.fareTotal)}</span>
                    </div>

                    <p className="text-[0.75rem] text-dim">{item.detail}</p>

                    <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                      <span className="tnum rounded bg-ok-soft px-1.5 py-0.5 text-[0.6875rem] text-ok">
                        {item.availabilityLabel}
                      </span>
                      <span className="text-[0.6875rem] text-faint">
                        {formatDateShort(item.dateIso)} · {name(item.fromCode)} → {name(item.toCode)}
                      </span>
                    </div>

                    {item.tradeoff && (
                      <p className={cn("text-[0.6875rem] leading-relaxed text-warn")}>{item.tradeoff}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
