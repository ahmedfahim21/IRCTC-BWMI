"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ScheduleStop, Station } from "@/lib/types";
import { api } from "@/lib/apiClient";
import { useRailMap } from "./mapContext";

type HaltKind = "halt" | "terminal";

export interface RouteStop {
  lng: number;
  lat: number;
  code: string;
  name: string;
  kind: HaltKind;
  arrivalMinute: number | null;
  departureMinute: number | null;
}

function routeGeometry(
  schedule: ScheduleStop[],
  stations: Record<string, Station>
): {
  coords: [number, number][];
  stops: RouteStop[];
  bounds: [[number, number], [number, number]] | null;
} {
  const coords: [number, number][] = [];
  const stops: RouteStop[] = [];

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
    stops.push({
      lng: station.lng,
      lat: station.lat,
      code: station.code,
      name: station.name,
      kind,
      arrivalMinute: stop.arrivalMinute,
      departureMinute: stop.departureMinute,
    });
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
  fitPadding = 24,
  onSelectStop,
}: {
  trainNumber?: string | null;
  date?: string;
  schedule?: ScheduleStop[];
  stations?: Record<string, Station>;
  fitPadding?: number;
  onSelectStop?: (stop: RouteStop) => void;
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
  return (
    <RouteOverlay
      schedule={resolvedSchedule}
      stations={resolvedStations}
      routeKey={key}
      fitPadding={fitPadding}
      onSelectStop={onSelectStop}
    />
  );
}

function RouteOverlay({
  schedule,
  stations,
  routeKey,
  fitPadding,
  onSelectStop,
}: {
  schedule: ScheduleStop[];
  stations: Record<string, Station>;
  routeKey: string;
  fitPadding: number;
  onSelectStop?: (stop: RouteStop) => void;
}) {
  const { project, fitBounds, ready } = useRailMap();
  const fittedFor = useRef<string | null>(null);
  const { coords, stops, bounds } = routeGeometry(schedule, stations);

  useEffect(() => {
    if (!bounds || !ready) return;
    if (fittedFor.current === routeKey) return;
    fittedFor.current = routeKey;
    fitBounds(bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1], fitPadding);
  }, [bounds, routeKey, fitBounds, fitPadding, ready]);

  const points = coords
    .map(([lng, lat]) => project(lng, lat))
    .filter((pt): pt is { x: number; y: number } => pt !== null);
  const d = points.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

  return (
    <>
      <svg
        data-testid="map-route-overlay"
        className="pointer-events-none absolute inset-0 z-[5] size-full"
        aria-hidden
      >
        {d && (
          <>
            <path
              d={d}
              fill="none"
              stroke="var(--route)"
              strokeOpacity="0.35"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={d}
              fill="none"
              stroke="var(--route)"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
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
              fill={terminal ? "var(--route)" : "var(--surface)"}
              stroke={terminal ? "var(--surface)" : "var(--route)"}
              strokeWidth={terminal ? 2 : 1.6}
            />
          );
        })}
      </svg>
      {onSelectStop && (
        <div className="pointer-events-none absolute inset-0 z-[6]" data-testid="map-route-stops">
          {stops.map((stop) => {
            const pt = project(stop.lng, stop.lat);
            if (!pt) return null;
            const terminal = stop.kind === "terminal";
            return (
              <button
                key={`hit-${stop.kind}-${stop.code}`}
                type="button"
                className="pointer-events-auto absolute rounded-full border-0 bg-transparent p-0"
                style={{
                  left: pt.x,
                  top: pt.y,
                  width: terminal ? 24 : 20,
                  height: terminal ? 24 : 20,
                  transform: "translate(-50%, -50%)",
                }}
                aria-label={`${stop.name} (${stop.code})`}
                title={stop.name}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectStop(stop);
                }}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
