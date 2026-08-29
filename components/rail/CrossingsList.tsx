"use client";

import type { Crossing, Station } from "@/lib/types";
import { formatMinute } from "@/lib/domain/time";
import { ArrowLeftRight, ChevronsRight, ChevronsLeft } from "lucide-react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/useLocale";
import type { StringKey } from "@/lib/i18n/strings";
import { cn } from "@/components/ui/cn";

const KIND: Record<Crossing["kind"], { icon: typeof ArrowLeftRight; labelKey: StringKey; tone: string }> = {
  crosses: { icon: ArrowLeftRight, labelKey: "crossings.crosses", tone: "text-info" },
  overtakes: { icon: ChevronsRight, labelKey: "crossings.overtakes", tone: "text-ok" },
  overtakenBy: { icon: ChevronsLeft, labelKey: "crossings.overtakenBy", tone: "text-warn" },
};

/** Trains you meet along the way. Pure delight, and genuinely useful on a long run. */
export function CrossingsList({ crossings, stations }: { crossings: Crossing[]; stations: Record<string, Station> }) {
  const { t, locale } = useLocale();
  if (crossings.length === 0) {
    return <p className="text-[0.8125rem] text-faint">{t("crossings.none")}</p>;
  }

  return (
    <ol className="space-y-1.5">
      {crossings.map((crossing, index) => {
        const { icon: Icon, labelKey, tone } = KIND[crossing.kind];
        const stationName = stations[crossing.stationCode]?.name ?? crossing.stationCode;
        return (
          <li key={`${crossing.trainNumber}-${index}`} className="flex items-center gap-2.5">
            <span className="tnum w-11 shrink-0 text-right text-[0.75rem] text-dim">{formatMinute(crossing.atMinute)}</span>
            <Icon className={cn("size-3.5 shrink-0", tone)} aria-hidden />
            <span className="min-w-0 flex-1">
              <Link href={`/trains/${crossing.trainNumber}`} className="text-[0.8125rem] text-dim hover:text-brand">
                <span className="tnum text-brand">{crossing.trainNumber}</span> {crossing.trainName}
              </Link>
              <span className="block text-[0.6875rem] text-faint">
                {locale === "hi" ? `${stationName} के पास ${t(labelKey)}` : `${t(labelKey)} near ${stationName}`}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
