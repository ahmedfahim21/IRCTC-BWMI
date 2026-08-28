"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { INDIA_BOUNDS } from "./indiaOverlay";
import { RailMapContext, type RailMapApi } from "./mapContext";
import { EOX_SATELLITE_TILES, type Basemap } from "./mapStyles";
import {
  TILE_SIZE,
  latToWorldY,
  lngToWorldX,
  viewportBbox,
  worldXToLng,
  worldYToLat,
  zoomToFit,
} from "@/lib/geo/slippy";

const MAX_ZOOM = 12;
const MIN_ZOOM = 3;

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

function streetTileUrl(_theme: "dark" | "light", z: number, x: number, y: number): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
}

function satelliteTileUrl(z: number, x: number, y: number): string {
  return EOX_SATELLITE_TILES.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

function tileUrl(basemap: Basemap, theme: "dark" | "light", z: number, x: number, y: number): string {
  switch (basemap) {
    case "satellite":
      return satelliteTileUrl(z, x, y);
    case "terrain":
      return streetTileUrl(theme, z, x, y);
    default: {
      const _never: never = basemap;
      return _never;
    }
  }
}

/**
 * 2D canvas slippy map. MapLibre 6 needs WebGL2; this environment (and some
 * locked-down browsers) only offer a 2D canvas, which left the landing map blank.
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

  const [theme, setTheme] = useState<"dark" | "light">(currentTheme);
  const [basemap, setBasemapState] = useState<Basemap>("terrain");
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  const emit = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const { centerLng, centerLat, zoom } = viewRef.current;
    onMoveEndRef.current?.(viewportBbox(centerLng, centerLat, zoom, el.clientWidth, el.clientHeight));
  }, []);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width < 2 || height < 2) return;
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
        const url = tileUrl(basemap, theme, z, wrappedX, y);
        const cached = imagesRef.current.get(url);
        const dx = x * tilePx - originX;
        const dy = y * tilePx - originY;
        if (cached instanceof HTMLImageElement && cached.complete) {
          ctx.drawImage(cached, dx, dy, tilePx, tilePx);
        } else if (cached !== "loading" && cached !== "error") {
          imagesRef.current.set(url, "loading");
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            imagesRef.current.set(url, img);
            setTick((t) => t + 1);
          };
          img.onerror = () => imagesRef.current.set(url, "error");
          img.src = url;
        }
      }
    }
    setReady(true);
  }, [basemap, theme]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const fitted = zoomToFit(
      INDIA_BOUNDS[0][0],
      INDIA_BOUNDS[0][1],
      INDIA_BOUNDS[1][0],
      INDIA_BOUNDS[1][1],
      wrap.clientWidth || 800,
      wrap.clientHeight || 600,
      28
    );
    viewRef.current = { centerLng: fitted.centerLng, centerLat: fitted.centerLat, zoom: fitted.zoom };
    paint();
    emit();
    const observer = new ResizeObserver(() => {
      paint();
      emit();
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [paint, emit]);

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
    viewRef.current = {
      centerLng: worldXToLng(lngToWorldX(centerLng, z) - dx / TILE_SIZE, z),
      centerLat: worldYToLat(latToWorldY(centerLat, z) - dy / TILE_SIZE, z),
      zoom,
    };
    paint();
    emit();
  };

  const zoomBy = useCallback(
    (delta: number) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewRef.current.zoom + delta));
      viewRef.current = { ...viewRef.current, zoom: next };
      paint();
      emit();
    },
    [paint, emit]
  );

  const flyTo = useCallback(
    (lng: number, lat: number, zoom = 8) => {
      viewRef.current = { centerLng: lng, centerLat: lat, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) };
      paint();
      emit();
    },
    [paint, emit]
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
    viewRef.current = { centerLng: fitted.centerLng, centerLat: fitted.centerLat, zoom: fitted.zoom };
    paint();
    emit();
  }, [paint, emit]);

  const setBasemap = useCallback((next: Basemap) => setBasemapState(next), []);

  const api = useMemo<RailMapApi>(
    () => ({ map: null, ready, basemap, setBasemap, theme, reducedMotion, flyTo, fitIndia, zoomBy }),
    [ready, basemap, setBasemap, theme, reducedMotion, flyTo, fitIndia, zoomBy]
  );

  return (
    <RailMapContext.Provider value={api}>
      <div
        ref={wrapRef}
        className={cn("relative size-full min-h-[12rem] overflow-hidden bg-surface-2", className)}
        onPointerDown={
          interactive
            ? (event) => {
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
        }}
        onWheel={
          interactive
            ? (event) => {
                event.preventDefault();
                zoomBy(event.deltaY > 0 ? -0.4 : 0.4);
              }
            : undefined
        }
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full cursor-grab" role="img" aria-label="Map of India" />
        <p className="pointer-events-none absolute bottom-1 left-1 z-[5] text-[0.5625rem] text-faint">
          {basemap === "satellite" ? "Sentinel-2 cloudless · EOX" : "Tiles © Esri"}
        </p>
        {children}
      </div>
    </RailMapContext.Provider>
  );
}
