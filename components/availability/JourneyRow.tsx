"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronRight, Utensils } from "lucide-react";
import type { JourneyDto } from "@/lib/api/dto";
import type { Availability, QuotaCode, Station } from "@/lib/types";
import { formatDelay, formatDuration, formatMinute } from "@/lib/domain/time";
import { ClassCell, formatRupees } from "./ClassCell";
import { TrainSilhouette, TRAIN_TYPE_LABEL, TRAIN_TYPE_TONE } from "./TrainSilhouette";
import { api } from "@/lib/apiClient";
import { cn } from "@/components/ui/cn";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

const FARE_TONE = {
  available: "text-ok",
  rac: "text-warn",
  waitlist: "text-danger",
  regretted: "text-faint",
  notAvailable: "text-faint",
  departed: "text-faint",
} as const;

function isBookable(availability: Availability): boolean {
  return availability.state === "available" || availability.state === "rac" || availability.state === "waitlist";
}

function fromFare(availability: Availability[]): Availability | null {
  if (availability.length === 0) return null;
  const bookable = availability.filter(isBookable);
  const pool = bookable.length > 0 ? bookable : availability;
  return pool.reduce((best, entry) => (entry.fare.total < best.fare.total ? entry : best));
}

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
  const fare = fromFare(journey.availability);

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
        flush ? "border-b border-border last:border-b-0" : "card border-l-[3px]",
        !journey.runsToday && "opacity-55",
        selected && (flush ? "bg-brand-soft" : "border-brand")
      )}
      style={flush ? undefined : { borderLeftColor: TRAIN_TYPE_TONE[train.type].color }}
      aria-label={`${train.number} ${train.name}`}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
    >
      <div className="relative isolate overflow-hidden">
      <TrainSilhouette type={train.type} />

      <div className="relative z-[1] flex items-baseline gap-2 pl-5 pr-4 pt-3">
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
          <span className="ml-auto shrink-0 text-[0.6875rem] text-warn">Doesn&rsquo;t run this date</span>
        )}
      </div>

      <div className="relative z-[1] flex flex-wrap items-end gap-3 pl-5 pr-4 py-2.5">
        <div className="flex shrink-0 items-end gap-3">
          <div className="min-w-[4.5rem]">
            <p className="tnum text-[1.5rem] leading-none text-text">{formatMinute(journey.departureMinute)}</p>
            <p className="mt-1 font-mono text-[0.6875rem] tracking-wide text-faint">{journey.fromCode}</p>
          </div>

          <div className="w-[5.25rem] shrink-0 pb-1">
            <p className="mb-1 text-center text-[0.6875rem] text-faint">{formatDuration(journey.durationMins)}</p>
            <div className="h-0.5 rounded-full bg-brand" aria-hidden />
          </div>

          <div className="min-w-[4.5rem] text-right">
            <p className="tnum text-[1.5rem] leading-none text-text">
              {formatMinute(journey.arrivalMinute)}
              {journey.daySpan > 1 && (
                <span className="ml-1 align-top text-[0.625rem] text-dim">+{journey.daySpan - 1}</span>
              )}
            </p>
            <p className="mt-1 font-mono text-[0.6875rem] tracking-wide text-faint">{journey.toCode}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-1.5 pb-0.5">
          {journey.availability.map((availability) => (
            <ClassCell
              key={availability.classCode}
              compact
              className="w-auto min-w-[5.5rem] flex-1 basis-[5.5rem]"
              availability={availability}
              selected={starting === availability.classCode}
              onSelect={journey.runsToday ? () => startBooking(availability.classCode) : undefined}
            />
          ))}
        </div>

        {fare && (
          <div className="w-[6.25rem] shrink-0 border-l border-border pl-3 text-right">
            <p className={cn("inline-block rounded-md px-1.5 py-0.5 text-[0.625rem] leading-none", TRAIN_TYPE_TONE[train.type].chip)}>
              {TRAIN_TYPE_LABEL[train.type]}
            </p>
            <p className="tnum mt-1.5 text-[1.25rem] leading-none text-text">{formatRupees(fare.fare.total)}</p>
            <p className="mt-1 truncate text-[0.6875rem] text-dim">
              from {fare.classCode}
              <span className="text-faint"> · </span>
              <span className={FARE_TONE[fare.state]}>{fare.label}</span>
            </p>
          </div>
        )}
      </div>
      </div>

      <div className="relative z-10 border-t border-border bg-surface">
        <button
          type="button"
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
          className="flex w-full items-center gap-1 px-4 py-1.5 pl-5 text-[0.6875rem] text-faint hover:text-dim"
        >
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} aria-hidden />
          {open ? "Hide extras" : "Days, delay, stations"}
        </button>
        {open && (
          <div className="space-y-1.5 px-4 pb-3 pl-5 text-[0.6875rem] text-dim">
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
        <p role="alert" className="relative border-t border-danger/30 bg-danger-soft px-4 py-2 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </article>
  );
}
