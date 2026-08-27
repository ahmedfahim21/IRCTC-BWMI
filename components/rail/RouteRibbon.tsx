"use client";

import { cn } from "@/components/ui/cn";

/**
 * A train's whole run as a horizontal track, with your segment picked out.
 * Same motif as the full vertical spine on the train page, at a smaller size —
 * one idea, three densities.
 */
export function RouteRibbon({
  originCode,
  destinationCode,
  boardCode,
  alightCode,
  boardAtFraction,
  alightAtFraction,
  liveFraction,
  className,
}: {
  originCode: string;
  destinationCode: string;
  boardCode: string;
  alightCode: string;
  boardAtFraction: number;
  alightAtFraction: number;
  liveFraction?: number | null;
  className?: string;
}) {
  const start = Math.max(0, Math.min(1, boardAtFraction)) * 100;
  const end = Math.max(0, Math.min(1, alightAtFraction)) * 100;
  const boardsAtOrigin = boardAtFraction < 0.005;
  const alightsAtEnd = alightAtFraction > 0.995;

  return (
    <div className={cn("select-none", className)}>
      <div
        className="relative h-1.5"
        role="img"
        aria-label={`Runs ${originCode} to ${destinationCode}; you travel ${boardCode} to ${alightCode}`}
      >
        {/* The full run of the train, most of which isn't your journey. */}
        <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-track" />
        {/* Your segment. */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand"
          style={{ left: `${start}%`, width: `${Math.max(1.5, end - start)}%` }}
        />
        <Marker at={start} filled={boardsAtOrigin} />
        <Marker at={end} filled={alightsAtEnd} />
        {typeof liveFraction === "number" && (
          <span
            className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ok ring-2 ring-[color:var(--surface)]"
            style={{ left: `${Math.max(0, Math.min(1, liveFraction)) * 100}%` }}
            aria-label="Train is here now"
          />
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[0.625rem] text-faint">
        <span className={cn(boardsAtOrigin && "text-dim")}>{originCode}</span>
        <span className="text-dim">
          {boardCode} → {alightCode}
        </span>
        <span className={cn(alightsAtEnd && "text-dim")}>{destinationCode}</span>
      </div>
    </div>
  );
}

function Marker({ at, filled }: { at: number; filled: boolean }) {
  return (
    <span
      className={cn(
        "absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand",
        filled ? "bg-brand" : "bg-[color:var(--surface)]"
      )}
      style={{ left: `${at}%` }}
      aria-hidden
    />
  );
}
