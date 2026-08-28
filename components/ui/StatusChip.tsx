"use client";

import type { Availability, AvailabilityState } from "@/lib/types";
import { explainStatus, parseStatusLabel } from "@/lib/glossary";
import { Term } from "./Term";
import { cn } from "./cn";
import { Badge } from "./badge";
import { Progress } from "./progress";

/**
 * Colour is never the only signal — each chip carries its own words. That's
 * both an accessibility requirement and the difference between "WL 38" and
 * "38 people ahead of you".
 */
const TONE: Record<AvailabilityState, { text: string; bg: string; ring: string; dot: string }> = {
  available: { text: "text-success", bg: "bg-success-soft", ring: "ring-success/25", dot: "bg-success" },
  rac: { text: "text-warning", bg: "bg-warning-soft", ring: "ring-warning/25", dot: "bg-warning" },
  waitlist: { text: "text-destructive", bg: "bg-destructive-soft", ring: "ring-destructive/25", dot: "bg-destructive" },
  regretted: { text: "text-muted-foreground", bg: "bg-muted", ring: "ring-border", dot: "bg-muted-foreground" },
  notAvailable: { text: "text-muted-foreground", bg: "bg-muted", ring: "ring-border", dot: "bg-muted-foreground" },
  departed: { text: "text-muted-foreground", bg: "bg-muted", ring: "ring-border", dot: "bg-muted-foreground" },
};

export function StatusChip({
  availability,
  size = "md",
  className,
}: {
  availability: Availability;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = TONE[availability.state];
  const { term } = parseStatusLabel(availability.label);

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md ring-1 ring-inset border-transparent",
        tone.bg,
        tone.ring,
        size === "sm" ? "px-1.5 py-0.5 text-[0.6875rem]" : "px-2 py-1 text-xs",
        className
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
      <Term code={term} className={cn(tone.text, "tnum no-underline")}>
        {availability.label}
      </Term>
    </Badge>
  );
}

/** The sentence that sits under every status code. */
export function StatusExplanation({ availability, className }: { availability: Availability; className?: string }) {
  return <span className={cn("text-[0.6875rem] leading-tight text-muted-foreground", className)}>{explainStatus(availability.label)}</span>;
}

/**
 * Confirmation odds, always shown with the sample they came from. A bare
 * percentage would imply a confidence this data doesn't have.
 */
export function ProbabilityBar({
  probability,
  sampleSize,
  className,
}: {
  probability: number;
  sampleSize: number;
  className?: string;
}) {
  const percent = Math.round(probability * 100);
  const tone = percent >= 70 ? "bg-success" : percent >= 40 ? "bg-warning" : "bg-destructive";
  const toneText = percent >= 70 ? "text-success" : percent >= 40 ? "text-warning" : "text-destructive";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Progress
        value={Math.max(3, percent)}
        className={cn(
          "h-1 w-9 bg-secondary",
          tone === "bg-success" && "[&_[data-slot=progress-indicator]]:bg-success",
          tone === "bg-warning" && "[&_[data-slot=progress-indicator]]:bg-warning",
          tone === "bg-destructive" && "[&_[data-slot=progress-indicator]]:bg-destructive"
        )}
        role="img"
        aria-label={`${percent} percent chance of confirming, based on ${sampleSize} similar journeys`}
      />
      <span className={cn("tnum text-[0.6875rem]", toneText)}>{percent}%</span>
      <span className="text-[0.6875rem] text-muted-foreground">· {sampleSize} trips</span>
    </div>
  );
}
