"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Utensils } from "lucide-react";
import type { JourneyDto } from "@/lib/api/dto";
import type { QuotaCode, Station } from "@/lib/types";
import { formatDelay, formatDuration, formatMinute } from "@/lib/domain/time";
import { RouteRibbon } from "@/components/rail/RouteRibbon";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClassCell } from "./ClassCell";
import { api } from "@/lib/apiClient";
import { cn } from "@/components/ui/cn";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function JourneyRow({
  journey,
  stations,
  date,
  quota,
  selected = false,
  onSelect,
}: {
  journey: JourneyDto;
  stations: Record<string, Station>;
  date: string;
  quota: QuotaCode;
  selected?: boolean;
  onSelect?: () => void;
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
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-colors",
        !journey.runsToday && "opacity-55",
        selected && "border-primary"
      )}
      aria-label={`${train.number} ${train.name}`}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5 p-4 pb-3">
        <Link
          href={`/trains/${train.number}?date=${date}`}
          className="group flex min-w-0 items-baseline gap-2"
        >
          <span className="tnum text-[0.8125rem] text-muted-foreground">{train.number}</span>
          <span className="truncate text-[0.9375rem] text-foreground group-hover:text-primary">{train.name}</span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>

        <div className="ml-auto flex items-center gap-3">
          {train.hasPantry && (
            <Tooltip>
              <TooltipTrigger asChild aria-label="Pantry car">
                <button type="button" className="hidden items-center gap-1 border-0 bg-transparent p-0 text-[0.6875rem] text-muted-foreground sm:inline-flex">
                  <Utensils className="size-3" aria-hidden />
                  Pantry
                </button>
              </TooltipTrigger>
              <TooltipContent>Pantry car</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild aria-label="Average arrival delay over the last 30 runs">
              <button
                type="button"
                className={cn("tnum border-0 bg-transparent p-0 text-[0.6875rem]", train.avgDelayMins > 30 ? "text-warning" : "text-muted-foreground")}
              >
                usually {formatDelay(train.avgDelayMins).toLowerCase()}
              </button>
            </TooltipTrigger>
            <TooltipContent>Average arrival delay over the last 30 runs</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="tnum text-xl leading-none text-foreground">{formatMinute(journey.departureMinute)}</span>
          <span className="text-[0.75rem] text-muted-foreground">{journey.fromCode}</span>
        </div>

        <div className="min-w-[7rem] flex-1">
          <p className="mb-0.5 text-center text-[0.625rem] text-muted-foreground">
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
          <span className="tnum text-xl leading-none text-foreground">{formatMinute(journey.arrivalMinute)}</span>
          <span className="text-[0.75rem] text-muted-foreground">{journey.toCode}</span>
          {journey.daySpan > 1 && (
            <span className="rounded bg-secondary px-1 py-0.5 text-[0.625rem] text-muted-foreground">+{journey.daySpan - 1}d</span>
          )}
        </div>
      </div>

      <p className="px-4 pb-3 text-[0.6875rem] text-muted-foreground">
        {name(journey.fromCode)} → {name(journey.toCode)}
        <span className="mx-2">·</span>
        <span aria-label={`Runs on ${train.runsOn.length} days a week`}>
          {DAY_LETTERS.map((letter, index) => (
            <span
              key={index}
              className={cn("mr-0.5 inline-block w-2.5 text-center", train.runsOn.includes(index) ? "text-muted-foreground" : "text-muted-foreground/40")}
            >
              {letter}
            </span>
          ))}
        </span>
        {!journey.runsToday && <span className="ml-2 text-warning">Doesn&rsquo;t run on this date</span>}
      </p>

      <ScrollArea className="-mx-px border-t border-border bg-muted">
        <div className="flex gap-2 p-3">
        {journey.availability.map((availability) => (
          <ClassCell
            key={availability.classCode}
            availability={availability}
            selected={starting === availability.classCode}
            onSelect={journey.runsToday ? () => startBooking(availability.classCode) : undefined}
          />
        ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {error && (
        <p role="alert" className="border-t border-destructive/30 bg-destructive-soft px-4 py-2 text-[0.75rem] text-destructive">
          {error}
        </p>
      )}
    </article>
  );
}
