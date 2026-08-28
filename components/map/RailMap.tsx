"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLocale } from "@/lib/i18n/useLocale";
import { cn } from "@/components/ui/cn";
import { addIndiaBoundary, applyPlaceLabels, INDIA_BOUNDS, paintIndiaBoundary } from "./indiaOverlay";
import { RailMapContext, type RailMapApi } from "./mapContext";
import { SATELLITE_STYLE, RASTER_STREET_STYLE, streetStyleUrl, type Basemap } from "./mapStyles";
import { SlippyRasterMap } from "./SlippyRasterMap";
import { gpuCanRunMapLibre } from "@/lib/geo/slippy";

function installMapWorker() {
  if (typeof window === "undefined") return;
  if (maplibregl.getWorkerUrl()) return;
  maplibregl.setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
}

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

/**
 * MapLibre wrapper. Owns the instance, style switching, resize, reduced-motion,
 * and a dark/light street style bound to the existing theme.
 *
 * Chrome around the canvas (list panes, controls that live in React) must not
 * wait on `load` — tiles.openfreemap.org is stubbed in Playwright and would
 * hang the suite if anything gated on it.
 */
export function RailMap({
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
  const [engine, setEngine] = useState<"pending" | "gl" | "slippy">("pending");

  useEffect(() => {
    setEngine(gpuCanRunMapLibre() ? "gl" : "slippy");
  }, []);

  if (engine === "pending") {
    return <div className={cn("relative size-full min-h-[12rem] bg-surface-2", className)} aria-hidden />;
  }
  if (engine === "slippy") {
    return (
      <SlippyRasterMap className={className} onMoveEnd={onMoveEnd} interactive={interactive}>
        {children}
      </SlippyRasterMap>
    );
  }
  return (
    <MapLibreEngine
      className={className}
      onMoveEnd={onMoveEnd}
      interactive={interactive}
      onNeedSlippy={() => setEngine("slippy")}
    >
      {children}
    </MapLibreEngine>
  );
}

function MapLibreEngine({
  className,
  children,
  onMoveEnd,
  interactive,
  onNeedSlippy,
}: {
  className?: string;
  children?: React.ReactNode;
  onMoveEnd?: (bbox: string) => void;
  interactive: boolean;
  onNeedSlippy: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onMoveEndRef = useRef(onMoveEnd);
  onMoveEndRef.current = onMoveEnd;

  const { locale } = useLocale();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [basemap, setBasemapState] = useState<Basemap>("terrain");
  const [theme, setTheme] = useState<"dark" | "light">(currentTheme);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  const emitBbox = useCallback((instance: maplibregl.Map) => {
    const bounds = instance.getBounds();
    const bbox = `${bounds.getWest().toFixed(3)},${bounds.getSouth().toFixed(3)},${bounds.getEast().toFixed(3)},${bounds.getNorth().toFixed(3)}`;
    onMoveEndRef.current?.(bbox);
  }, []);

  const applyOverlays = useCallback(
    (instance: maplibregl.Map) => {
      addIndiaBoundary(instance);
      paintIndiaBoundary(instance);
      if (basemap === "terrain") applyPlaceLabels(instance, locale);
    },
    [basemap, locale]
  );
  const applyOverlaysRef = useRef(applyOverlays);
  applyOverlaysRef.current = applyOverlays;

  const onNeedSlippyRef = useRef(onNeedSlippy);
  onNeedSlippyRef.current = onNeedSlippy;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    installMapWorker();

    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container,
        style: streetStyleUrl(currentTheme()),
        bounds: INDIA_BOUNDS,
        fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: true },
        interactive,
        fadeDuration: prefersReducedMotion() ? 0 : 300,
        localIdeographFontFamily: "Noto Sans, sans-serif",
      });
      instance.dragRotate.disable();
      instance.touchZoomRotate.disableRotation();
    } catch {
      onNeedSlippyRef.current();
      return;
    }
    mapRef.current = instance;
    setMap(instance);

    const onIdle = () => {
      applyOverlaysRef.current(instance);
      setReady(true);
      emitBbox(instance);
    };
    instance.once("idle", onIdle);
    let fellBack = false;
    const failSafe = window.setTimeout(() => {
      if (fellBack || instance.isStyleLoaded()) return;
      fellBack = true;
      instance.setStyle(RASTER_STREET_STYLE);
    }, 4000);
    instance.once("idle", () => window.clearTimeout(failSafe));
    instance.on("error", (event) => {
      const message = event.error?.message ?? String(event.error ?? "");
      if (/WebGL2|GPUInitialization|webgl/i.test(message)) {
        window.clearTimeout(failSafe);
        try {
          instance.remove();
        } catch {
          // Painter never started; remove still throws on some builds.
        }
        mapRef.current = null;
        onNeedSlippyRef.current();
        return;
      }
      if (fellBack) return;
      if (!/worker|module script|failed to fetch worker|404/i.test(message)) return;
      fellBack = true;
      window.clearTimeout(failSafe);
      instance.setStyle(RASTER_STREET_STYLE);
    });
    instance.on("styledata", () => {
      if (!instance.isStyleLoaded()) return;
      applyOverlaysRef.current(instance);
    });
    instance.on("moveend", () => emitBbox(instance));

    const resize = () => instance.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      window.clearTimeout(failSafe);
      try {
        instance.remove();
      } catch {
        // Already torn down after a GPU fallback.
      }
      mapRef.current = null;
      setMap(null);
      setReady(false);
    };
    // Mount once. Style/theme changes go through setStyle below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance) return;
    if (basemap === "satellite") {
      instance.setStyle(SATELLITE_STYLE);
    } else {
      instance.setStyle(streetStyleUrl(theme));
    }
  }, [basemap, theme]);

  useEffect(() => {
    const instance = mapRef.current;
    if (!instance || !instance.isStyleLoaded() || basemap !== "terrain") return;
    applyPlaceLabels(instance, locale);
  }, [locale, basemap]);

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

  const flyTo = useCallback(
    (lng: number, lat: number, zoom = 8) => {
      const instance = mapRef.current;
      if (!instance) return;
      if (reducedMotion) {
        instance.jumpTo({ center: [lng, lat], zoom });
        return;
      }
      instance.flyTo({ center: [lng, lat], zoom, duration: 900, essential: false });
    },
    [reducedMotion]
  );

  const fitIndia = useCallback(() => {
    const instance = mapRef.current;
    if (!instance) return;
    instance.fitBounds(INDIA_BOUNDS, { padding: 28, duration: reducedMotion ? 0 : 600 });
  }, [reducedMotion]);

  const zoomBy = useCallback((delta: number) => {
    const instance = mapRef.current;
    if (!instance) return;
    instance.zoomTo(instance.getZoom() + delta, { duration: reducedMotion ? 0 : 200 });
  }, [reducedMotion]);

  const setBasemap = useCallback((next: Basemap) => setBasemapState(next), []);

  const api = useMemo<RailMapApi>(
    () => ({ map, ready, basemap, setBasemap, theme, reducedMotion, flyTo, fitIndia, zoomBy }),
    [map, ready, basemap, setBasemap, theme, reducedMotion, flyTo, fitIndia, zoomBy]
  );

  return (
    <RailMapContext.Provider value={api}>
      <div className={cn("relative size-full min-h-[12rem] overflow-hidden bg-surface-2", className)}>
        <div ref={containerRef} className="absolute inset-0" role="presentation" />
        {children}
      </div>
    </RailMapContext.Provider>
  );
}
