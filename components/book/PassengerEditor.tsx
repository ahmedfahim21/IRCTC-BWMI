"use client";

import { Plus, Trash2, Users } from "lucide-react";
import type { BerthType, Passenger } from "@/lib/types";
import { cn } from "@/components/ui/cn";

const SAVED_KEY = "irctc.savedPassengers";

export function readSaved(): Array<Pick<Passenger, "name" | "age" | "gender">> {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveRoster(passengers: Passenger[]) {
  const roster = passengers.map(({ name, age, gender }) => ({ name, age, gender }));
  const existing = readSaved();
  const merged = [...roster, ...existing].filter(
    (p, i, all) => p.name.trim().length > 0 && all.findIndex((q) => q.name === p.name) === i
  );
  localStorage.setItem(SAVED_KEY, JSON.stringify(merged.slice(0, 8)));
}

export function blankPassenger(index: number): Passenger {
  return {
    id: `pax_${Date.now()}_${index}`,
    name: "",
    age: 30,
    gender: "male",
    berthPreference: null,
    allocatedCoach: null,
    allocatedBerth: null,
    allocatedBerthType: null,
    status: "confirmed",
    statusLabel: "",
  };
}

/** Passengers, with the saved roster one tap away rather than buried in a profile page. */
export function PassengerEditor({
  passengers,
  onChange,
  maxPassengers = 6,
  selectionFor,
}: {
  passengers: Passenger[];
  onChange: (next: Passenger[]) => void;
  maxPassengers?: number;
  selectionFor: (passenger: Passenger, index: number) => { coachCode: string; berthNumber: number; berthType: BerthType } | null;
}) {
  const saved = readSaved().filter((s) => !passengers.some((p) => p.name === s.name));

  const update = (index: number, patch: Partial<Passenger>) =>
    onChange(passengers.map((p, i) => (i === index ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-2.5">
      {passengers.map((passenger, index) => {
        const berth = selectionFor(passenger, index);
        return (
          <div key={passenger.id} className="rounded-xl border border-border bg-surface-2 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[9rem] flex-1">
                <span className="eyebrow mb-1 block">Name</span>
                <input
                  value={passenger.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="As on your ID"
                  autoComplete="off"
                  className="h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-[0.875rem] text-text outline-none transition-colors focus:border-brand placeholder:text-faint"
                />
              </label>

              <label className="w-[4.5rem]">
                <span className="eyebrow mb-1 block">Age</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={passenger.age}
                  onChange={(e) => update(index, { age: Number(e.target.value) })}
                  className="tnum h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-[0.875rem] text-text outline-none transition-colors focus:border-brand"
                />
              </label>

              <div>
                <span className="eyebrow mb-1 block">Gender</span>
                <div className="flex gap-0.5 rounded-lg border border-border bg-surface p-0.5">
                  {(["male", "female", "other"] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => update(index, { gender })}
                      aria-pressed={passenger.gender === gender}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-[0.75rem] capitalize transition-colors",
                        passenger.gender === gender ? "bg-brand text-on-brand" : "text-dim hover:text-text"
                      )}
                    >
                      {gender === "other" ? "Other" : gender === "male" ? "M" : "F"}
                    </button>
                  ))}
                </div>
              </div>

              {passengers.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(passengers.filter((_, i) => i !== index))}
                  aria-label={`Remove passenger ${index + 1}`}
                  className="mb-0.5 flex size-10 items-center justify-center rounded-lg border border-border text-faint transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              )}
            </div>

            <p className="mt-2 text-[0.75rem] text-faint">
              {berth ? (
                <span className="text-ok">
                  Berth {berth.coachCode}/{berth.berthNumber} · {berth.berthType}
                </span>
              ) : (
                "No berth chosen yet — pick one on the coach map above, or leave it and we'll allot the best free berth."
              )}
            </p>
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        {passengers.length < maxPassengers && (
          <button
            type="button"
            onClick={() => onChange([...passengers, blankPassenger(passengers.length)])}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[0.8125rem] text-dim transition-colors hover:border-border-strong hover:text-text"
          >
            <Plus className="size-3.5" aria-hidden />
            Add passenger
          </button>
        )}

        {saved.length > 0 && passengers.length < maxPassengers && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1.5 text-[0.6875rem] text-faint">
              <Users className="size-3" aria-hidden />
              Saved
            </span>
            {saved.slice(0, 4).map((person) => (
              <button
                key={person.name}
                type="button"
                onClick={() =>
                  onChange([...passengers, { ...blankPassenger(passengers.length), ...person }])
                }
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[0.75rem] text-dim transition-colors hover:border-brand hover:text-brand"
              >
                {person.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {passengers.length >= maxPassengers && (
        <p className="text-[0.6875rem] text-faint">
          One ticket covers up to {maxPassengers} passengers. Book a second ticket for more.
        </p>
      )}
    </div>
  );
}
