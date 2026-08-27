"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { INDIA_MAINLAND, INDIA_RINGS, project } from "@/components/rail/indiaOutline";
import type { PackedTrain } from "@/lib/railradar/liveMap";
import { cn } from "@/components/ui/cn";

/**
 * Every running train in the country, on one map.
 *
 * Drawn to a canvas rather than SVG: at ~2,800 moving points, that many DOM
 * nodes is the difference between smooth and unusable on the cheap Android
 * phones most of this app's users are actually holding.
 */

/** Colour per train type index, matching lib/railradar/liveMap.ts. */
const TYPE_COLOURS = [
  "#ff5a5f", // Rajdhani
  "#ffb648", // Shatabdi
  "#3ecb84", // Vande Bharat
  "#c084fc", // Duronto
  "#62aeff", // Superfast
  "#8f80ff", // Express
  "#94a3b8", // Passenger
  "#f472b6", // Special
  "#64748b", // Other
];

export interface MapTrain {
  number: string;
  name: string;
  lat: number;
  lng: number;
  type: number;
}

interface View {
  scale: number;
  x: number;
  y: number;
}

const unpack = (t: PackedTrain): MapTrain => ({ number: t[0], name: t[1], lat: t[2], lng: t[3], type: t[4] });

export function TrainMap({
  trains,
  types,
  activeTypes,
  onSelect,
  selected,
}: {
  trains: PackedTrain[];
  types: readonly string[];
  activeTypes: Set<number>;
  onSelect: (train: MapTrain | null) => void;
  selected: MapTrain | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const points = useMemo(
    () =>
      trains
        .filter((t) => activeTypes.has(t[4]))
        .map((t) => {
          const [x, y] = project(t[3], t[2]);
          return { x, y, train: unpack(t) };
        }),
    [trains, activeTypes]
  );
  const pointsRef = useRef(points);
  pointsRef.current = points;

  const rings = useMemo(() => INDIA_RINGS.map((ring) => ring.map(([lng, lat]) => project(lng, lat))), []);
  // Framed on the mainland alone, so offshore territory doesn't zoom the
  // country out to a speck.
  const outline = useMemo(() => INDIA_MAINLAND.map(([lng, lat]) => project(lng, lat)), []);

  /** Fit India to the viewport on first paint and on resize. */
  const fit = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { width, height } = wrap.getBoundingClientRect();
    const xs = outline.map((p) => p[0]);
    const ys = outline.map((p) => p[1]);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const scale = Math.min(width / w, height / h) * 0.92;
    setView({
      scale,
      x: width / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * scale,
      y: height / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2) * scale,
    });
  }, [outline]);

  useEffect(() => {
    fit();
    const observer = new ResizeObserver(fit);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [fit]);

  /** Draw. Runs on every view change; cheap because it's one canvas pass. */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const style = getComputedStyle(document.documentElement);
    const surface = style.getPropertyValue("--surface-3").trim() || "#1e242f";
    const border = style.getPropertyValue("--border-strong").trim() || "#333c4c";

    const tx = (x: number) => x * view.scale + view.x;
    const ty = (y: number) => y * view.scale + view.y;

    // Landmass — every ring in one path, so a single fill covers the country.
    ctx.beginPath();
    for (const ring of rings) {
      ring.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(tx(x), ty(y)) : ctx.lineTo(tx(x), ty(y))));
      ctx.closePath();
    }
    ctx.fillStyle = surface;
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Trains, batched per colour so we set fillStyle nine times, not 2,800.
    const radius = Math.max(1.4, Math.min(4, view.scale * 0.55));
    const byType = new Map<number, typeof points>();
    for (const point of points) {
      const list = byType.get(point.train.type) ?? [];
      list.push(point);
      byType.set(point.train.type, list);
    }

    for (const [type, list] of byType) {
      ctx.fillStyle = TYPE_COLOURS[type] ?? TYPE_COLOURS[8];
      ctx.beginPath();
      for (const point of list) {
        const px = tx(point.x);
        const py = ty(point.y);
        if (px < -20 || py < -20 || px > width + 20 || py > height + 20) continue;
        ctx.moveTo(px + radius, py);
        ctx.arc(px, py, radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    if (selected) {
      const [sx, sy] = project(selected.lng, selected.lat);
      ctx.beginPath();
      ctx.arc(tx(sx), ty(sy), radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = style.getPropertyValue("--text").trim() || "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [points, rings, view, selected]);

  /** Pointer handling: drag to pan, wheel or pinch to zoom. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const pinchStart = useRef<{ distance: number; scale: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent) => {
    (event.target as Element).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragged.current = false;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinchStart.current) {
        pinchStart.current = { distance, scale: viewRef.current.scale };
      } else {
        const next = Math.max(0.4, Math.min(60, (pinchStart.current.scale * distance) / pinchStart.current.distance));
        zoomTo(next, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      dragged.current = true;
      return;
    }

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) dragged.current = true;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (dragged.current || pointers.current.size > 0) return;

    // A tap: pick the nearest train within a forgiving radius.
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const v = viewRef.current;

    let best: MapTrain | null = null;
    let bestDistance = 18;
    for (const point of pointsRef.current) {
      const d = Math.hypot(point.x * v.scale + v.x - px, point.y * v.scale + v.y - py);
      if (d < bestDistance) {
        bestDistance = d;
        best = point.train;
      }
    }
    onSelect(best);
  };

  const zoomTo = (nextScale: number, clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    setView((v) => {
      const ratio = nextScale / v.scale;
      return { scale: nextScale, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
    });
  };

  const onWheel = (event: React.WheelEvent) => {
    const next = Math.max(0.4, Math.min(60, viewRef.current.scale * (event.deltaY < 0 ? 1.15 : 0.87)));
    zoomTo(next, event.clientX, event.clientY);
  };

  return (
    <div
      ref={wrapRef}
      className="relative size-full touch-none overflow-hidden bg-surface-2"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <canvas ref={canvasRef} className="block size-full" aria-label={`Map showing ${points.length} running trains`} role="img" />

      <div className="pointer-events-none absolute right-2.5 top-2.5 flex flex-col gap-1.5">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => {
            const rect = wrapRef.current!.getBoundingClientRect();
            zoomTo(Math.min(60, viewRef.current.scale * 1.5), rect.left + rect.width / 2, rect.top + rect.height / 2);
          }}
          className="pointer-events-auto flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-dim transition-colors hover:text-text"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => {
            const rect = wrapRef.current!.getBoundingClientRect();
            zoomTo(Math.max(0.4, viewRef.current.scale / 1.5), rect.left + rect.width / 2, rect.top + rect.height / 2);
          }}
          className="pointer-events-auto flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-dim transition-colors hover:text-text"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Fit the whole country"
          onClick={fit}
          className="pointer-events-auto flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-[0.625rem] text-dim transition-colors hover:text-text"
        >
          fit
        </button>
      </div>
    </div>
  );
}

export function TypeLegend({
  types,
  activeTypes,
  counts,
  onToggle,
}: {
  types: readonly string[];
  activeTypes: Set<number>;
  counts: number[];
  onToggle: (index: number) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {types.map((label, index) => {
        const active = activeTypes.has(index);
        if (!counts[index]) return null;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onToggle(index)}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.75rem] transition-colors",
              active ? "border-border-strong bg-surface text-text" : "border-border bg-surface-2 text-faint"
            )}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: active ? TYPE_COLOURS[index] : "var(--text-faint)" }}
              aria-hidden
            />
            {label}
            <span className="tnum text-faint">{counts[index]}</span>
          </button>
        );
      })}
    </div>
  );
}

export { TYPE_COLOURS };
