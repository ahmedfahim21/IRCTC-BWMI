"use client";

import type { Crossing, Station } from "@/lib/types";
import { formatMinute } from "@/lib/domain/time";
import { ArrowLeftRight, ChevronsRight, ChevronsLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";

const KIND = {
  crosses: { icon: ArrowLeftRight, label: "passes the other way", tone: "text-info" },
  overtakes: { icon: ChevronsRight, label: "you overtake", tone: "text-success" },
  overtakenBy: { icon: ChevronsLeft, label: "overtakes you", tone: "text-warning" },
} as const;

/** Trains you meet along the way. Pure delight, and genuinely useful on a long run. */
export function CrossingsList({ crossings, stations }: { crossings: Crossing[]; stations: Record<string, Station> }) {
  if (crossings.length === 0) {
    return <p className="text-[0.8125rem] text-muted-foreground">No other trains on this line meet you today.</p>;
  }

  return (
    <ol className="space-y-1.5">
      {crossings.map((crossing, index) => {
        const { icon: Icon, label, tone } = KIND[crossing.kind];
        return (
          <li key={`${crossing.trainNumber}-${index}`} className="flex items-center gap-2.5">
            <span className="tnum w-11 shrink-0 text-right text-[0.75rem] text-muted-foreground">{formatMinute(crossing.atMinute)}</span>
            <Icon className={cn("size-3.5 shrink-0", tone)} aria-hidden />
            <span className="min-w-0 flex-1">
              <Link href={`/trains/${crossing.trainNumber}`} className="text-[0.8125rem] text-foreground hover:text-primary">
                <span className="tnum text-muted-foreground">{crossing.trainNumber}</span> {crossing.trainName}
              </Link>
              <span className="block text-[0.6875rem] text-muted-foreground">
                {label} near {stations[crossing.stationCode]?.name ?? crossing.stationCode}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
