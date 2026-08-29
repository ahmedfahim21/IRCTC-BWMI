"use client";

import type { Coach, CoachType } from "@/lib/types";
import type { PlatformPosition } from "@/lib/domain/platform";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/components/ui/cn";
import { TrainFront } from "lucide-react";

const COACH_TONE: Partial<Record<CoachType, string>> = {
  ENG: "bg-surface-3 text-faint border-border-strong",
  SLR: "bg-surface-3 text-faint border-border",
  GS: "bg-surface-3 text-dim border-border",
  PC: "bg-warn-soft text-warn border-warn/30",
  "1A": "bg-brand-soft text-brand border-brand/30",
  "2A": "bg-info-soft text-info border-info/30",
  "3A": "bg-info-soft text-info border-info/25",
  "3E": "bg-info-soft text-info border-info/25",
  SL: "bg-ok-soft text-ok border-ok/25",
  CC: "bg-info-soft text-info border-info/25",
  EC: "bg-brand-soft text-brand border-brand/30",
  "2S": "bg-surface-3 text-dim border-border",
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
  const { t, locale } = useLocale();
  return (
    <div className={cn("-mx-1 overflow-x-auto px-1 pb-1", className)}>
      <ol className="flex items-center gap-1" aria-label={t("coach.orderAria")}>
        {rake.map((coach) => {
          const interactive = Boolean(onSelect) && coach.berthCount > 0;
          const Element = interactive ? "button" : "div";
          return (
            <li key={coach.code} className="shrink-0">
              <Element
                {...(interactive ? { type: "button" as const, onClick: () => onSelect!(coach) } : {})}
                aria-label={
                  coach.type === "ENG"
                    ? t("coach.engine")
                    : locale === "hi"
                      ? `कोच ${coach.code}, ${coach.type}${coach.berthCount ? `, ${coach.berthCount} बर्थ` : ""}`
                      : `Coach ${coach.code}, ${coach.type}${coach.berthCount ? `, ${coach.berthCount} berths` : ""}`
                }
                className={cn(
                  "flex min-w-[2.75rem] flex-col items-center gap-0.5 rounded border px-1.5 py-1.5 transition-colors",
                  COACH_TONE[coach.type] ?? "bg-surface-3 text-dim border-border",
                  selectedCode === coach.code && "ring-2 ring-brand ring-offset-1 ring-offset-[color:var(--surface)]",
                  interactive && "cursor-pointer hover:brightness-110"
                )}
              >
                <span className="flex items-center gap-0.5 text-[0.6875rem] leading-none">
                  {coach.type === "ENG" && <TrainFront className="size-2.5" aria-hidden />}
                  {coach.code}
                </span>
                <span className="text-[0.5625rem] leading-none opacity-70">
                  {coach.type === "ENG" ? t("coach.loco") : coach.type}
                </span>
              </Element>
            </li>
          );
        })}
      </ol>
    </div>
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
  const { t, locale } = useLocale();
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
      <p className="mb-2 text-[0.75rem] text-dim">
        {stationName}
        {platform !== null && (
          <>
            {" · "}
            <span className="text-text">{t("common.platform")} {platform}</span>
          </>
        )}
        <span className="text-faint">
          {" · "}
          {locale === "hi" ? `${lengthM} मी. लंबा` : `${lengthM} m long`}
        </span>
      </p>

      <div className="relative rounded-lg border border-border bg-surface-2 px-3 pb-7 pt-8">
        {/* Foot-over-bridge marker */}
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `calc(${Math.max(6, Math.min(94, entryPercent))}% )` }}
        >
          <span className="whitespace-nowrap rounded bg-brand px-1.5 py-0.5 text-[0.5625rem] text-on-brand">
            {t("coach.footOverBridge")}
          </span>
          <span className="h-2.5 w-px bg-brand" aria-hidden />
        </div>

        <div className="flex gap-px overflow-x-auto">
          {haulage.map((position) => (
            <div
              key={position.coach.code}
              title={position.hint}
              className={cn(
                "flex h-9 min-w-[1.75rem] flex-1 items-center justify-center rounded-sm border text-[0.5625rem] transition-colors",
                highlightCoach === position.coach.code
                  ? "border-brand bg-brand text-on-brand"
                  : "border-border bg-surface text-faint"
              )}
            >
              {position.coach.code}
            </div>
          ))}
        </div>

        <div className="absolute inset-x-3 bottom-2 flex justify-between text-[0.5625rem] text-faint">
          <span>{t("coach.rearOfPlatform")}</span>
          <span>{t("coach.frontOfPlatform")}</span>
        </div>
      </div>

      {highlightCoach && (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-dim">
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
