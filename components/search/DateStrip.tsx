"use client";

import { useEffect, useRef } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { RouteDay } from "@/app/api/route-availability/route";
import { addDays, daysBetween, formatDateShort, formatWeekday, todayIso } from "@/lib/domain/time";
import { api } from "@/lib/apiClient";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/components/ui/cn";
import { DATE_CHIP_STRIDE_PX } from "@/lib/ui/dateChip";

const TONE: Record<RouteDay["state"], { dot: string; text: string }> = {
  available: { dot: "bg-success", text: "text-success" },
  rac: { dot: "bg-warning", text: "text-warning" },
  waitlist: { dot: "bg-destructive", text: "text-destructive" },
  regretted: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
  notAvailable: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
  departed: { dot: "bg-muted-foreground", text: "text-muted-foreground" },
  none: { dot: "bg-input", text: "text-muted-foreground" },
};

function DateChip({
  day,
  selected,
  disabled,
  ariaLabel,
  label,
  tone,
  dead,
  confirmableCount,
}: {
  day: string;
  selected: boolean;
  disabled?: boolean;
  ariaLabel: string;
  label: string;
  tone?: { dot: string; text: string };
  dead?: boolean;
  confirmableCount?: number;
}) {
  return (
    <RadioGroupItem
      value={day}
      id={`date-chip-${day}`}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "flex h-auto w-[5.5rem] shrink-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center shadow-none transition-colors",
        "aspect-auto size-auto hover:border-input",
        selected ? "border-primary bg-accent" : "border-border bg-card",
        dead && "opacity-55",
        disabled && "cursor-not-allowed opacity-45",
        "[&_[data-slot=radio-group-indicator]]:hidden"
      )}
    >
      <span className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn("tnum text-[0.9375rem]", selected ? "text-primary" : "text-foreground")}>
        {formatDateShort(day)}
      </span>
      <span className="flex h-5 items-center gap-1">
        <span className={cn("size-1.5 rounded-full", tone?.dot ?? "bg-border-strong")} aria-hidden />
        <span className={cn("text-[0.6875rem]", tone?.text ?? "text-muted-foreground")}>
          {dead ? "None" : confirmableCount !== undefined ? (confirmableCount > 0 ? `${confirmableCount} open` : "Full") : "—"}
        </span>
      </span>
    </RadioGroupItem>
  );
}

/**
 * Availability across the coming fortnight, shown before you commit to a date.
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

  const daysOut = Math.max(0, daysBetween(today, date));
  const windowSpan = Math.max(span, daysOut + 4);

  const { data, isPending, isError } = useQuery({
    queryKey: ["routeAvailability", from, to, today, windowSpan],
    queryFn: ({ signal }) => api.routeAvailability({ from, to, date: today, span: windowSpan }, signal),
    enabled: Boolean(from && to) && !disabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

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
        <ScrollArea className="-mx-1 w-full whitespace-nowrap px-1 pb-1.5">
          <div ref={scroller} className="flex w-max gap-2">
          <RadioGroup
            value={date}
            onValueChange={onPick}
            aria-label="Journey date"
            className="contents"
            disabled={waiting}
          >
            {placeholderDays.map((day) => {
              const selected = day === date;
              const label = day === today ? "Today" : day === addDays(today, 1) ? "Tomorrow" : formatWeekday(day);
              return (
                <DateChip
                  key={day}
                  day={day}
                  selected={selected}
                  disabled
                  ariaLabel={`${formatDateShort(day)}, pick stations to see availability`}
                  label={label}
                />
              );
            })}
          </RadioGroup>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <p className="mt-2 min-h-[2.75rem] px-0.5 text-[0.6875rem] leading-snug text-muted-foreground">
          Pick origin and destination to see which days have seats.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ScrollArea className="-mx-1 w-full whitespace-nowrap px-1 pb-1.5">
        <div ref={scroller} className="flex w-max gap-2">
        <RadioGroup value={date} onValueChange={onPick} aria-label="Journey date" className="contents">
          {data.days.map((day) => {
            const selected = day.date === date;
            const tone = TONE[day.state];
            const dead = day.trainCount === 0;
            const label = day.date === today ? "Today" : day.date === addDays(today, 1) ? "Tomorrow" : formatWeekday(day.date);

            return (
              <DateChip
                key={day.date}
                day={day.date}
                selected={selected}
                ariaLabel={`${formatDateShort(day.date)}, ${dead ? "no trains" : `${day.trainCount} trains, best availability ${day.label}`}`}
                label={label}
                tone={tone}
                dead={dead}
                confirmableCount={day.confirmableCount}
              />
            );
          })}
        </RadioGroup>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {isError ? (
        <p className="mt-2 min-h-[2.75rem] px-0.5 text-[0.6875rem] leading-snug text-destructive">
          Couldn&rsquo;t load availability for these dates.
        </p>
      ) : (
        <p className="mt-2 flex min-h-[2.75rem] flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[0.6875rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-success" aria-hidden /> Seats free
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-warning" aria-hidden /> RAC only
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-destructive" aria-hidden /> Waitlist only
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-border-strong" aria-hidden /> No trains
          </span>
        </p>
      )}
    </div>
  );
}
