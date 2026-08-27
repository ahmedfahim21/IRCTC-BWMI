"use client";

import { useMemo } from "react";
import { DoorOpen, Plug, Droplets } from "lucide-react";
import type { Berth, CoachLayout, CoachType } from "@/lib/types";
import { cn } from "@/components/ui/cn";

export interface BerthSelection {
  coachCode: string;
  berthNumber: number;
}

/**
 * A real coach diagram you pick a berth from. IRCTC offers a preference
 * dropdown and no view of what's actually free; this is the inventory itself.
 */
export function BerthMap({
  coach,
  selections,
  onToggle,
  passengerCount,
  selectable = true,
}: {
  coach: CoachLayout;
  selections: BerthSelection[];
  onToggle: (berth: Berth) => void;
  passengerCount: number;
  /** When false, the diagram is visible but berths cannot be claimed. */
  selectable?: boolean;
}) {
  const bays = useMemo(() => {
    const grouped = new Map<number, Berth[]>();
    for (const berth of coach.berths) {
      const list = grouped.get(berth.bay) ?? [];
      list.push(berth);
      grouped.set(berth.bay, list);
    }
    return [...grouped.entries()].sort((a, b) => a[0] - b[0]);
  }, [coach.berths]);

  const seated = isSeated(coach.type);
  const selectedNumbers = new Set(
    selections.filter((s) => s.coachCode === coach.code).map((s) => s.berthNumber)
  );
  const freeCount = coach.berths.filter((b) => !b.isBooked).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.8125rem] text-dim">
          <span className="text-text">{coach.code}</span> · {coach.type}
          <span className="ml-2 text-faint">
            <span className="tnum">{freeCount}</span> of <span className="tnum">{coach.berths.length}</span> free
          </span>
        </p>
        <p className="text-[0.6875rem] text-faint">
          {selectedNumbers.size} of {passengerCount} chosen here
        </p>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="flex min-w-fit items-stretch gap-2">
          {/* Door and toilets sit at both ends of a coach. */}
          <EndCap />
          {bays.map(([bayNumber, berths]) => (
            <Bay
              key={bayNumber}
              berths={berths}
              seated={seated}
              coachType={coach.type}
              selectedNumbers={selectedNumbers}
              onToggle={onToggle}
              atCapacity={selections.length >= passengerCount}
              selectable={selectable}
            />
          ))}
          <EndCap />
        </div>
      </div>

      <Legend />
    </div>
  );
}

function isSeated(type: CoachType) {
  return type === "CC" || type === "EC" || type === "2S" || type === "GS";
}

function EndCap() {
  return (
    <div className="flex w-9 shrink-0 flex-col items-center justify-center gap-2.5 rounded-md border border-dashed border-border text-faint">
      <DoorOpen className="size-3.5" aria-hidden />
      <Droplets className="size-3.5" aria-hidden />
      <span className="sr-only">Door and toilets</span>
    </div>
  );
}

function Bay({
  berths,
  seated,
  coachType,
  selectedNumbers,
  onToggle,
  atCapacity,
  selectable,
}: {
  berths: Berth[];
  seated: boolean;
  coachType: CoachType;
  selectedNumbers: Set<number>;
  onToggle: (berth: Berth) => void;
  atCapacity: boolean;
  selectable: boolean;
}) {
  if (seated) {
    return (
      <div className="flex shrink-0 gap-1.5 rounded-md border border-border bg-surface-2 p-1.5">
        {berths.map((berth) => (
          <BerthButton key={berth.number} berth={berth} selected={selectedNumbers.has(berth.number)} onToggle={onToggle} atCapacity={atCapacity} selectable={selectable} />
        ))}
      </div>
    );
  }

  // Sleeper layouts: a main bay facing across the width, plus side berths
  // along the corridor. 3A/SL are 6+2; 2A is 4+2; 1A is a cabin of 4.
  const sideBerths = berths.filter((b) => b.type === "SL" || b.type === "SU");
  const mainBerths = berths.filter((b) => b.type !== "SL" && b.type !== "SU");
  const perColumn = coachType === "2A" ? 2 : coachType === "1A" ? 2 : 3;
  const columns: Berth[][] = [];
  for (let i = 0; i < mainBerths.length; i += perColumn) {
    columns.push(mainBerths.slice(i, i + perColumn));
  }

  return (
    <div className="flex shrink-0 items-stretch gap-2 rounded-md border border-border bg-surface-2 p-1.5">
      <div className="flex gap-1.5">
        {columns.map((column, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            {column.map((berth) => (
              <BerthButton key={berth.number} berth={berth} selected={selectedNumbers.has(berth.number)} onToggle={onToggle} atCapacity={atCapacity} selectable={selectable} />
            ))}
          </div>
        ))}
      </div>

      {sideBerths.length > 0 && (
        <>
          {/* The corridor. */}
          <span className="w-2 shrink-0 self-stretch rounded-full bg-surface-3" aria-hidden />
          <div className="flex flex-col justify-between gap-1.5">
            {sideBerths.map((berth) => (
              <BerthButton key={berth.number} berth={berth} selected={selectedNumbers.has(berth.number)} onToggle={onToggle} atCapacity={atCapacity} selectable={selectable} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BerthButton({
  berth,
  selected,
  onToggle,
  atCapacity,
  selectable,
}: {
  berth: Berth;
  selected: boolean;
  onToggle: (berth: Berth) => void;
  atCapacity: boolean;
  selectable: boolean;
}) {
  const disabled = !selectable || berth.isBooked || (atCapacity && !selected);

  const notes = [
    berth.nearToilet ? "near the toilet" : null,
    berth.hasCharging ? "charging point" : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(berth)}
      aria-pressed={selected}
      title={
        berth.isBooked
          ? `Berth ${berth.number} (${berth.type}) — taken`
          : `Berth ${berth.number}, ${berth.type}${notes.length ? ` — ${notes.join(", ")}` : ""}`
      }
      aria-label={`Berth ${berth.number}, ${berth.type}${berth.isBooked ? ", taken" : notes.length ? `, ${notes.join(", ")}` : ""}`}
      className={cn(
        "relative flex h-11 w-[2.85rem] flex-col items-center justify-center rounded-md border text-[0.625rem] leading-none transition-colors",
        berth.isBooked
          ? "cursor-not-allowed border-border bg-surface-3 text-faint/50"
          : selected
            ? "border-brand bg-brand text-on-brand"
            : "border-ok/30 bg-ok-soft text-ok hover:border-ok",
        atCapacity && !selected && !berth.isBooked && "cursor-not-allowed opacity-40"
      )}
    >
      <span className="tnum text-[0.8125rem]">{berth.number}</span>
      <span className="opacity-75">{berth.type}</span>
      {berth.hasCharging && !berth.isBooked && (
        <Plug className="absolute right-0.5 top-0.5 size-2 opacity-60" aria-hidden />
      )}
    </button>
  );
}

function Legend() {
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[0.75rem] text-faint">
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm border border-ok/30 bg-ok-soft" aria-hidden /> Free
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm border border-brand bg-brand" aria-hidden /> Yours
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm border border-border bg-surface-3" aria-hidden /> Taken
      </li>
      <li className="flex items-center gap-1.5">
        <Plug className="size-3" aria-hidden /> Charging point
      </li>
      <li className="flex items-center gap-1.5">
        <DoorOpen className="size-3" aria-hidden /> Door and toilets
      </li>
    </ul>
  );
}
