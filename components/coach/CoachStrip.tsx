"use client";

import type { Coach, CoachType } from "@/lib/types";
import type { PlatformPosition } from "@/lib/domain/platform";
import { cn } from "@/components/ui/cn";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrainFront } from "lucide-react";

const COACH_TONE: Partial<Record<CoachType, string>> = {
  ENG: "bg-secondary text-muted-foreground border-input",
  SLR: "bg-secondary text-muted-foreground border-border",
  GS: "bg-secondary text-muted-foreground border-border",
  PC: "bg-warning-soft text-warning border-warning/30",
  "1A": "bg-accent text-primary border-primary/30",
  "2A": "bg-info-soft text-info border-info/30",
  "3A": "bg-info-soft text-info border-info/25",
  "3E": "bg-info-soft text-info border-info/25",
  SL: "bg-success-soft text-success border-success/25",
  CC: "bg-info-soft text-info border-info/25",
  EC: "bg-accent text-primary border-primary/30",
  "2S": "bg-secondary text-muted-foreground border-border",
};

/** The rake, in the order it's actually marshalled behind the loco. */
export function CoachStrip({
  rake,
  selectedCode,
  onSelect,
  className,
}: {
  rake: Coach[];
  selectedCode?: string | null;
  onSelect?: (coach: Coach) => void;
  className?: string;
}) {
  return (
    <ScrollArea className={cn("-mx-1 px-1 pb-1", className)}>
      <ol className="flex w-max items-center gap-1 pb-1" aria-label="Coach order from the engine">
        {rake.map((coach) => {
          const interactive = Boolean(onSelect) && coach.berthCount > 0;
          const Element = interactive ? "button" : "div";
          return (
            <li key={coach.code} className="shrink-0">
              <Element
                {...(interactive ? { type: "button" as const, onClick: () => onSelect!(coach) } : {})}
                aria-label={
                  coach.type === "ENG"
                    ? "Engine"
                    : `Coach ${coach.code}, ${coach.type}${coach.berthCount ? `, ${coach.berthCount} berths` : ""}`
                }
                className={cn(
                  "flex min-w-[2.75rem] flex-col items-center gap-0.5 rounded border px-1.5 py-1.5 transition-colors",
                  COACH_TONE[coach.type] ?? "bg-secondary text-muted-foreground border-border",
                  selectedCode === coach.code && "ring-2 ring-ring ring-offset-1 ring-offset-[color:var(--card)]",
                  interactive && "cursor-pointer hover:brightness-110"
                )}
              >
                <span className="flex items-center gap-0.5 text-[0.6875rem] leading-none">
                  {coach.type === "ENG" && <TrainFront className="size-2.5" aria-hidden />}
                  {coach.code}
                </span>
                <span className="text-[0.5625rem] leading-none opacity-70">
                  {coach.type === "ENG" ? "loco" : coach.type}
                </span>
              </Element>
            </li>
          );
        })}
      </ol>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

/**
 * Where each coach comes to rest on the platform, relative to the foot-over-bridge.
 * This is the single thing people keep another app open on the platform for.
 */
export function PlatformDiagram({
  positions,
  stationName,
  platform,
  highlightCoach,
}: {
  positions: PlatformPosition[];
  stationName: string;
  platform: number | null;
  highlightCoach?: string | null;
}) {
  if (positions.length === 0) return null;
  const lengthM = positions[0].platformLengthM;
  const haulage = positions.filter((p) => p.coach.type !== "ENG");
  const entryPercent = (() => {
    // Recover the entry point from any coach's offset.
    const sample = positions.find((p) => p.direction !== "atEntry") ?? positions[0];
    const sign = sample.direction === "towardsFront" ? -1 : 1;
    const centre = coachCentre(sample, haulage, lengthM);
    return ((centre + sign * sample.distanceFromEntryM) / lengthM) * 100;
  })();

  return (
    <div>
      <p className="mb-2 text-[0.75rem] text-muted-foreground">
        {stationName}
        {platform !== null && (
          <>
            {" · "}
            <span className="text-foreground">Platform {platform}</span>
          </>
        )}
        <span className="text-muted-foreground"> · {lengthM} m long</span>
      </p>

      <div className="relative rounded-lg border border-border bg-muted px-3 pb-7 pt-8">
        {/* Foot-over-bridge marker */}
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `calc(${Math.max(6, Math.min(94, entryPercent))}% )` }}
        >
          <span className="whitespace-nowrap rounded bg-primary px-1.5 py-0.5 text-[0.5625rem] text-primary-foreground">
            Foot-over-bridge
          </span>
          <span className="h-2.5 w-px bg-primary" aria-hidden />
        </div>

        <ScrollArea className="w-full">
        <div className="flex min-w-fit gap-px pb-1">
          {haulage.map((position) => (
            <Tooltip key={position.coach.code}>
              <TooltipTrigger asChild aria-label={position.hint}>
            <div
              tabIndex={-1}
              className={cn(
                "flex h-9 min-w-[1.75rem] flex-1 items-center justify-center rounded-sm border text-[0.5625rem] transition-colors",
                highlightCoach === position.coach.code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground"
              )}
            >
              {position.coach.code}
            </div>
              </TooltipTrigger>
              <TooltipContent>{position.hint}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="absolute inset-x-3 bottom-2 flex justify-between text-[0.5625rem] text-muted-foreground">
          <span>rear of platform</span>
          <span>front of platform</span>
        </div>
      </div>

      {highlightCoach && (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
          {positions.find((p) => p.coach.code === highlightCoach)?.hint}
        </p>
      )}
    </div>
  );
}

function coachCentre(position: PlatformPosition, haulage: PlatformPosition[], lengthM: number): number {
  const index = haulage.findIndex((p) => p.coach.code === position.coach.code);
  const trainLength = haulage.length * 24;
  const start = Math.max(0, (lengthM - trainLength) / 2);
  return start + index * 24 + 12;
}
