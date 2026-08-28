"use client";

import { Plus, Trash2, Users } from "lucide-react";
import type { BerthType, Passenger } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
          <div key={passenger.id} className="rounded-xl border border-border bg-muted p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[9rem] flex-1">
                <Label className="eyebrow mb-1 block">Name</Label>
                <Input
                  value={passenger.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  placeholder="As on your ID"
                  autoComplete="off"
                  className="h-10 rounded-lg border-border bg-card px-2.5 text-[0.875rem] focus-visible:border-primary"
                />
              </div>

              <div className="w-[4.5rem]">
                <Label className="eyebrow mb-1 block">Age</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={passenger.age}
                  onChange={(e) => update(index, { age: Number(e.target.value) })}
                  className="tnum h-10 rounded-lg border-border bg-card px-2.5 text-[0.875rem] focus-visible:border-primary"
                />
              </div>

              <div>
                <span className="eyebrow mb-1 block">Gender</span>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  spacing={0}
                  value={passenger.gender}
                  onValueChange={(value) => value && update(index, { gender: value as Passenger["gender"] })}
                  className="rounded-lg border border-border bg-card p-0.5"
                >
                  {(["male", "female", "other"] as const).map((gender) => (
                    <ToggleGroupItem
                      key={gender}
                      value={gender}
                      aria-label={gender === "other" ? "Other" : gender === "male" ? "Male" : "Female"}
                      className="rounded-md px-2 py-1.5 text-[0.75rem] capitalize data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {gender === "other" ? "Other" : gender === "male" ? "M" : "F"}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {passengers.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  onClick={() => onChange(passengers.filter((_, i) => i !== index))}
                  aria-label={`Remove passenger ${index + 1}`}
                  className="mb-0.5 rounded-lg text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              )}
            </div>

            <p className="mt-2 text-[0.75rem] text-muted-foreground">
              {berth ? (
                <span className="text-success">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...passengers, blankPassenger(passengers.length)])}
            className="gap-1.5 rounded-lg text-[0.8125rem] text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" aria-hidden />
            Add passenger
          </Button>
        )}

        {saved.length > 0 && passengers.length < maxPassengers && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
              <Users className="size-3" aria-hidden />
              Saved
            </span>
            {saved.slice(0, 4).map((person) => (
              <Button
                key={person.name}
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange([...passengers, { ...blankPassenger(passengers.length), ...person }])
                }
                className="rounded-lg bg-card text-[0.75rem] text-muted-foreground hover:border-primary hover:text-primary"
              >
                {person.name}
              </Button>
            ))}
          </div>
        )}
      </div>

      {passengers.length >= maxPassengers && (
        <p className="text-[0.6875rem] text-muted-foreground">
          One ticket covers up to {maxPassengers} passengers. Book a second ticket for more.
        </p>
      )}
    </div>
  );
}
