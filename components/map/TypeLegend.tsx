"use client";

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
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {types.map((label, index) => {
        const active = activeTypes.has(index);
        if (!counts[index]) return null;
        return (
          <button
            key={`${index}-${label}`}
            type="button"
            onClick={() => onToggle(index)}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.75rem] transition-colors",
              active ? "border-border-strong bg-surface text-text" : "border-border bg-surface-2 text-faint"
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: active ? typeColourVar(index) : "var(--text-faint)" }}
              aria-hidden
            />
            {label}
            <span className="tnum text-faint">{counts[index]}</span>
          </button>
        );
      })}
    </div>
  );
}
