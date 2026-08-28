"use client";

import type { PunctualityDay } from "@/lib/types";
import { formatDateShort } from "@/lib/domain/time";
import { cn } from "@/components/ui/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * How late this train actually ran, over its last 30 outings. Sets expectations
 * honestly rather than quoting a scheduled arrival nobody believes.
 */
export function PunctualitySparkline({ history }: { history: PunctualityDay[] }) {
  if (history.length === 0) return null;

  const delays = history.filter((d) => !d.cancelled).map((d) => d.delayMins);
  const max = Math.max(30, ...delays);
  const median = [...delays].sort((a, b) => a - b)[Math.floor(delays.length / 2)] ?? 0;
  const onTime = delays.filter((d) => d <= 15).length;
  const cancellations = history.filter((d) => d.cancelled).length;

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-[0.8125rem] text-muted-foreground">
          Ran within 15 minutes of schedule on{" "}
          <span className="tnum text-foreground">
            {onTime} of {delays.length}
          </span>{" "}
          recent trips
        </p>
        <p className="text-[0.75rem] text-muted-foreground">
          typical delay <span className="tnum text-muted-foreground">{median} min</span>
          {cancellations > 0 && <span className="ml-2 text-warning">{cancellations} cancelled</span>}
        </p>
      </div>

      <div className="flex h-16 items-end gap-[2px]" role="img" aria-label={`Delay over the last ${history.length} trips, median ${median} minutes`}>
        {history.map((day) => {
          const height = day.cancelled ? 100 : Math.max(4, (day.delayMins / max) * 100);
          const tone = day.cancelled
            ? "bg-muted-foreground"
            : day.delayMins <= 15
              ? "bg-success"
              : day.delayMins <= 45
                ? "bg-warning"
                : "bg-destructive";
          return (
            <Tooltip key={day.date}>
              <TooltipTrigger
                asChild
                aria-label={`${formatDateShort(day.date)} — ${day.cancelled ? "cancelled" : `${day.delayMins} min late`}`}
              >
            <span
              tabIndex={-1}
              className={cn("block flex-1 rounded-sm transition-opacity hover:opacity-70", tone, day.cancelled && "opacity-40")}
              style={{ height: `${height}%` }}
            />
              </TooltipTrigger>
              <TooltipContent>
                {`${formatDateShort(day.date)} — ${day.cancelled ? "cancelled" : `${day.delayMins} min late`}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-[0.625rem] text-muted-foreground">
        <span>{formatDateShort(history[0].date)}</span>
        <span>{formatDateShort(history[history.length - 1].date)}</span>
      </div>
    </div>
  );
}
