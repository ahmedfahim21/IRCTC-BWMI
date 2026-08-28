"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, TrainFront, Utensils } from "lucide-react";
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
  selected = false,
  onSelect,
  flush = false,
}: {
  journey: JourneyDto;
  stations: Record<string, Station>;
  date: string;
  quota: QuotaCode;
  selected?: boolean;
  onSelect?: () => void;
  flush?: boolean;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
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
      setStarting(null);
      setError(cause instanceof Error ? cause.message : "Could not start this booking");
    }
  };

  return (
    <article
      className={cn(
        "overflow-hidden transition-colors",
        flush ? "border-b border-border last:border-b-0" : "card",
        !journey.runsToday && "opacity-55",
        selected && (flush ? "bg-brand-soft" : "border-brand")
      )}
      aria-label={`${train.number} ${train.name}`}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 px-4 pt-3">
        <TrainFront className="size-3.5 shrink-0 text-brand" aria-hidden />
        <Link
          href={`/trains/${train.number}?date=${date}`}
          className="group flex min-w-0 items-baseline gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="tnum text-[0.8125rem] text-brand">{train.number}</span>
          <span className="truncate text-[0.8125rem] text-dim group-hover:text-brand">{train.name}</span>
          <ChevronRight className="size-3 shrink-0 text-faint transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
        {!journey.runsToday && (
          <span className="ml-auto text-[0.6875rem] text-warn">Doesn&rsquo;t run this date</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
        <div className="min-w-[4.5rem]">
          <p className="tnum text-[1.375rem] leading-none text-text">{formatMinute(journey.departureMinute)}</p>
          <p className="mt-1 font-mono text-[0.6875rem] tracking-wide text-faint">{journey.fromCode}</p>
        </div>

        <div className="min-w-[6.5rem] flex-1">
          <p className="mb-0.5 text-center text-[0.6875rem] text-faint">{formatDuration(journey.durationMins)}</p>
          <RouteRibbon
            originCode={train.originCode}
            destinationCode={train.destinationCode}
            boardCode={journey.fromCode}
            alightCode={journey.toCode}
            boardAtFraction={journey.boardAtFraction}
            alightAtFraction={journey.alightAtFraction}
          />
        </div>

        <div className="min-w-[4.5rem] text-right">
          <p className="tnum text-[1.375rem] leading-none text-text">
            {formatMinute(journey.arrivalMinute)}
            {journey.daySpan > 1 && (
              <span className="ml-1 align-top text-[0.625rem] text-dim">+{journey.daySpan - 1}</span>
            )}
          </p>
          <p className="mt-1 font-mono text-[0.6875rem] tracking-wide text-faint">{journey.toCode}</p>
        </div>
      </div>

      <div className="-mx-px flex gap-1.5 overflow-x-auto border-t border-border px-3 py-2">
        {journey.availability.map((availability) => (
          <ClassCell
            key={availability.classCode}
            compact
            availability={availability}
            selected={starting === availability.classCode}
            onSelect={journey.runsToday ? () => startBooking(availability.classCode) : undefined}
          />
        ))}
      </div>

      <div className="border-t border-border">
        <button
          type="button"
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          className="flex w-full items-center gap-1 px-4 py-1.5 text-[0.6875rem] text-faint hover:text-dim"
        >
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} aria-hidden />
          {open ? "Hide extras" : "Days, delay, stations"}
        </button>
        {open && (
          <div className="space-y-1.5 px-4 pb-3 text-[0.6875rem] text-dim">
            <p>
              {name(journey.fromCode)} → {name(journey.toCode)}
              <span className="mx-1.5 text-faint">·</span>
              {journey.distanceKm} km
            </p>
            <p aria-label={`Runs on ${train.runsOn.length} days a week`}>
              {DAY_LETTERS.map((letter, index) => (
                <span
                  key={index}
                  className={cn("mr-0.5 inline-block w-2.5 text-center", train.runsOn.includes(index) ? "text-dim" : "text-faint/40")}
                >
                  {letter}
                </span>
              ))}
              <span className={cn("ml-2", train.avgDelayMins > 30 ? "text-warn" : "text-faint")}>
                usually {formatDelay(train.avgDelayMins).toLowerCase()}
              </span>
            </p>
            {train.hasPantry && (
              <p className="flex items-center gap-1 text-faint">
                <Utensils className="size-3" aria-hidden />
                Pantry car
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="border-t border-danger/30 bg-danger-soft px-4 py-2 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
