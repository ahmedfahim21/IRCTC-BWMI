"use client";

import type { Availability, AvailabilityState } from "@/lib/types";
import { explainStatus, parseStatusLabel } from "@/lib/glossary";
import { useLocale } from "@/lib/i18n/useLocale";
import { Term } from "./Term";
import { cn } from "./cn";

/**
 * Colour is never the only signal — each chip carries its own words. That's
 * both an accessibility requirement and the difference between "WL 38" and
 * "38 people ahead of you".
 */
const TONE: Record<AvailabilityState, { text: string; bg: string; ring: string; dot: string }> = {
  available: { text: "text-ok", bg: "bg-ok-soft", ring: "ring-ok/25", dot: "bg-ok" },
  rac: { text: "text-warn", bg: "bg-warn-soft", ring: "ring-warn/25", dot: "bg-warn" },
  waitlist: { text: "text-danger", bg: "bg-danger-soft", ring: "ring-danger/25", dot: "bg-danger" },
  regretted: { text: "text-faint", bg: "bg-surface-2", ring: "ring-border", dot: "bg-faint" },
  notAvailable: { text: "text-faint", bg: "bg-surface-2", ring: "ring-border", dot: "bg-faint" },
  departed: { text: "text-faint", bg: "bg-surface-2", ring: "ring-border", dot: "bg-faint" },
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
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md ring-1 ring-inset",
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
    </span>
  );
}

/** The sentence that sits under every status code. */
export function StatusExplanation({ availability, className }: { availability: Availability; className?: string }) {
  const { locale } = useLocale();
  return <span className={cn("text-[0.6875rem] leading-tight text-faint", className)}>{explainStatus(availability.label, locale)}</span>;
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
  const { locale } = useLocale();
  const percent = Math.round(probability * 100);
  const tone = percent >= 70 ? "bg-ok" : percent >= 40 ? "bg-warn" : "bg-danger";
  const toneText = percent >= 70 ? "text-ok" : percent >= 40 ? "text-warn" : "text-danger";
  const ariaLabel =
    locale === "hi"
      ? `${sampleSize} मिलती-जुलती यात्राओं के आधार पर कन्फर्म होने की ${percent} प्रतिशत संभावना`
      : `${percent} percent chance of confirming, based on ${sampleSize} similar journeys`;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className="h-1 w-9 overflow-hidden rounded-full bg-surface-3"
        role="img"
        aria-label={ariaLabel}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${Math.max(3, percent)}%` }} />
      </div>
      <span className={cn("tnum text-[0.6875rem]", toneText)}>{percent}%</span>
      <span className="text-[0.6875rem] text-faint">
        · {sampleSize} {locale === "hi" ? "यात्राएँ" : "trips"}
      </span>
    </div>
  );
}
