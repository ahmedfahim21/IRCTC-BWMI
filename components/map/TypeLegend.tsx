"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/components/ui/cn";
import { typeColourVar } from "@/lib/railradar/trainTypes";

export function TypeLegend({
  types,
  activeTypes,
  counts,
  onToggle,
}: {
  types: readonly string[];
  activeTypes: Set<number>;
  counts: number[];
  onToggle: (index: number) => void;
}) {
  const activeValues = types
    .map((_, index) => (activeTypes.has(index) && counts[index] ? String(index) : null))
    .filter((value): value is string => value !== null);

  return (
    <ScrollArea className="w-full pb-0.5">
    <ToggleGroup
      type="multiple"
      variant="outline"
      size="sm"
      spacing={0}
      value={activeValues}
      onValueChange={(values) => {
        const next = new Set(values.map(Number));
        types.forEach((_, index) => {
          if (!counts[index]) return;
          const wasActive = activeTypes.has(index);
          const isActive = next.has(index);
          if (wasActive !== isActive) onToggle(index);
        });
      }}
      className="flex w-max gap-1.5"
    >
      {types.map((label, index) => {
        const active = activeTypes.has(index);
        if (!counts[index]) return null;
        return (
          <ToggleGroupItem
            key={label}
            value={String(index)}
            aria-label={`${label}, ${counts[index]} trains`}
            className={cn(
              "shrink-0 gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.75rem] data-[state=on]:border-input data-[state=on]:bg-card data-[state=on]:text-foreground",
              !active && "border-border bg-muted text-muted-foreground"
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: active ? typeColourVar(index) : "var(--text-muted-foreground)" }}
              aria-hidden
            />
            {label}
            <span className="tnum text-muted-foreground">{counts[index]}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
    <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
