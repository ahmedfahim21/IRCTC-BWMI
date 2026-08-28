"use client";

import { useMemo } from "react";
import type { LiveStatus, ScheduleStop, Station } from "@/lib/types";
import { INDIA_PATH, project } from "./indiaOutline";
import { formatDelay } from "@/lib/domain/time";
import { cn } from "@/components/ui/cn";

/**
 * The route on a map, drawn as vector data we already have. No tile server, so
 * it renders instantly, costs nothing on the critical path, and still works on
 * a train in a tunnel — which is where this product is used.
 *
 * The view frames itself to the route, so a 500 km run in Kerala fills the
 * frame instead of being a speck on a map of the subcontinent.
 */
export function SchematicMap({
  schedule,
  stations,
  live,
  highlightFrom,
  highlightTo,
  className,
  aspect = 16 / 9,
}: {
  schedule: ScheduleStop[];
  stations: Record<string, Station>;
  live?: LiveStatus | null;
  highlightFrom?: string;
  highlightTo?: string;
  className?: string;
  /** Width / height of the box the map is drawn into, so the route fills it. */
  aspect?: number;
}) {
  const points = useMemo(
    () =>
      schedule
        .map((stop) => {
          const station = stations[stop.stationCode];
          if (!station || !Number.isFinite(station.lat) || !Number.isFinite(station.lng)) return null;
          const [x, y] = project(station.lng, station.lat);
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          return { x, y, stop, station };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null),
    [schedule, stations]
  );

  const view = useMemo(() => {
    if (points.length === 0) return { x: 0, y: 0, w: 320, h: 320 };
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padding = Math.max(12, Math.max(maxX - minX, maxY - minY) * 0.14);
    const routeW = Math.max(maxX - minX + padding * 2, 40);
    const routeH = Math.max(maxY - minY + padding * 2, 40);

    // Grow the shorter dimension to match the container's aspect, so the route
    // fills the frame instead of sitting in a letterboxed square.
    const w = Math.max(routeW, routeH * aspect);
    const h = Math.max(routeH, routeW / aspect);
    return {
      x: (minX + maxX) / 2 - w / 2,
      y: (minY + maxY) / 2 - h / 2,
      w,
      h,
    };
  }, [points, aspect]);

  const routePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("");

  const fromIndex = points.findIndex((p) => p.stop.stationCode === highlightFrom);
  const toIndex = points.findIndex((p) => p.stop.stationCode === highlightTo);
  const segmentPath =
    fromIndex >= 0 && toIndex > fromIndex
      ? points
          .slice(fromIndex, toIndex + 1)
          .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join("")
      : null;

  const livePoint =
    live && Number.isFinite(live.position.lng) && Number.isFinite(live.position.lat)
      ? project(live.position.lng, live.position.lat)
      : null;
  const scale = Math.max(view.w, view.h) / 320;

  return (
    <div className={cn("relative overflow-hidden rounded-[14px] border border-border bg-surface-2", className)}>
      <svg
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
        role="img"
        aria-label={`Route map from ${points[0]?.station.name} to ${points[points.length - 1]?.station.name}`}
      >
        <path d={INDIA_PATH} className="fill-[color:var(--surface-3)] stroke-[color:var(--border-strong)]" strokeWidth={scale * 0.8} />

        {/* The full run. */}
        <path d={routePath} fill="none" className="stroke-[color:var(--track)]" strokeWidth={scale * 3} strokeLinecap="round" strokeLinejoin="round" />
        {/* Your segment of it. */}
        {segmentPath && (
          <path d={segmentPath} fill="none" className="stroke-[color:var(--brand)]" strokeWidth={scale * 3} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {points
          .filter((p) => p.stop.isHalt)
          .map((p) => (
            <circle
              key={p.stop.stationCode}
              cx={p.x}
              cy={p.y}
              r={scale * 1.6}
              className="fill-[color:var(--surface)] stroke-[color:var(--brand)]"
              strokeWidth={scale * 0.9}
            />
          ))}

        {/* Terminals, larger. */}
        {[points[0], points[points.length - 1]].filter(Boolean).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={scale * 2.6} className="fill-[color:var(--brand)]" />
        ))}

        {livePoint && live && live.state !== "notStarted" && (
          <g>
            <circle cx={livePoint[0]} cy={livePoint[1]} r={scale * 6} className="fill-[color:var(--ok)]" opacity={0.18}>
              <animate attributeName="r" values={`${scale * 4};${scale * 9};${scale * 4}`} dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.28;0;0.28" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={livePoint[0]} cy={livePoint[1]} r={scale * 3} className="fill-[color:var(--ok)] stroke-[color:var(--surface)]" strokeWidth={scale} />
          </g>
        )}
      </svg>

      {live && live.state !== "notStarted" && (
        <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[0.6875rem] text-dim">
          <span className="live-ring relative size-1.5 rounded-full bg-ok text-ok" aria-hidden />
          {live.state === "arrived"
            ? "Arrived"
            : live.state === "halted"
              ? "Standing"
              : /* Speed isn't always reported upstream; don't print a fabricated 0. */
                live.speedKmph > 0
                ? `${live.speedKmph} km/h`
                : formatDelay(live.delayMins)}
        </span>
      )}
    </div>
  );
}
