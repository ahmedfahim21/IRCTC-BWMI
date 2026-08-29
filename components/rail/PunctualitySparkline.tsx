"use client";

import type { PunctualityDay } from "@/lib/types";
import { formatDateShort } from "@/lib/domain/time";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/components/ui/cn";

/**
 * How late this train actually ran, over its last 30 outings. Sets expectations
 * honestly rather than quoting a scheduled arrival nobody believes.
 */
export function PunctualitySparkline({ history }: { history: PunctualityDay[] }) {
  const { locale } = useLocale();
  if (history.length === 0) return null;

  const delays = history.filter((d) => !d.cancelled).map((d) => d.delayMins);
  const max = Math.max(30, ...delays);
  const median = [...delays].sort((a, b) => a - b)[Math.floor(delays.length / 2)] ?? 0;
  const onTime = delays.filter((d) => d <= 15).length;
  const cancellations = history.filter((d) => d.cancelled).length;

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-[0.8125rem] text-dim">
          {locale === "hi" ? (
            <>
              पिछली{" "}
              <span className="tnum text-text">
                {delays.length} में से {onTime}
              </span>{" "}
              यात्राएँ समय-सारणी के 15 मिनट के भीतर चलीं
            </>
          ) : (
            <>
              Ran within 15 minutes of schedule on{" "}
              <span className="tnum text-text">
                {onTime} of {delays.length}
              </span>{" "}
              recent trips
            </>
          )}
        </p>
        <p className="text-[0.75rem] text-faint">
          {locale === "hi" ? "सामान्य देरी" : "typical delay"}{" "}
          <span className="tnum text-dim">{median} {locale === "hi" ? "मिनट" : "min"}</span>
          {cancellations > 0 && (
            <span className="ml-2 text-warn">
              {cancellations} {locale === "hi" ? "रद्द" : "cancelled"}
            </span>
          )}
        </p>
      </div>

      <div
        className="flex h-16 items-end gap-[2px]"
        role="img"
        aria-label={
          locale === "hi"
            ? `पिछली ${history.length} यात्राओं में देरी, औसत ${median} मिनट`
            : `Delay over the last ${history.length} trips, median ${median} minutes`
        }
      >
        {history.map((day) => {
          const height = day.cancelled ? 100 : Math.max(4, (day.delayMins / max) * 100);
          const tone = day.cancelled
            ? "bg-faint"
            : day.delayMins <= 15
              ? "bg-ok"
              : day.delayMins <= 45
                ? "bg-warn"
                : "bg-danger";
          const status = day.cancelled
            ? locale === "hi" ? "रद्द" : "cancelled"
            : locale === "hi" ? `${day.delayMins} मिनट देरी से` : `${day.delayMins} min late`;
          return (
            <span
              key={day.date}
              title={`${formatDateShort(day.date, locale)} — ${status}`}
              className={cn("flex-1 rounded-sm transition-opacity hover:opacity-70", tone, day.cancelled && "opacity-40")}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>

      <div className="mt-1.5 flex justify-between text-[0.625rem] text-faint">
        <span>{formatDateShort(history[0].date, locale)}</span>
        <span>{formatDateShort(history[history.length - 1].date, locale)}</span>
      </div>
    </div>
  );
}
