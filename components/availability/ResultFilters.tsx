"use client";

import type { ClassCode } from "@/lib/types";
import { GLOSSARY } from "@/lib/glossary";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/components/ui/cn";

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
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          spacing={0}
          value={filters.departureWindows}
          onValueChange={(next) => onChange({ ...filters, departureWindows: next })}
          className="flex-wrap"
        >
          {DEPARTURE_WINDOWS.map((window) => (
            <ToggleGroupItem
              key={window.id}
              value={window.id}
              aria-label={window.label}
              className="rounded-lg border px-2.5 py-1.5 text-[0.75rem] data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-primary"
            >
              {window.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="eyebrow mr-1">Class</span>
        <ToggleGroup
          type="multiple"
          variant="outline"
          size="sm"
          spacing={0}
          value={filters.classes}
          onValueChange={(next) => onChange({ ...filters, classes: next as ClassCode[] })}
          className="flex-wrap"
        >
          {availableClasses.map((classCode) => (
            <ToggleGroupItem
              key={classCode}
              value={classCode}
              aria-label={GLOSSARY[classCode]?.short ?? classCode}
              className="rounded-lg border px-2.5 py-1.5 text-[0.75rem] data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-primary"
            >
              <span className="font-mono">{classCode}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="confirmable-only"
            checked={filters.confirmableOnly}
            onCheckedChange={(checked) => onChange({ ...filters, confirmableOnly: checked === true })}
            aria-label="Only show what I can actually get"
          />
          <Label
            htmlFor="confirmable-only"
            className={cn(
              "cursor-pointer text-[0.75rem] font-normal",
              filters.confirmableOnly ? "text-success" : "text-muted-foreground"
            )}
          >
            Only show what I can actually get
          </Label>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="eyebrow">Sort</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={filters.sort}
            onValueChange={(next) => next && onChange({ ...filters, sort: next as SortKey })}
          >
            {SORTS.map((sort) => (
              <ToggleGroupItem
                key={sort.key}
                value={sort.key}
                aria-label={sort.label}
                className="rounded-lg border px-2.5 py-1.5 text-[0.75rem] data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-primary"
              >
                {sort.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <p className="text-[0.75rem] text-muted-foreground">
        Showing <span className="tnum text-muted-foreground">{matchCount}</span> of{" "}
        <span className="tnum text-muted-foreground">{totalCount}</span> trains
        {anyFilter && (
          <>
            {" · "}
            <Button
              type="button"
              variant="link"
              onClick={() => onChange({ ...filters, departureWindows: [], classes: [], confirmableOnly: false })}
              className="h-auto p-0 text-[0.75rem] decoration-dotted"
            >
              Clear filters
            </Button>
          </>
        )}
      </p>
    </div>
  );
}
