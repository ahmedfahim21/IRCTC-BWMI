"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Utensils } from "lucide-react";
import type { JourneyDto } from "@/lib/api/dto";
import type { QuotaCode, Station } from "@/lib/types";
import { formatDelay, formatDuration, formatMinute } from "@/lib/domain/time";
import { RouteRibbon } from "@/components/rail/RouteRibbon";
import { ClassCell } from "./ClassCell";
import { api } from "@/lib/apiClient";
import { cn } from "@/components/ui/cn";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function JourneyRow({
  journey,
  stations,
  date,
  quota,
}: {
  journey: JourneyDto;
  stations: Record<string, Station>;
  date: string;
  quota: QuotaCode;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { train } = journey;
  const name = (code: string) => stations[code]?.name ?? code;

  const startBooking = async (classCode: string) => {
    setStarting(classCode);
    setError(null);
    try {
      const { draft } = await api.createDraft({
        trainNumber: train.number,
        journeyDate: date,
        fromCode: journey.fromCode,
        toCode: journey.toCode,
        classCode: classCode as JourneyDto["train"]["classes"][number],
        quota,
      });
      router.push(`/book/${draft.draftId}`);
    } catch (cause) {
      // Surface it in place rather than leaving a dead button.
      setStarting(null);
      setError(cause instanceof Error ? cause.message : "Could not start this booking");
    }
  };

  return (
    <article
      className={cn("card overflow-hidden transition-colors", !journey.runsToday && "opacity-55")}
      aria-label={`${train.number} ${train.name}`}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 p-4 pb-3">
        <Link
          href={`/trains/${train.number}?date=${date}`}
          className="group flex min-w-0 items-baseline gap-2"
        >
          <span className="tnum text-[0.8125rem] text-faint">{train.number}</span>
          <span className="truncate text-[0.9375rem] text-text group-hover:text-brand">{train.name}</span>
          <ChevronRight className="size-3.5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {train.hasPantry && (
            <span className="hidden items-center gap-1 text-[0.6875rem] text-faint sm:flex" title="Pantry car">
              <Utensils className="size-3" aria-hidden />
              Pantry
            </span>
          )}
          <span
            className={cn("tnum text-[0.6875rem]", train.avgDelayMins > 30 ? "text-warn" : "text-faint")}
            title="Average arrival delay over the last 30 runs"
          >
            usually {formatDelay(train.avgDelayMins).toLowerCase()}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="tnum text-xl leading-none text-text">{formatMinute(journey.departureMinute)}</span>
          <span className="text-[0.75rem] text-faint">{journey.fromCode}</span>
        </div>

        <div className="min-w-[7rem] flex-1">
          <p className="mb-0.5 text-center text-[0.625rem] text-faint">
            {formatDuration(journey.durationMins)}
            <span className="mx-1.5">·</span>
            {journey.distanceKm} km
          </p>
          <RouteRibbon
            originCode={train.originCode}
            destinationCode={train.destinationCode}
            boardCode={journey.fromCode}
            alightCode={journey.toCode}
            boardAtFraction={journey.boardAtFraction}
            alightAtFraction={journey.alightAtFraction}
          />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="tnum text-xl leading-none text-text">{formatMinute(journey.arrivalMinute)}</span>
          <span className="text-[0.75rem] text-faint">{journey.toCode}</span>
          {journey.daySpan > 1 && (
            <span className="rounded bg-surface-3 px-1 py-0.5 text-[0.625rem] text-dim">+{journey.daySpan - 1}d</span>
          )}
        </div>
      </div>

      <p className="px-4 pb-3 text-[0.6875rem] text-faint">
        {name(journey.fromCode)} → {name(journey.toCode)}
        <span className="mx-2">·</span>
        <span aria-label={`Runs on ${train.runsOn.length} days a week`}>
          {DAY_LETTERS.map((letter, index) => (
            <span
              key={index}
              className={cn("mr-0.5 inline-block w-2.5 text-center", train.runsOn.includes(index) ? "text-dim" : "text-faint/40")}
            >
              {letter}
            </span>
          ))}
        </span>
        {!journey.runsToday && <span className="ml-2 text-warn">Doesn&rsquo;t run on this date</span>}
      </p>

      <div className="-mx-px flex gap-2 overflow-x-auto border-t border-border bg-surface-2 p-3">
        {journey.availability.map((availability) => (
          <ClassCell
            key={availability.classCode}
            availability={availability}
            selected={starting === availability.classCode}
            onSelect={journey.runsToday ? () => startBooking(availability.classCode) : undefined}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="border-t border-danger/30 bg-danger-soft px-4 py-2 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
