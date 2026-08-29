"use client";

import type { ClassCode } from "@/lib/types";
import { lookup } from "@/lib/glossary";
import { useLocale } from "@/lib/i18n/useLocale";
import type { StringKey } from "@/lib/i18n/strings";
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
  labelKey: StringKey;
  shortKey: StringKey;
  from: number;
  to: number;
  icon: LucideIcon;
  iconClass: string;
  activeClass: string;
}> = [
  { id: "early", labelKey: "filters.windowBefore6Full", shortKey: "filters.windowBefore6", from: 0, to: 360, icon: Sunrise, iconClass: "text-accent", activeClass: "border-accent bg-accent-soft text-accent" },
  { id: "morning", labelKey: "filters.window6to12Full", shortKey: "filters.window6to12", from: 360, to: 720, icon: Sun, iconClass: "text-warn", activeClass: "border-warn bg-warn-soft text-warn" },
  { id: "afternoon", labelKey: "filters.window12to6Full", shortKey: "filters.window12to6", from: 720, to: 1080, icon: Sunset, iconClass: "text-brand", activeClass: "border-brand bg-brand-soft text-brand" },
  { id: "night", labelKey: "filters.windowAfter6Full", shortKey: "filters.windowAfter6", from: 1080, to: 1440, icon: Moon, iconClass: "text-info", activeClass: "border-info bg-info-soft text-info" },
];

const SORTS: Array<{ key: SortKey; labelKey: StringKey }> = [
  { key: "departure", labelKey: "filters.sortDeparture" },
  { key: "duration", labelKey: "filters.sortDuration" },
  { key: "arrival", labelKey: "filters.sortArrival" },
  { key: "fare", labelKey: "filters.sortFare" },
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
  const { t, locale } = useLocale();
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
            {t(matchCount === 1 ? "results.train" : "results.trains")}
            {anyFilter ? ` ${locale === "hi" ? "में से" : "of"} ${totalCount}` : ""}
          </span>
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {SORTS.map((sort) => (
            <Chip key={sort.key} active={filters.sort === sort.key} onClick={() => onChange({ ...filters, sort: sort.key })}>
              {t(sort.labelKey)}
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
              ariaLabel={t(window.labelKey)}
              activeClass={window.activeClass}
            >
              <Icon className={cn("size-3.5", !filters.departureWindows.includes(window.id) && window.iconClass)} aria-hidden />
              {t(window.shortKey)}
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
            title={lookup(classCode, locale)?.short}
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
          {t("filters.confirmableOnly")}
          {filters.confirmableOnly && <Check className="size-3" strokeWidth={2.5} aria-hidden />}
        </button>
        {anyFilter && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, departureWindows: [], classes: [], confirmableOnly: false })}
            className="text-[0.75rem] text-faint underline decoration-dotted underline-offset-2 hover:text-dim"
          >
            {t("search.clear")}
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
