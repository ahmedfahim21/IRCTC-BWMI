"use client";

import { useMemo, useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import type { LiveStatus, ScheduleStop, Station } from "@/lib/types";
import { formatDateShort, formatDelay, formatDuration, formatMinute } from "@/lib/domain/time";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/components/ui/cn";

export interface SpineTimeline {
  stationCode: string;
  delayMins: number;
  actualArrival: number | null;
  actualDeparture: number | null;
}

/**
 * The full run, every stop — including the stations a train only passes
 * through, which is most of them and which no booking site bothers to show.
 * Scheduled time sits above; the actual or expected time sits below it in the
 * colour of how late it is.
 */
export function RailSpine({
  schedule,
  stations,
  dateIso,
  timeline,
  live,
  highlightFrom,
  highlightTo,
}: {
  schedule: ScheduleStop[];
  stations: Record<string, Station>;
  dateIso: string;
  timeline?: SpineTimeline[];
  live?: LiveStatus | null;
  highlightFrom?: string;
  highlightTo?: string;
}) {
  const { t, locale } = useLocale();
  const [haltsOnly, setHaltsOnly] = useState(false);

  const actualByStation = useMemo(
    () => new Map((timeline ?? []).map((entry) => [entry.stationCode, entry])),
    [timeline]
  );

  const highlightRange = useMemo(() => {
    if (!highlightFrom || !highlightTo) return null;
    const from = schedule.findIndex((s) => s.stationCode === highlightFrom);
    const to = schedule.findIndex((s) => s.stationCode === highlightTo);
    return from >= 0 && to >= 0 ? { from, to } : null;
  }, [schedule, highlightFrom, highlightTo]);

  const visible = haltsOnly ? schedule.filter((s) => s.isHalt) : schedule;
  const hiddenCount = schedule.length - schedule.filter((s) => s.isHalt).length;

  // Where the live puck sits, as a fraction between two visible rows.
  const liveIndex = live?.lastStationCode
    ? visible.findIndex((s) => s.stationCode === live.lastStationCode)
    : -1;

  const startDate = new Date(`${dateIso}T00:00:00Z`);
  const dayLabel = (offset: number) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + offset);
    return formatDateShort(d.toISOString().slice(0, 10), locale);
  };

  let lastDay = -1;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="eyebrow">
          {visible.length} {t("trip.stops")}
          {!haltsOnly && hiddenCount > 0 && (
            <span className="normal-case">
              {" "}
              · {hiddenCount} {locale === "hi" ? "बिना रुके गुज़री" : "passed without stopping"}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={() => setHaltsOnly((v) => !v)}
          aria-pressed={haltsOnly}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-[0.6875rem] text-dim transition-colors hover:border-border-strong"
        >
          {haltsOnly ? <Eye className="size-3" aria-hidden /> : <EyeOff className="size-3" aria-hidden />}
          {haltsOnly ? t("spine.showEvery") : t("spine.haltsOnly")}
        </button>
      </div>

      <ol className="relative">
        {visible.map((stop, index) => {
          const station = stations[stop.stationCode];
          const actual = actualByStation.get(stop.stationCode);
          const showDayDivider = stop.dayOffset !== lastDay;
          if (showDayDivider) lastDay = stop.dayOffset;

          const inHighlight =
            highlightRange !== null &&
            schedule.findIndex((s) => s.stationCode === stop.stationCode) >= highlightRange.from &&
            schedule.findIndex((s) => s.stationCode === stop.stationCode) <= highlightRange.to;

          const isTerminus = index === 0 || index === visible.length - 1;
          const passed = live ? live.distanceCoveredKm >= stop.distanceKm : false;
          const isHere = live?.lastStationCode === stop.stationCode && live.state === "halted";

          return (
            <li key={`${stop.stationCode}-${stop.distanceKm}`}>
              {showDayDivider && (
                <div className="flex items-center gap-2 py-2 pl-[4.25rem]">
                  <span className="h-px flex-1 bg-border" aria-hidden />
                  <span className="eyebrow">
                    {locale === "hi" ? `दिन ${stop.dayOffset + 1}` : `Day ${stop.dayOffset + 1}`} · {dayLabel(stop.dayOffset)}
                  </span>
                  <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
              )}

              <div className={cn("relative flex gap-3", inHighlight && "bg-brand-soft")}>
                {/* Times */}
                <div className="w-[3.75rem] shrink-0 py-1.5 text-right">
                  {stop.arrivalMinute !== null && (
                    <p className="tnum text-[0.8125rem] leading-tight text-text">{formatMinute(stop.arrivalMinute)}</p>
                  )}
                  {stop.departureMinute !== null && stop.arrivalMinute !== stop.departureMinute && (
                    <p className="tnum text-[0.8125rem] leading-tight text-dim">{formatMinute(stop.departureMinute)}</p>
                  )}
                  {actual && actual.delayMins > 2 && (
                    <p className="tnum text-[0.6875rem] leading-tight text-warn">
                      {formatMinute((stop.arrivalMinute ?? stop.departureMinute!) + actual.delayMins)}
                    </p>
                  )}
                </div>

                {/* Track */}
                <div className="relative flex w-4 shrink-0 justify-center">
                  <span
                    className={cn(
                      "absolute inset-y-0 w-[3px]",
                      passed ? "bg-track-live" : "rail-track"
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "relative z-10 mt-2.5 rounded-full transition-colors",
                      stop.isHalt
                        ? isTerminus
                          ? "size-3 border-2 border-brand bg-[color:var(--surface)]"
                          : "size-2.5 border-2 border-brand bg-[color:var(--surface)]"
                        : "size-1.5 bg-track",
                      passed && stop.isHalt && "bg-brand",
                      isHere && "border-ok bg-ok"
                    )}
                    aria-hidden
                  />
                  {isHere && (
                    <span className="live-ring absolute z-0 mt-2.5 size-2.5 rounded-full text-ok" aria-hidden />
                  )}
                </div>

                {/* Station */}
                <div className={cn("min-w-0 flex-1 py-1.5", !stop.isHalt && "opacity-55")}>
                  <div className="flex items-baseline gap-2">
                    <p className={cn("truncate", stop.isHalt ? "text-[0.875rem] text-text" : "text-[0.75rem] text-dim")}>
                      {station?.name ?? stop.stationCode}
                    </p>
                    {stop.platform !== null && (
                      <span className="tnum shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[0.625rem] text-dim">
                        {locale === "hi" ? `प्ल. ${stop.platform}` : `PF ${stop.platform}`}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.6875rem] text-faint">
                    <span className="font-mono">{stop.stationCode}</span>
                    <span className="tnum">{stop.distanceKm} {t("common.km")}</span>
                    {stop.haltMins > 0 && (
                      <span className="text-dim">
                        {locale === "hi" ? `${stop.haltMins} मिनट ठहराव` : `${stop.haltMins} min halt`}
                      </span>
                    )}
                    {!stop.isHalt && <span>{t("spine.passesThrough")}</span>}
                    {actual && actual.delayMins > 2 && (
                      <span className="text-warn">{formatDelay(actual.delayMins, locale)}</span>
                    )}
                  </p>
                </div>
              </div>
            </li>
          );
        })}

        {/* The train, between two stations. */}
        {live && live.state === "running" && liveIndex >= 0 && (
          <RunningMarker live={live} nextStationName={stations[live.nextStopCode ?? ""]?.name} />
        )}
      </ol>
    </div>
  );
}

function RunningMarker({ live, nextStationName }: { live: LiveStatus; nextStationName?: string }) {
  const { t, locale } = useLocale();
  return (
    <li className="sticky bottom-3 z-20 mt-3 list-none">
      <div className="mx-auto flex w-fit items-center gap-2.5 rounded-full border border-ok/40 bg-surface px-3 py-1.5 shadow-[var(--shadow-md)]">
        <span className="live-ring relative size-2 rounded-full bg-ok text-ok" aria-hidden />
        {live.speedKmph > 0 && (
          <span className="text-[0.75rem] text-text">
            <span className="tnum">{live.speedKmph}</span> km/h
          </span>
        )}
        <span className="text-[0.75rem] text-dim">
          <span className="tnum">{Math.round(live.distanceCoveredKm)}</span> {t("common.km")}{" "}
          {locale === "hi" ? "आगे" : "in"}
          {nextStationName ? ` · ${t("trip.next")} ${nextStationName}` : ""}
        </span>
        <span className={cn("text-[0.75rem]", live.delayMins > 5 ? "text-warn" : "text-ok")}>
          {formatDelay(live.delayMins, locale)}
        </span>
      </div>
    </li>
  );
}

/** Halt duration summary used above the spine. */
export function journeySummary(schedule: ScheduleStop[]) {
  const first = schedule[0];
  const last = schedule[schedule.length - 1];
  return {
    departure: formatMinute(first.departureMinute),
    arrival: formatMinute(last.arrivalMinute),
    duration: formatDuration((last.arrivalMinute ?? 0) - (first.departureMinute ?? 0)),
  };
}
