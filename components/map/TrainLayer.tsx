"use client";

import { useEffect, useRef } from "react";
import type { PackedTrain } from "@/lib/railradar/packedTrain";
import { resolveToken, resolveTypeColours } from "@/lib/railradar/trainTypes";
import { cn } from "@/components/ui/cn";
import { useRailMap } from "./mapContext";

export interface MapTrain {
  number: string;
  name: string;
  lat: number;
  lng: number;
  type: number;
}

const unpack = (t: PackedTrain): MapTrain => ({
  number: t[0],
  name: t[1],
  lat: t[2],
  lng: t[3],
  type: t[4],
});

const HIT_RADIUS = 14;

/**
 * Live trains as dots on the 2D map. Clustering is off: 2,800 circles is nothing
 * for a canvas, and clustering destroys the whole-network read.
 */
export function TrainLayer({
  trains,
  activeTypes,
  selectedNumber,
  onSelect,
  dimmed = false,
}: {
  trains: PackedTrain[];
  activeTypes: Set<number>;
  selectedNumber?: string | null;
  onSelect: (train: MapTrain | null) => void;
  dimmed?: boolean;
}) {
  const { project, viewEpoch } = useRailMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitsRef = useRef<{ train: MapTrain; x: number; y: number }[]>([]);
  const pointerDown = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width < 2 || height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const colours = resolveTypeColours();
    const stroke = resolveToken("--text") || "#111";
    const hits: { train: MapTrain; x: number; y: number }[] = [];

    for (const packed of trains) {
      if (!activeTypes.has(packed[4])) continue;
      const lat = packed[2];
      const lng = packed[3];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const pt = project(lng, lat);
      if (!pt) continue;
      if (pt.x < -12 || pt.y < -12 || pt.x > width + 12 || pt.y > height + 12) continue;
      const selected = packed[0] === selectedNumber;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, selected ? 5.5 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = colours[packed[4]] ?? "#888";
      ctx.fill();
      ctx.lineWidth = selected ? 2.2 : 0.7;
      ctx.strokeStyle = stroke;
      ctx.stroke();
      hits.push({ train: unpack(packed), x: pt.x, y: pt.y });
    }
    hitsRef.current = hits;
    /*
     * Where the first train landed, in canvas px — so a test (or a human
     * debugging why a click missed) can find a real target instead of
     * guessing at pixels whose occupants move with the wall clock.
     */
    canvas.dataset.trainCount = String(hits.length);
    if (hits[0]) {
      canvas.dataset.trainX = String(Math.round(hits[0].x));
      canvas.dataset.trainY = String(Math.round(hits[0].y));
    } else {
      delete canvas.dataset.trainX;
      delete canvas.dataset.trainY;
    }
  }, [trains, activeTypes, selectedNumber, project, viewEpoch]);

  const hitTest = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best: { train: MapTrain; dist: number } | null = null;
    for (const hit of hitsRef.current) {
      const dx = hit.x - x;
      const dy = hit.y - y;
      const dist = dx * dx + dy * dy;
      if (dist > HIT_RADIUS * HIT_RADIUS) continue;
      if (!best || dist < best.dist) best = { train: hit.train, dist };
    }
    return best?.train ?? null;
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="map-train-overlay"
      className={cn(
        "absolute inset-0 z-[4] size-full cursor-grab transition-opacity",
        dimmed && "opacity-30"
      )}
      role="img"
      aria-label="Running trains on the map"
      onPointerDown={(event) => {
        pointerDown.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        const start = pointerDown.current;
        pointerDown.current = null;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (dx * dx + dy * dy > 36) return;
        onSelect(hitTest(event.clientX, event.clientY));
      }}
    />
  );
}

export { unpack as unpackTrain };
