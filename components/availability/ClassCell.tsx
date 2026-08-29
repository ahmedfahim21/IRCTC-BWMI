"use client";

import type { Availability } from "@/lib/types";
import { explainStatus, GLOSSARY } from "@/lib/glossary";
import { ProbabilityBar } from "@/components/ui/StatusChip";
import { cn } from "@/components/ui/cn";
import { Armchair } from "lucide-react";

/*
 * Tone rides on a dot and the label's own colour; the tile itself stays
 * paper-white. Four tinted panels per row read as an alarm board — four
 * quiet tiles with one coloured word each read as information.
 */
const TONE = {
  available: { label: "text-ok", dot: "bg-ok", ring: "hover:border-ok/45" },
  rac: { label: "text-warn", dot: "bg-warn", ring: "hover:border-warn/45" },
  waitlist: { label: "text-danger", dot: "bg-danger", ring: "hover:border-danger/45" },
  regretted: { label: "text-faint", dot: "bg-border-strong", ring: "" },
  notAvailable: { label: "text-faint", dot: "bg-border-strong", ring: "" },
  departed: { label: "text-faint", dot: "bg-border-strong", ring: "" },
} as const;

export const formatRupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * One class of one train, fully resolved. On IRCTC this cell costs a page load
 * each; here every one on screen is already filled in.
 *
 * The whole cell is the booking control, so the glossary popovers live in the
 * legend above the results rather than nested inside this button — the plain
 * reading of the status ("2 ahead of you") is already written out below it.
 */
export function ClassCell({
  availability,
  onSelect,
  selected,
  compact = false,
  className,
}: {
  availability: Availability;
  onSelect?: () => void;
  selected?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const tone = TONE[availability.state];
  const bookable =
    availability.state === "available" || availability.state === "rac" || availability.state === "waitlist";
  const entry = GLOSSARY[availability.classCode];
  const reading = explainStatus(availability.label);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!bookable || !onSelect}
      title={entry ? `${entry.short} — ${entry.full}` : undefined}
      aria-label={`${entry?.short ?? availability.classCode}, ${availability.label}, ${reading}, ${formatRupees(availability.fare.total)}${bookable && onSelect ? ". Book this" : ""}`}
      className={cn(
        "flex shrink-0 flex-col text-left transition-[border-color,box-shadow] duration-150",
        compact ? "w-[6.25rem] gap-1 rounded-lg border px-2 py-1.5" : "w-[8.5rem] gap-1.5 rounded-xl border p-2.5",
        selected
          ? "border-brand bg-brand-soft"
          : bookable
            ? "border-border bg-surface"
            : "border-dashed border-border bg-transparent",
        bookable && onSelect
          ? cn("cursor-pointer hover:shadow-[var(--shadow-sm)]", tone.ring)
          : "cursor-default opacity-60",
        className
      )}
    >
      <span className="flex items-baseline justify-between gap-1">
        <span className="inline-flex items-center gap-1 font-mono text-[0.75rem] text-dim">
          {!compact && <Armchair className="size-3 text-faint" aria-hidden />}
          {availability.classCode}
        </span>
        <span className="tnum text-[0.75rem] text-text">{formatRupees(availability.fare.total)}</span>
      </span>

      <span className={cn("flex items-center gap-1.5 leading-none", compact ? "text-[0.8125rem]" : "text-[0.9375rem]")}>
        <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
        <span className={cn("tnum", tone.label)}>{availability.label}</span>
      </span>

      {!compact && <span className="text-[0.625rem] leading-tight text-faint">{reading}</span>}

      {!compact &&
        (availability.state === "waitlist" && availability.confirmProbability !== null ? (
          <ProbabilityBar probability={availability.confirmProbability} sampleSize={availability.sampleSize} />
        ) : availability.state === "rac" ? (
          <span className="text-[0.625rem] text-ok">Almost always confirms</span>
        ) : (
          <span className="h-3.5" aria-hidden />
        ))}
    </button>
  );
}
