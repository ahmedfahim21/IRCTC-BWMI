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
              "btn shrink-0 gap-1.5 border px-2.5 py-1 text-[0.75rem]",
              /*
               * On and off must read at a glance: an active chip is a lifted
               * white pill with its line's colour; a hidden one goes hollow
               * and grey, visibly switched off rather than merely unhovered.
               */
              active
                ? "border-border-strong bg-surface text-text shadow-[var(--shadow-sm)]"
                : "border-transparent bg-surface-2 text-faint hover:text-dim"
            )}
          >
            <span
              className={cn("size-2 rounded-full", !active && "opacity-40")}
              style={{ background: active ? typeColourVar(index) : "var(--text-faint)" }}
              aria-hidden
            />
            {label}
            <span className={cn("tnum border-l pl-1.5 text-[0.6875rem] text-faint", active ? "border-border" : "border-border-strong/40")}>
              {counts[index]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
