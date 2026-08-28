"use client";

import { AlarmClock, Bell, MapPin, Navigation, Train } from "lucide-react";
import { useState } from "react";
import type { LiveStatus, ScheduleStop, Station } from "@/lib/types";
import type { PlatformPosition } from "@/lib/domain/platform";
import { formatDelay, formatMinute } from "@/lib/domain/time";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
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
  const running = live.state === "running" || live.state === "halted";
  const lastStation = live.lastStationCode ? stations[live.lastStationCode] : null;
  const nextStation = live.nextStopCode ? stations[live.nextStopCode] : null;

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-3">
        {running ? (
          <span className="flex items-center gap-2 text-success">
            <span className="live-ring relative size-1.5 rounded-full bg-success" aria-hidden />
            <span className="text-[0.75rem] uppercase tracking-wider">
              {live.state === "halted" ? "Standing" : "Running"}
            </span>
          </span>
        ) : (
          <span className="eyebrow">{live.state === "arrived" ? "Journey complete" : "Not started yet"}</span>
        )}
        <span className="ml-auto text-[0.6875rem] text-muted-foreground">
          Updated {new Date(live.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <CardContent className="space-y-3 px-4 py-3.5">
        {running && (
          <p className="flex flex-wrap items-baseline gap-x-2 text-[0.875rem] text-muted-foreground">
            <Train className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground" aria-hidden />
            {live.state === "halted" ? (
              <>Standing at <span className="text-foreground">{lastStation?.name}</span></>
            ) : (
              <>
                Past <span className="text-foreground">{lastStation?.name}</span> at{" "}
                <span className="tnum text-foreground">{live.speedKmph} km/h</span>
              </>
            )}
            {nextStation && <span className="text-muted-foreground">· next {nextStation.name}</span>}
          </p>
        )}

        <dl className="grid gap-2.5 sm:grid-cols-2">
          <Fact
            icon={Navigation}
            label={`Reaches ${stations[boardingStop.stationCode]?.name}`}
            value={formatMinute((boardingStop.departureMinute ?? 0) + boardingDelayMins)}
            tone={boardingDelayMins > 15 ? "warn" : "ok"}
            note={formatDelay(boardingDelayMins)}
          />
          <Fact
            icon={MapPin}
            label={`Arrives ${stations[alightingStop.stationCode]?.name}`}
            value={formatMinute((alightingStop.arrivalMinute ?? 0) + arrivalDelayMins)}
            tone={arrivalDelayMins > 15 ? "warn" : "ok"}
            note={formatDelay(arrivalDelayMins)}
          />
        </dl>

        {coachPosition && (
          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="mb-1 flex items-center gap-2 text-[0.875rem] text-foreground">
              <span className="rounded bg-primary px-1.5 py-0.5 text-[0.6875rem] text-primary-foreground">
                Coach {coachPosition.coach.code}
              </span>
              {boardingStop.platform !== null && <span className="text-muted-foreground">Platform {boardingStop.platform}</span>}
            </p>
            <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">{coachPosition.hint}.</p>
          </div>
        )}
      </CardContent>
    </Card>
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
    <div className="rounded-lg border border-border bg-muted px-3 py-2.5">
      <dt className="mb-1 flex items-center gap-1.5 text-[0.625rem] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        <span className="truncate">{label}</span>
      </dt>
      <dd className="flex items-baseline gap-2">
        <span className="tnum text-[1.0625rem] text-foreground">{value}</span>
        <span className={cn("text-[0.6875rem]", tone === "warn" ? "text-warning" : "text-success")}>{note}</span>
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
  const [boarding, setBoarding] = useState(true);
  const [arrival, setArrival] = useState(true);
  const [leadMins, setLeadMins] = useState(30);

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[0.9375rem] text-foreground">
        <Bell className="size-4 text-muted-foreground" aria-hidden />
        Alarms
      </h2>

      <div className="space-y-2">
        <AlarmRow
          id="boarding-alarm"
          enabled={boarding}
          onToggle={setBoarding}
          title={`Leave for ${boardingName}`}
          detail={`${formatMinute(boardingMinute - 90)} — about 90 minutes before departure`}
        />
        <AlarmRow
          id="arrival-alarm"
          enabled={arrival}
          onToggle={setArrival}
          title={`Wake me before ${destinationName}`}
          detail={`${formatMinute(arrivalMinute - leadMins)} — ${leadMins} minutes before arrival`}
        />
      </div>

      {arrival && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          <span className="mr-1 text-[0.6875rem] text-muted-foreground">Wake me</span>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={String(leadMins)}
            onValueChange={(value) => value && setLeadMins(Number(value))}
          >
            {[15, 30, 45, 60].map((mins) => (
              <ToggleGroupItem
                key={mins}
                value={String(mins)}
                aria-label={`${mins} minutes before arrival`}
                className="rounded-lg border px-2.5 py-1 text-[0.75rem] data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:text-primary"
              >
                {mins} min before
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted-foreground">
        Alarms track the train&rsquo;s actual running, not the timetable — if it runs late, they move with it.
      </p>
      </CardContent>
    </Card>
  );
}

function AlarmRow({
  id,
  enabled,
  onToggle,
  title,
  detail,
}: {
  id: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex w-full items-start gap-2.5 rounded-lg py-1.5">
      <AlarmClock className={cn("mt-0.5 size-4 shrink-0", enabled ? "text-primary" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0 flex-1">
        <Label htmlFor={id} className="block cursor-pointer text-[0.8125rem] font-normal text-foreground">{title}</Label>
        <span className="block text-[0.6875rem] text-muted-foreground">{detail}</span>
      </div>
      <Switch id={id} checked={enabled} onCheckedChange={(next) => { onToggle(next); if (next) toast.success(`Alarm set — ${title}`); }} aria-label={title} className="mt-0.5" />
    </div>
  );
}
