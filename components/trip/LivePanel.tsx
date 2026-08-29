"use client";

import { AlarmClock, Bell, MapPin, Navigation, Train } from "lucide-react";
import { useState } from "react";
import type { LiveStatus, ScheduleStop, Station } from "@/lib/types";
import type { PlatformPosition } from "@/lib/domain/platform";
import { formatDelay, formatMinute } from "@/lib/domain/time";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/components/ui/cn";

/**
 * Where the train is, and what that means *for you* — the delay and arrival
 * time at your boarding station, not at the train's origin, which is the number
 * every other app shows and almost nobody wants.
 */
export function LivePanel({
  live,
  stations,
  boardingStop,
  alightingStop,
  boardingDelayMins,
  arrivalDelayMins,
  coachPosition,
}: {
  live: LiveStatus;
  stations: Record<string, Station>;
  boardingStop: ScheduleStop;
  alightingStop: ScheduleStop;
  boardingDelayMins: number;
  arrivalDelayMins: number;
  coachPosition: PlatformPosition | null;
}) {
  const { t, locale } = useLocale();
  const running = live.state === "running" || live.state === "halted";
  const lastStation = live.lastStationCode ? stations[live.lastStationCode] : null;
  const nextStation = live.nextStopCode ? stations[live.nextStopCode] : null;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-3">
        {running ? (
          <span className="flex items-center gap-2 text-ok">
            <span className="live-ring relative size-1.5 rounded-full bg-ok" aria-hidden />
            <span className="text-[0.75rem] uppercase tracking-wider">
              {t(live.state === "halted" ? "trip.standing" : "trip.running")}
            </span>
          </span>
        ) : (
          <span className="eyebrow">{t(live.state === "arrived" ? "trip.journeyComplete" : "trip.notStartedYet")}</span>
        )}
        <span className="ml-auto text-[0.6875rem] text-faint">
          {t("trip.updated")}{" "}
          {new Date(live.updatedAt).toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3.5">
        {running && (
          <p className="flex flex-wrap items-baseline gap-x-2 text-[0.875rem] text-dim">
            <Train className="size-3.5 shrink-0 translate-y-0.5 text-faint" aria-hidden />
            {live.state === "halted" ? (
              <>
                {t("trip.standingAt")} <span className="text-text">{lastStation?.name}</span>
              </>
            ) : (
              <>
                {t("trip.past")} <span className="text-text">{lastStation?.name}</span> {locale === "hi" ? "पर" : "at"}{" "}
                <span className="tnum text-text">{live.speedKmph} km/h</span>
              </>
            )}
            {nextStation && (
              <span className="text-faint">
                · {t("trip.next")} {nextStation.name}
              </span>
            )}
          </p>
        )}

        <dl className="grid gap-2.5 sm:grid-cols-2">
          <Fact
            icon={Navigation}
            label={`${locale === "hi" ? "पहुँचता है" : "Reaches"} ${stations[boardingStop.stationCode]?.name}`}
            value={formatMinute((boardingStop.departureMinute ?? 0) + boardingDelayMins)}
            tone={boardingDelayMins > 15 ? "warn" : "ok"}
            note={formatDelay(boardingDelayMins, locale)}
          />
          <Fact
            icon={MapPin}
            label={`${t("results.arrives")} ${stations[alightingStop.stationCode]?.name}`}
            value={formatMinute((alightingStop.arrivalMinute ?? 0) + arrivalDelayMins)}
            tone={arrivalDelayMins > 15 ? "warn" : "ok"}
            note={formatDelay(arrivalDelayMins, locale)}
          />
        </dl>

        {coachPosition && (
          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <p className="mb-1 flex items-center gap-2 text-[0.875rem] text-text">
              <span className="rounded bg-brand px-1.5 py-0.5 text-[0.6875rem] text-on-brand">
                {t("trip.coach")} {coachPosition.coach.code}
              </span>
              {boardingStop.platform !== null && (
                <span className="text-dim">
                  {t("common.platform")} {boardingStop.platform}
                </span>
              )}
            </p>
            <p className="text-[0.8125rem] leading-relaxed text-dim">{coachPosition.hint}.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  note: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2.5">
      <dt className="mb-1 flex items-center gap-1.5 text-[0.625rem] uppercase tracking-wider text-faint">
        <Icon className="size-3" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="flex items-baseline gap-2">
        <span className="tnum text-[1.0625rem] text-text">{value}</span>
        <span className={cn("text-[0.6875rem]", tone === "warn" ? "text-warn" : "text-ok")}>{note}</span>
      </dd>
    </div>
  );
}

/**
 * The alarms. Getting off at the right station at 4am is the actual problem
 * long-distance travellers have, and it's why a separate app exists for it.
 */
export function Alarms({
  boardingName,
  destinationName,
  boardingMinute,
  arrivalMinute,
}: {
  boardingName: string;
  destinationName: string;
  boardingMinute: number;
  arrivalMinute: number;
}) {
  const { t, locale } = useLocale();
  const [boarding, setBoarding] = useState(true);
  const [arrival, setArrival] = useState(true);
  const [leadMins, setLeadMins] = useState(30);

  return (
    <div className="card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[0.9375rem] text-text">
        <Bell className="size-4 text-faint" aria-hidden />
        {t("trip.alarms")}
      </h2>

      <div className="space-y-2">
        <AlarmRow
          enabled={boarding}
          onToggle={setBoarding}
          title={locale === "hi" ? `${boardingName} के लिए निकलें` : `Leave for ${boardingName}`}
          detail={
            locale === "hi"
              ? `${formatMinute(boardingMinute - 90)} — प्रस्थान से लगभग 90 मिनट पहले`
              : `${formatMinute(boardingMinute - 90)} — about 90 minutes before departure`
          }
        />
        <AlarmRow
          enabled={arrival}
          onToggle={setArrival}
          title={locale === "hi" ? `${destinationName} से पहले मुझे जगाएँ` : `Wake me before ${destinationName}`}
          detail={
            locale === "hi"
              ? `${formatMinute(arrivalMinute - leadMins)} — आगमन से ${leadMins} मिनट पहले`
              : `${formatMinute(arrivalMinute - leadMins)} — ${leadMins} minutes before arrival`
          }
        />
      </div>

      {arrival && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="mr-1 text-[0.6875rem] text-faint">{t("trip.wakeMe")}</span>
          {[15, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setLeadMins(mins)}
              aria-pressed={leadMins === mins}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[0.75rem] transition-colors",
                leadMins === mins ? "border-brand bg-brand-soft text-brand" : "border-border text-dim hover:border-border-strong"
              )}
            >
              {mins} {t("trip.minutesBefore")}
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-[0.6875rem] leading-relaxed text-faint">{t("trip.alarmsFootnote")}</p>
    </div>
  );
}

function AlarmRow({
  enabled,
  onToggle,
  title,
  detail,
}: {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className="flex w-full items-start gap-2.5 rounded-lg py-1.5 text-left transition-colors hover:bg-surface-2"
    >
      <AlarmClock className={cn("mt-0.5 size-4 shrink-0", enabled ? "text-brand" : "text-faint")} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.8125rem] text-text">{title}</span>
        <span className="block text-[0.6875rem] text-faint">{detail}</span>
      </span>
      <span
        className={cn("mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors", enabled ? "bg-brand" : "bg-surface-3")}
        aria-hidden
      >
        <span className={cn("size-3 rounded-full bg-[color:var(--surface)] transition-transform", enabled && "translate-x-3")} />
      </span>
    </button>
  );
}
