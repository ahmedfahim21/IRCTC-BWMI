"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { INDIA_BOUNDS } from "./indiaOverlay";
import { INDIA_RINGS } from "@/components/rail/indiaOutline";
import { RailMapContext, type RailMapApi } from "./mapContext";
import {
  TILE_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  clampView,
  latToWorldY,
  lngLatToViewPx,
  lngToWorldX,
  viewportBbox,
  worldXToLng,
  worldYToLat,
  zoomToFit,
  zoomDeltaFromWheel,
} from "@/lib/geo/slippy";


function currentTheme(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function esriStreet(z: number, x: number, y: number): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
}

function osmStreet(z: number, x: number, y: number): string {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function tileUrl(z: number, x: number, y: number, streetHost: "esri" | "osm"): string {
  return streetHost === "osm" ? osmStreet(z, x, y) : esriStreet(z, x, y);
}

/**
 * 2D canvas of raster tiles. Trains, routes and pins are sibling overlays via `project`.
 */
export function SlippyRasterMap({
  className,
  children,
  onMoveEnd,
  interactive = true,
}: {
  className?: string;
  children?: React.ReactNode;
  onMoveEnd?: (bbox: string) => void;
  interactive?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ centerLng: 80, centerLat: 22.5, zoom: 4.3 });
  const imagesRef = useRef(new Map<string, HTMLImageElement | "loading" | "error">());
  const onMoveEndRef = useRef(onMoveEnd);
  onMoveEndRef.current = onMoveEnd;
  const dragRef = useRef<{ x: number; y: number; lng: number; lat: number } | null>(null);
  const streetHostRef = useRef<"esri" | "osm">("esri");
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<number | null>(null);
  const readyRef = useRef(false);

  const [theme, setTheme] = useState<"dark" | "light">(currentTheme);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [viewEpoch, setViewEpoch] = useState(0);

  const bumpView = useCallback(() => setViewEpoch((n) => n + 1), []);

  const emit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const { centerLng, centerLat, zoom } = viewRef.current;
    const raw = viewportBbox(centerLng, centerLat, zoom, el.clientWidth, el.clientHeight);
    const rounded = raw
      .split(",")
      .map((part) => Number(part).toFixed(2))
      .join(",");
    onMoveEndRef.current?.(rounded);
  }, []);

  const emitSoon = useCallback(() => {
    if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
    emitTimerRef.current = setTimeout(() => {
      emitTimerRef.current = null;
      emit();
    }, 200);
  }, [emit]);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width < 2 || height < 2) {
      requestAnimationFrame(() => paint());
      return;
    }
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = theme === "dark" ? "#1c1917" : "#f5f5f5";
    ctx.fillRect(0, 0, width, height);

    const { centerLng, centerLat, zoom } = viewRef.current;
    const z = Math.min(MAX_ZOOM, Math.max(0, Math.floor(zoom)));
    const scale = 2 ** (zoom - z);
    const tilePx = TILE_SIZE * scale;
    const cx = lngToWorldX(centerLng, z);
    const cy = latToWorldY(centerLat, z);
    const originX = cx * tilePx - width / 2;
    const originY = cy * tilePx - height / 2;
    const x0 = Math.floor(originX / tilePx);
    const y0 = Math.floor(originY / tilePx);
    const x1 = Math.ceil((originX + width) / tilePx);
    const y1 = Math.ceil((originY + height) / tilePx);
    const n = 2 ** z;

    for (let x = x0; x < x1; x++) {
      const wrappedX = ((x % n) + n) % n;
      for (let y = y0; y < y1; y++) {
        if (y < 0 || y >= n) continue;
        const url = tileUrl(z, wrappedX, y, streetHostRef.current);
        const cached = imagesRef.current.get(url);
        const dx = x * tilePx - originX;
        const dy = y * tilePx - originY;
        if (cached instanceof HTMLImageElement && cached.complete) {
          ctx.drawImage(cached, dx, dy, tilePx, tilePx);
        } else if (cached !== "loading" && cached !== "error") {
          imagesRef.current.set(url, "loading");
          const img = new Image();
          // Do not set crossOrigin: Esri/OSM often omit ACAO, and we never read pixels.
          img.onload = () => {
            imagesRef.current.set(url, img);
            setTick((t) => t + 1);
          };
          img.onerror = () => {
            imagesRef.current.set(url, "error");
            if (streetHostRef.current === "esri") {
              streetHostRef.current = "osm";
              imagesRef.current.clear();
              setTick((t) => t + 1);
            }
          };
          img.src = url;
        }
      }
    }

    const stroke = theme === "dark" ? "rgba(245,245,245,0.55)" : "rgba(28,25,23,0.55)";
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (const ring of INDIA_RINGS) {
      ring.forEach(([lng, lat], index) => {
        const pt = lngLatToViewPx(lng, lat, centerLng, centerLat, zoom, width, height);
        if (index === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
    }
    ctx.stroke();

    if (!readyRef.current) {
      readyRef.current = true;
      setReady(true);
    }
  }, [theme]);

  const stopAnim = useCallback(() => {
    if (animRef.current != null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const setView = useCallback(
    (next: { centerLng: number; centerLat: number; zoom: number }) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      stopAnim();
      viewRef.current = clampView(
        next.centerLng,
        next.centerLat,
        next.zoom,
        wrap.clientWidth,
        wrap.clientHeight,
        INDIA_BOUNDS
      );
      paint();
      emitSoon();
      bumpView();
    },
    [paint, emitSoon, bumpView, stopAnim]
  );

  const animateView = useCallback(
    (next: { centerLng: number; centerLat: number; zoom: number }) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const target = clampView(
        next.centerLng,
        next.centerLat,
        next.zoom,
        wrap.clientWidth,
        wrap.clientHeight,
        INDIA_BOUNDS
      );
      if (reducedMotionRef.current) {
        setView(target);
        return;
      }
      stopAnim();
      const from = { ...viewRef.current };
      const started = performance.now();
      const duration = 520;
      const step = (now: number) => {
        const t = Math.min(1, (now - started) / duration);
        const k = 1 - (1 - t) ** 3;
        viewRef.current = clampView(
          from.centerLng + (target.centerLng - from.centerLng) * k,
          from.centerLat + (target.centerLat - from.centerLat) * k,
          from.zoom + (target.zoom - from.zoom) * k,
          wrap.clientWidth,
          wrap.clientHeight,
          INDIA_BOUNDS
        );
        paint();
        bumpView();
        if (t < 1) {
          animRef.current = requestAnimationFrame(step);
          return;
        }
        animRef.current = null;
        emitSoon();
      };
      animRef.current = requestAnimationFrame(step);
    },
    [setView, stopAnim, paint, bumpView, emitSoon]
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const apply = (fitIndiaFirst: boolean) => {
      if (wrap.clientWidth < 2 || wrap.clientHeight < 2) return;
      if (fitIndiaFirst) {
        const fitted = zoomToFit(
          INDIA_BOUNDS[0][0],
          INDIA_BOUNDS[0][1],
          INDIA_BOUNDS[1][0],
          INDIA_BOUNDS[1][1],
          wrap.clientWidth,
          wrap.clientHeight,
          20
        );
        viewRef.current = clampView(
          fitted.centerLng,
          fitted.centerLat,
          fitted.zoom,
          wrap.clientWidth,
          wrap.clientHeight,
          INDIA_BOUNDS
        );
      } else {
        const current = viewRef.current;
        viewRef.current = clampView(
          current.centerLng,
          current.centerLat,
          current.zoom,
          wrap.clientWidth,
          wrap.clientHeight,
          INDIA_BOUNDS
        );
      }
      paint();
      emit();
      bumpView();
    };
    apply(true);
    const observer = new ResizeObserver(() => apply(false));
    observer.observe(wrap);
    return () => {
      observer.disconnect();
      if (emitTimerRef.current) clearTimeout(emitTimerRef.current);
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [paint, emit, bumpView]);

  useEffect(() => {
    paint();
  }, [paint, tick]);

  useEffect(() => {
    const onTheme = () => setTheme(currentTheme());
    const observer = new MutationObserver(onTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", onTheme);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onTheme);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const panByPx = (dx: number, dy: number) => {
    const { centerLng, centerLat, zoom } = viewRef.current;
    const z = zoom;
    setView({
      centerLng: worldXToLng(lngToWorldX(centerLng, z) - dx / TILE_SIZE, z),
      centerLat: worldYToLat(latToWorldY(centerLat, z) - dy / TILE_SIZE, z),
      zoom,
    });
  };

  const zoomBy = useCallback(
    (delta: number) => {
      setView({ ...viewRef.current, zoom: viewRef.current.zoom + delta });
    },
    [setView]
  );

  const flyTo = useCallback(
    (lng: number, lat: number, zoom = 8) => {
      animateView({ centerLng: lng, centerLat: lat, zoom });
    },
    [animateView]
  );

  const fitIndia = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fitted = zoomToFit(
      INDIA_BOUNDS[0][0],
      INDIA_BOUNDS[0][1],
      INDIA_BOUNDS[1][0],
      INDIA_BOUNDS[1][1],
      wrap.clientWidth,
      wrap.clientHeight,
      28
    );
    animateView(fitted);
  }, [animateView]);

  const fitBounds = useCallback(
    (west: number, south: number, east: number, north: number, padding = 48) => {
      const wrap = wrapRef.current;
      if (!wrap || wrap.clientWidth < 2 || wrap.clientHeight < 2) return;
      const fitted = zoomToFit(west, south, east, north, wrap.clientWidth, wrap.clientHeight, padding);
      animateView(fitted);
    },
    [animateView]
  );

  const project = useCallback(
    (lng: number, lat: number) => {
      const wrap = wrapRef.current;
      if (!wrap || wrap.clientWidth < 2) return null;
      const { centerLng, centerLat, zoom } = viewRef.current;
      return lngLatToViewPx(lng, lat, centerLng, centerLat, zoom, wrap.clientWidth, wrap.clientHeight);
    },
    // viewEpoch keeps the closure current for consumers that depend on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewEpoch]
  );

  const api = useMemo<RailMapApi>(
    () => ({
      ready,
      viewEpoch,
      theme,
      reducedMotion,
      project,
      flyTo,
      fitIndia,
      fitBounds,
      zoomBy,
    }),
    [ready, viewEpoch, theme, reducedMotion, project, flyTo, fitIndia, fitBounds, zoomBy]
  );

  return (
    <RailMapContext.Provider value={api}>
      <div
        ref={wrapRef}
        className={cn("relative size-full min-h-[12rem] overflow-hidden bg-surface-2", className)}
        onPointerDown={
          interactive
            ? (event) => {
                stopAnim();
                dragRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                  lng: viewRef.current.centerLng,
                  lat: viewRef.current.centerLat,
                };
                (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
              }
            : undefined
        }
        onPointerMove={
          interactive
            ? (event) => {
                const drag = dragRef.current;
                if (!drag) return;
                panByPx(event.clientX - drag.x, event.clientY - drag.y);
                drag.x = event.clientX;
                drag.y = event.clientY;
              }
            : undefined
        }
        onPointerUp={() => {
          dragRef.current = null;
          if (emitTimerRef.current) {
            clearTimeout(emitTimerRef.current);
            emitTimerRef.current = null;
          }
          emit();
        }}
        onWheel={
          interactive
            ? (event) => {
                event.preventDefault();
                zoomBy(zoomDeltaFromWheel(event.deltaY, event.deltaMode));
              }
            : undefined
        }
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full cursor-grab" role="img" aria-label="Map of India" />
        <p className="pointer-events-none absolute bottom-1 left-1 z-[5] text-[0.5625rem] text-faint">
          {streetHostRef.current === "osm" ? "© OpenStreetMap" : "Tiles © Esri"}
        </p>
        {children}
      </div>
    </RailMapContext.Provider>
  );
}
