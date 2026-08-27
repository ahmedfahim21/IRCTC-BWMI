"use client";

import { useEffect, useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { RouteDay } from "@/app/api/route-availability/route";
import { addDays, daysBetween, formatDateShort, formatWeekday, todayIso } from "@/lib/domain/time";
import { api } from "@/lib/apiClient";
import { cn } from "@/components/ui/cn";
import { DATE_CHIP_STRIDE_PX } from "@/lib/ui/dateChip";

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
 * Availability across the coming fortnight, shown before you commit to a date.
 * Searching a date only to be told nothing runs that day is a wasted round trip
 * — the answer should be on screen while you're still choosing.
 *
 * The window is anchored to today and never re-anchors to the selection. It
 * used to start at whatever date was picked, which meant choosing one refetched
 * the strip (everything below it flashed as the skeleton came back) and left
 * you unable to scroll back to any earlier date.
 */
export function DateStrip({
  from,
  to,
  date,
  onPick,
  span = 14,
  disabled = false,
}: {
  from: string;
  to: string;
  date: string;
  onPick: (date: string) => void;
  span?: number;
  disabled?: boolean;
}) {
  const today = todayIso();
  const scroller = useRef<HTMLDivElement>(null);

  // Always start at today, and stretch far enough to contain the selection —
  // so a date chosen from a URL or a far-off pick is still on the strip.
  const daysOut = Math.max(0, daysBetween(today, date));
  const windowSpan = Math.max(span, daysOut + 4);

  const { data, isPending, isError } = useQuery({
    // Deliberately not keyed on the selected date: picking a day inside the
    // window is a highlight change, not a new request.
    queryKey: ["routeAvailability", from, to, today, windowSpan],
    queryFn: ({ signal }) => api.routeAvailability({ from, to, date: today, span: windowSpan }, signal),
    enabled: Boolean(from && to) && !disabled,
    staleTime: 60_000,
    // If the window does have to grow, keep showing the old strip rather than
    // collapsing to a skeleton underneath the user's cursor.
    placeholderData: keepPreviousData,
  });

  // Bring the selection into view without touching the page's own scroll.
  useEffect(() => {
    const box = scroller.current;
    if (!box || !data) return;
    const index = data.days.findIndex((day) => day.date === date);
    if (index < 0) return;
    box.scrollTo({
      left: Math.max(0, index * DATE_CHIP_STRIDE_PX - box.clientWidth / 2 + DATE_CHIP_STRIDE_PX / 2),
      behavior: "smooth",
    });
  }, [date, data]);

  const placeholderDays = Array.from({ length: windowSpan }, (_, i) => addDays(today, i));
  const waiting = disabled || !from || !to || isPending;

  if (!data) {
    return (
      <div className={waiting ? "opacity-45" : undefined} aria-disabled={waiting || undefined}>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label="Journey date">
          {placeholderDays.map((day) => {
            const selected = day === date;
            const label = day === today ? "Today" : day === addDays(today, 1) ? "Tomorrow" : formatWeekday(day);
            return (
              <button
                key={day}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled
                aria-label={`${formatDateShort(day)}, pick stations to see availability`}
                className={cn(
                  "flex w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-2.5",
                  selected ? "border-brand bg-brand-soft" : "border-border bg-surface"
                )}
              >
                <span className="text-[0.625rem] uppercase tracking-wider text-faint">{label}</span>
                <span className={cn("tnum text-[0.8125rem]", selected ? "text-brand" : "text-text")}>
                  {formatDateShort(day)}
                </span>
                <span className="flex h-4 items-center gap-1">
                  <span className="size-1.5 rounded-full bg-border-strong" aria-hidden />
                  <span className="text-[0.625rem] text-faint">—</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 min-h-[2.75rem] px-0.5 text-[0.6875rem] leading-snug text-faint">
          Pick origin and destination to see which days have seats.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={scroller}
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        role="radiogroup"
        aria-label="Journey date"
      >
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
              <span className="flex h-4 items-center gap-1">
                <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
                <span className={cn("text-[0.625rem]", tone.text)}>
                  {dead ? "None" : day.confirmableCount > 0 ? `${day.confirmableCount} open` : "Full"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {isError ? (
        <p className="mt-2 min-h-[2.75rem] px-0.5 text-[0.6875rem] leading-snug text-danger">
          Couldn&rsquo;t load availability for these dates.
        </p>
      ) : (
        <p className="mt-2 flex min-h-[2.75rem] flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[0.6875rem] text-faint">
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
      )}
    </div>
  );
}
