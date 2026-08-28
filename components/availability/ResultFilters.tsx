"use client";

import type { ClassCode } from "@/lib/types";
import { GLOSSARY } from "@/lib/glossary";
import { cn } from "@/components/ui/cn";
import { Check, Moon, Sun, Sunrise, Sunset, TicketCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SortKey = "departure" | "duration" | "arrival" | "fare";

export interface Filters {
  departureWindows: string[];
  classes: ClassCode[];
  confirmableOnly: boolean;
  sort: SortKey;
}

export const DEPARTURE_WINDOWS: Array<{
  id: string;
  label: string;
  short: string;
  from: number;
  to: number;
  icon: LucideIcon;
  iconClass: string;
  activeClass: string;
}> = [
  { id: "early", label: "Before 06:00", short: "Before 6", from: 0, to: 360, icon: Sunrise, iconClass: "text-accent", activeClass: "border-accent bg-accent-soft text-accent" },
  { id: "morning", label: "06:00 – 12:00", short: "6–12", from: 360, to: 720, icon: Sun, iconClass: "text-warn", activeClass: "border-warn bg-warn-soft text-warn" },
  { id: "afternoon", label: "12:00 – 18:00", short: "12–6", from: 720, to: 1080, icon: Sunset, iconClass: "text-brand", activeClass: "border-brand bg-brand-soft text-brand" },
  { id: "night", label: "After 18:00", short: "After 6", from: 1080, to: 1440, icon: Moon, iconClass: "text-info", activeClass: "border-info bg-info-soft text-info" },
];

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "departure", label: "Leaves" },
  { key: "duration", label: "Fastest" },
  { key: "arrival", label: "Arrives" },
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
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[0.9375rem] text-text">
          <span className="tnum">{matchCount}</span>
          <span className="ml-1 text-[0.8125rem] text-faint">
            {matchCount === 1 ? "train" : "trains"}
            {anyFilter ? ` of ${totalCount}` : ""}
          </span>
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {SORTS.map((sort) => (
            <Chip key={sort.key} active={filters.sort === sort.key} onClick={() => onChange({ ...filters, sort: sort.key })}>
              {sort.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {DEPARTURE_WINDOWS.map((window) => {
          const Icon = window.icon;
          return (
            <Chip
              key={window.id}
              active={filters.departureWindows.includes(window.id)}
              onClick={() => onChange({ ...filters, departureWindows: toggle(filters.departureWindows, window.id) })}
              ariaLabel={window.label}
              activeClass={window.activeClass}
            >
              <Icon className={cn("size-3.5", !filters.departureWindows.includes(window.id) && window.iconClass)} aria-hidden />
              {window.short}
            </Chip>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
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
        <button
          type="button"
          onClick={() => onChange({ ...filters, confirmableOnly: !filters.confirmableOnly })}
          aria-pressed={filters.confirmableOnly}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[0.75rem] transition-colors",
            filters.confirmableOnly
              ? "border-ok/40 bg-ok-soft text-ok"
              : "border-border bg-surface text-dim hover:border-border-strong"
          )}
        >
          <TicketCheck className="size-3.5" aria-hidden />
          Seats I can get
          {filters.confirmableOnly && <Check className="size-3" strokeWidth={2.5} aria-hidden />}
        </button>
        {anyFilter && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, departureWindows: [], classes: [], confirmableOnly: false })}
            className="text-[0.75rem] text-faint underline decoration-dotted underline-offset-2 hover:text-dim"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  title,
  ariaLabel,
  activeClass,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[0.75rem] transition-colors",
        active
          ? (activeClass ?? "border-brand bg-brand-soft text-brand")
          : "border-border bg-surface text-dim hover:border-border-strong"
      )}
    >
      {children}
    </button>
  );
}
