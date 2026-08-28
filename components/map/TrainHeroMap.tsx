"use client";

import { useState } from "react";
import { ClientRailMap } from "./ClientRailMap";
import { MapControls } from "./MapControls";
import { RouteLayer } from "./RouteLayer";
import { StationPins, type StationPin } from "./StationPins";
import { StationCallout } from "./StationCallout";
import type { LiveStatus, ScheduleStop, Station } from "@/lib/types";
import { cn } from "@/components/ui/cn";

export function TrainHeroMap({
  trainNumber,
  schedule,
  stations,
  live,
  highlightFrom,
  highlightTo,
  className,
}: {
  trainNumber: string;
  schedule: ScheduleStop[];
  stations: Record<string, Station>;
  live?: LiveStatus | null;
  highlightFrom?: string;
  highlightTo?: string;
  className?: string;
}) {
  const origin = highlightFrom ? stations[highlightFrom] : stations[schedule[0]?.stationCode];
  const dest = highlightTo ? stations[highlightTo] : stations[schedule[schedule.length - 1]?.stationCode];
  const pins: StationPin[] = [];
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lng)) {
    pins.push({ code: origin.code, name: origin.name, lat: origin.lat, lng: origin.lng, kind: "origin" });
  }
  if (dest && Number.isFinite(dest.lat) && Number.isFinite(dest.lng)) {
    pins.push({ code: dest.code, name: dest.name, lat: dest.lat, lng: dest.lng, kind: "destination" });
  }

  return (
    <div className={cn("overflow-hidden rounded-[14px] border border-border", className)}>
      <ClientRailMap>
        <MapControls />
        <RouteLayer trainNumber={trainNumber} schedule={schedule} stations={stations} />
        <StationPins pins={pins} />
      </ClientRailMap>
      {live && live.state !== "notStarted" && Number.isFinite(live.position.lat) && (
        <span className="sr-only">
          Live position {live.position.lat.toFixed(2)}, {live.position.lng.toFixed(2)}
        </span>
      )}
    </div>
  );
}
