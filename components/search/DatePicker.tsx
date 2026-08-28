"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/components/ui/cn";
import { addDays, todayIso } from "@/lib/domain/time";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const MAX_ADVANCE_DAYS = 120;

function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function isoFromParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function mondayIndex(y: number, m: number, d: number): number {
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return (dow + 6) % 7;
}

function formatTrigger(iso: string): string {
  const { y, m, d } = parts(iso);
  const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC",
  });
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  });
  return `${weekday} ${d} ${month} ${y}`;
}

function clampView(
  y: number,
  m: number,
  minY: number,
  minM: number,
  maxY: number,
  maxM: number,
): { y: number; m: number } {
  if (y < minY || (y === minY && m < minM)) return { y: minY, m: minM };
  if (y > maxY || (y === maxY && m > maxM)) return { y: maxY, m: maxM };
  return { y, m };
}

export function DatePicker({
  date,
  disabled,
  onPick,
}: {
  date: string;
  disabled?: boolean;
  onPick: (iso: string) => void;
}) {
  const min = todayIso();
  const max = addDays(min, MAX_ADVANCE_DAYS);
  const selected = parts(date);
  const [open, setOpen] = useState(false);
  const [viewY, setViewY] = useState(selected.y);
  const [viewM, setViewM] = useState(selected.m);

  const minP = parts(min);
  const maxP = parts(max);
  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = minP.y; y <= maxP.y; y++) out.push(y);
    return out;
  }, [minP.y, maxP.y]);

  const cells = useMemo(() => {
    const lead = mondayIndex(viewY, viewM, 1);
    const count = daysInMonth(viewY, viewM);
    const total = Math.ceil((lead + count) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const day = i - lead + 1;
      if (day < 1 || day > count) return null;
      return isoFromParts(viewY, viewM, day);
    });
  }, [viewY, viewM]);

  function goMonth(delta: number) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    if (y < minP.y || (y === minP.y && m < minP.m)) return;
    if (y > maxP.y || (y === maxP.y && m > maxP.m)) return;
    setViewY(y);
    setViewM(m);
  }

  const canPrev = viewY > minP.y || (viewY === minP.y && viewM > minP.m);
  const canNext = viewY < maxP.y || (viewY === maxP.y && viewM < maxP.m);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setViewY(selected.y);
          setViewM(selected.m);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Journey date"
          className="inline-flex h-11 min-w-[10.5rem] items-center gap-2 rounded-xl border border-border bg-surface px-3 text-left text-sm text-text disabled:opacity-50"
        >
          <Calendar className="size-4 shrink-0 text-dim" aria-hidden />
          <span className="truncate">{formatTrigger(date)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[20.5rem] rounded-2xl border border-border bg-surface p-3 shadow-[var(--shadow-md)]"
      >
        <div className="mb-2 flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={!canPrev}
            onClick={() => goMonth(-1)}
            className="grid size-8 place-items-center rounded-lg text-text hover:bg-surface-2 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <label className="sr-only" htmlFor="cal-month">
            Month
          </label>
          <select
            id="cal-month"
            value={viewM}
            aria-label="Month"
            onChange={(e) => {
              const next = clampView(viewY, Number(e.target.value), minP.y, minP.m, maxP.y, maxP.m);
              setViewY(next.y);
              setViewM(next.m);
            }}
            className="h-8 flex-1 rounded-lg border border-border bg-surface-2 px-1 text-sm text-text"
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="cal-year">
            Year
          </label>
          <select
            id="cal-year"
            value={viewY}
            aria-label="Year"
            onChange={(e) => {
              const next = clampView(Number(e.target.value), viewM, minP.y, minP.m, maxP.y, maxP.m);
              setViewY(next.y);
              setViewM(next.m);
            }}
            className="h-8 w-[4.75rem] rounded-lg border border-border bg-surface-2 px-1 text-sm text-text"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Next month"
            disabled={!canNext}
            onClick={() => goMonth(1)}
            className="grid size-8 place-items-center rounded-lg text-text hover:bg-surface-2 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[0.65rem] font-medium uppercase tracking-wide text-faint">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((iso, i) => {
            if (!iso) {
              return <div key={`e-${i}`} className="h-9" />;
            }
            const { d } = parts(iso);
            const out = iso < min || iso > max;
            const on = iso === date;
            const isToday = iso === min;
            return (
              <button
                key={iso}
                type="button"
                disabled={out}
                aria-label={iso}
                aria-pressed={on}
                onClick={() => {
                  onPick(iso);
                  setOpen(false);
                }}
                className={cn(
                  "grid h-9 place-items-center rounded-lg text-sm font-medium",
                  out && "cursor-not-allowed text-faint/40",
                  !out && !on && "text-text hover:bg-surface-2",
                  on && "bg-brand text-on-brand",
                  isToday && !on && "ring-1 ring-brand/40",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
