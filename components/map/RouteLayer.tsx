"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ScheduleStop, Station } from "@/lib/types";
import { api } from "@/lib/apiClient";
import { useRailMap } from "./mapContext";

type HaltKind = "halt" | "terminal";

function routeGeometry(
  schedule: ScheduleStop[],
  stations: Record<string, Station>
): {
  coords: [number, number][];
  stops: { lng: number; lat: number; code: string; kind: HaltKind }[];
  bounds: [[number, number], [number, number]] | null;
} {
  const coords: [number, number][] = [];
  const stops: { lng: number; lat: number; code: string; kind: HaltKind }[] = [];

  const usable = schedule.filter((stop) => {
    const station = stations[stop.stationCode];
    return station && Number.isFinite(station.lat) && Number.isFinite(station.lng);
  });

  usable.forEach((stop, index) => {
    const station = stations[stop.stationCode];
    const pair: [number, number] = [station.lng, station.lat];
    coords.push(pair);
    const kind: HaltKind | "pass" =
      index === 0 || index === usable.length - 1 ? "terminal" : stop.isHalt ? "halt" : "pass";
    if (kind === "pass") return;
    stops.push({ lng: station.lng, lat: station.lat, code: station.code, kind });
  });

  if (coords.length === 0) return { coords, stops, bounds: null };
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return { coords, stops, bounds: [[minLng, minLat], [maxLng, maxLat]] };
}

/**
 * A train's route from `/api/trains/{number}` — schedule zipped with station
 * coordinates — plus halt circles, origin/destination pins, and fitBounds.
 */
export function RouteLayer({
  trainNumber,
  date,
  schedule,
  stations,
}: {
  trainNumber?: string | null;
  date?: string;
  schedule?: ScheduleStop[];
  stations?: Record<string, Station>;
}) {
  const { data } = useQuery({
    queryKey: ["train", trainNumber, date],
    queryFn: ({ signal }) => api.train(trainNumber!, date, signal),
    enabled: Boolean(trainNumber) && !schedule,
  });

  const resolvedSchedule = schedule ?? data?.train.schedule;
  const resolvedStations = stations ?? data?.stations;
  const key = trainNumber ?? "";

  if (!resolvedSchedule || !resolvedStations || !key) return null;
  return <RouteOverlay schedule={resolvedSchedule} stations={resolvedStations} routeKey={key} />;
}

function RouteOverlay({
  schedule,
  stations,
  routeKey,
}: {
  schedule: ScheduleStop[];
  stations: Record<string, Station>;
  routeKey: string;
}) {
  const { project, fitBounds } = useRailMap();
  const fittedFor = useRef<string | null>(null);
  const { coords, stops, bounds } = routeGeometry(schedule, stations);

  useEffect(() => {
    if (!bounds) return;
    if (fittedFor.current === routeKey) return;
    fittedFor.current = routeKey;
    fitBounds(bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1], 48);
  }, [bounds, routeKey, fitBounds]);

  const points = coords
    .map(([lng, lat]) => project(lng, lat))
    .filter((pt): pt is { x: number; y: number } => pt !== null);
  const d = points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

  return (
    <svg
      data-testid="map-route-overlay"
      className="pointer-events-none absolute inset-0 z-[5] size-full"
      aria-hidden
    >
      {d && (
        <path d={d} fill="none" stroke="var(--primary)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {stops.map((stop) => {
        const pt = project(stop.lng, stop.lat);
        if (!pt) return null;
        const terminal = stop.kind === "terminal";
        return (
          <circle
            key={`${stop.kind}-${stop.code}`}
            cx={pt.x}
            cy={pt.y}
            r={terminal ? 6 : 4}
            fill={terminal ? "var(--primary)" : "var(--card)"}
            stroke={terminal ? "var(--card)" : "var(--primary)"}
            strokeWidth={terminal ? 2 : 1.6}
          />
        );
      })}
    </svg>
  );
}
