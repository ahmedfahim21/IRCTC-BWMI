"use client";

import type { ClassCode } from "@/lib/types";
import { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/components/ui/cn";
import { Check } from "lucide-react";

export type SortKey = "departure" | "duration" | "arrival" | "fare";

export interface Filters {
  departureWindows: string[];
  classes: ClassCode[];
  confirmableOnly: boolean;
  sort: SortKey;
}

export const DEPARTURE_WINDOWS = [
  { id: "early", label: "Before 06:00", from: 0, to: 360 },
  { id: "morning", label: "06:00 – 12:00", from: 360, to: 720 },
  { id: "afternoon", label: "12:00 – 18:00", from: 720, to: 1080 },
  { id: "night", label: "After 18:00", from: 1080, to: 1440 },
];

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "departure", label: "Departure" },
  { key: "duration", label: "Fastest" },
  { key: "arrival", label: "Arrival" },
  { key: "fare", label: "Cheapest" },
];

export function ResultFilters({
  filters,
  onChange,
  availableClasses,
  matchCount,
  totalCount,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  availableClasses: ClassCode[];
  matchCount: number;
  totalCount: number;
}) {
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const anyFilter =
    filters.departureWindows.length > 0 || filters.classes.length > 0 || filters.confirmableOnly;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-1">Leaves</span>
        {DEPARTURE_WINDOWS.map((window) => (
          <Chip
            key={window.id}
            active={filters.departureWindows.includes(window.id)}
            onClick={() => onChange({ ...filters, departureWindows: toggle(filters.departureWindows, window.id) })}
          >
            {window.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-1">Class</span>
        {availableClasses.map((classCode) => (
          <Chip
            key={classCode}
            active={filters.classes.includes(classCode)}
            onClick={() => onChange({ ...filters, classes: toggle(filters.classes, classCode) })}
            title={GLOSSARY[classCode]?.short}
          >
            <span className="font-mono">{classCode}</span>
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          onClick={() => onChange({ ...filters, confirmableOnly: !filters.confirmableOnly })}
          aria-pressed={filters.confirmableOnly}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.75rem] transition-colors",
            filters.confirmableOnly
              ? "border-ok/40 bg-ok-soft text-ok"
              : "border-border bg-surface text-dim hover:border-border-strong"
          )}
        >
          <span
            className={cn(
              "flex size-3.5 items-center justify-center rounded border",
              filters.confirmableOnly ? "border-ok bg-ok text-[color:var(--surface)]" : "border-border-strong"
            )}
            aria-hidden
          >
            {filters.confirmableOnly && <Check className="size-2.5" strokeWidth={3} />}
          </span>
          Only show what I can actually get
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="eyebrow">Sort</span>
          {SORTS.map((sort) => (
            <Chip key={sort.key} active={filters.sort === sort.key} onClick={() => onChange({ ...filters, sort: sort.key })}>
              {sort.label}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-[0.75rem] text-faint">
        Showing <span className="tnum text-dim">{matchCount}</span> of{" "}
        <span className="tnum text-dim">{totalCount}</span> trains
        {anyFilter && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => onChange({ ...filters, departureWindows: [], classes: [], confirmableOnly: false })}
              className="underline decoration-dotted underline-offset-2 hover:text-dim"
            >
              Clear filters
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "rounded-lg border px-2.5 py-1.5 text-[0.75rem] transition-colors",
        active ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-dim hover:border-border-strong"
      )}
    >
      {children}
    </button>
  );
}
