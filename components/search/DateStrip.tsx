"use client";

import { useQuery } from "@tanstack/react-query";
import type { RouteDay } from "@/app/api/route-availability/route";
import { addDays, formatDateShort, formatWeekday, todayIso } from "@/lib/domain/time";
import { api } from "@/lib/apiClient";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/Skeleton";

const TONE: Record<RouteDay["state"], { dot: string; text: string }> = {
  available: { dot: "bg-ok", text: "text-ok" },
  rac: { dot: "bg-warn", text: "text-warn" },
  waitlist: { dot: "bg-danger", text: "text-danger" },
  regretted: { dot: "bg-faint", text: "text-faint" },
  notAvailable: { dot: "bg-faint", text: "text-faint" },
  departed: { dot: "bg-faint", text: "text-faint" },
  none: { dot: "bg-border-strong", text: "text-faint" },
};

/**
 * Availability across the next fortnight, shown before you commit to a date.
 * Searching a date only to be told nothing runs that day is a wasted round trip
 * — the answer should be on screen while you're still choosing.
 */
export function DateStrip({
  from,
  to,
  date,
  onPick,
  span = 14,
}: {
  from: string;
  to: string;
  date: string;
  onPick: (date: string) => void;
  span?: number;
}) {
  const today = todayIso();
  const start = date < today ? today : date;

  const { data, isPending, isError } = useQuery({
    queryKey: ["routeAvailability", from, to, start, span],
    queryFn: ({ signal }) => api.routeAvailability({ from, to, date: start, span }, signal),
    enabled: Boolean(from && to),
    staleTime: 60_000,
  });

  if (!from || !to) return null;

  if (isPending) {
    return (
      <div className="flex gap-1.5 overflow-hidden" aria-hidden>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] w-[4.25rem] shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  // A failed strip must not masquerade as "no trains available".
  if (isError) {
    return <p className="text-[0.75rem] text-danger">Couldn&rsquo;t load availability for these dates.</p>;
  }

  return (
    <div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Journey date">
        {data.days.map((day) => {
          const selected = day.date === date;
          const tone = TONE[day.state];
          const dead = day.trainCount === 0;
          const label = day.date === today ? "Today" : day.date === addDays(today, 1) ? "Tomorrow" : formatWeekday(day.date);

          return (
            <button
              key={day.date}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPick(day.date)}
              aria-label={`${formatDateShort(day.date)}, ${dead ? "no trains" : `${day.trainCount} trains, best availability ${day.label}`}`}
              className={cn(
                "flex w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-colors",
                selected ? "border-brand bg-brand-soft" : "border-border bg-surface hover:border-border-strong",
                dead && "opacity-55"
              )}
            >
              <span className="text-[0.625rem] uppercase tracking-wider text-faint">{label}</span>
              <span className={cn("tnum text-[0.8125rem]", selected ? "text-brand" : "text-text")}>
                {formatDateShort(day.date)}
              </span>
              <span className="flex items-center gap-1">
                <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
                <span className={cn("text-[0.625rem]", tone.text)}>
                  {dead ? "None" : day.confirmableCount > 0 ? `${day.confirmableCount} open` : "Full"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[0.6875rem] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-ok" aria-hidden /> Seats free
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-warn" aria-hidden /> RAC only
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-danger" aria-hidden /> Waitlist only
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-border-strong" aria-hidden /> No trains
        </span>
      </p>
    </div>
  );
}
