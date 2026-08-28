"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { ScheduleStop, Station } from "@/lib/types";
import { typeColourVar } from "@/lib/railradar/trainTypes";
import { RailSpine } from "@/components/rail/RailSpine";
import type { MapTrain } from "@/components/map/TrainLayer";
import { cn } from "@/components/ui/cn";

export function TrainCallout({
  train,
  typeName,
  compact = false,
  onClose,
  schedule,
  stations,
  dateIso,
  className,
}: {
  train: MapTrain;
  typeName?: string;
  compact?: boolean;
  onClose: () => void;
  schedule?: ScheduleStop[];
  stations?: Record<string, Station>;
  dateIso?: string;
  className?: string;
}) {
  const originCode = schedule?.[0]?.stationCode ?? "";

  return (
    <div
      className={cn(
        "absolute inset-x-2 bottom-2 z-20 max-h-[45%] overflow-y-auto rounded-xl border border-border bg-surface p-3 shadow-[var(--shadow-lg)] sm:inset-x-2.5 sm:bottom-2.5",
        !compact && "sm:left-2.5 sm:right-auto sm:w-[22rem]",
        className
      )}
      role="dialog"
      aria-label={`Train ${train.number} ${train.name}`}
    >
      <div className="mb-1.5 flex items-start gap-2">
        <span
          className="mt-1.5 size-2 shrink-0 rounded-full"
          style={{ background: typeColourVar(train.type) }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2">
            <span className="tnum text-[0.8125rem] text-brand">{train.number}</span>
            <span className="truncate text-[0.8125rem] text-dim">{train.name}</span>
          </p>
          {typeName && (
            <p className="mt-0.5 text-[0.6875rem] text-faint">
              {typeName}
              {!compact && " · moving now"}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-md p-1 text-faint transition-colors hover:text-text"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {!compact && schedule && stations && dateIso && (
        <div className="mb-3 max-h-48 overflow-y-auto">
          <RailSpine schedule={schedule} stations={stations} dateIso={dateIso} />
        </div>
      )}

      <div className={cn("flex gap-2", compact && "mt-1")}>
        <Link
          href={`/trains/${train.number}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-[0.8125rem] text-on-brand transition-opacity hover:opacity-90"
        >
          Full route
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        {!compact && originCode && (
          <Link
            href={`/?from=${originCode}`}
            className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-[0.8125rem] text-dim hover:text-text"
          >
            Search from here
          </Link>
        )}
      </div>
    </div>
  );
}
