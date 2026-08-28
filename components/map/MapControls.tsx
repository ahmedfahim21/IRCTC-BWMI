"use client";

import type { ReactNode } from "react";
import { Locate, Minus, Plus } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useRailMap } from "./mapContext";

/**
 * Zoom, fit-India, geolocate, and a Terrain / Satellite switcher modelled on
 * the thumbnail toggle in the Where Is My Train reference.
 */
export function MapControls({ className }: { className?: string }) {
  const { basemap, setBasemap, fitIndia, zoomBy, flyTo } = useRailMap();

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        flyTo(pos.coords.longitude, pos.coords.latitude, 10);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 }
    );
  };

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-10", className)}>
      <div className="pointer-events-auto absolute right-2.5 top-2.5 flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => setBasemap(basemap === "satellite" ? "terrain" : "satellite")}
          aria-pressed={basemap === "satellite"}
          aria-label={basemap === "satellite" ? "Switch to terrain map" : "Switch to satellite map"}
          className="overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-sm)]"
        >
          <span className="block px-2 pt-1.5 text-[0.625rem] uppercase tracking-wider text-faint">
            {basemap === "satellite" ? "Satellite" : "Terrain"}
          </span>
          <span
            className={cn(
              "m-1.5 mt-1 block h-10 w-16 rounded-md",
              basemap === "satellite" ? "bg-ok/40" : "bg-surface-3"
            )}
            aria-hidden
          />
        </button>
      </div>

      <div className="pointer-events-auto absolute bottom-8 right-2.5 flex flex-col gap-1.5 sm:bottom-2.5">
        <ControlButton label="Zoom in" onClick={() => zoomBy(1)}>
          <Plus className="size-3.5" aria-hidden />
        </ControlButton>
        <ControlButton label="Zoom out" onClick={() => zoomBy(-1)}>
          <Minus className="size-3.5" aria-hidden />
        </ControlButton>
        <ControlButton label="Fit the whole country" onClick={fitIndia}>
          <span className="text-[0.625rem]">IN</span>
        </ControlButton>
        <ControlButton label="Show my location" onClick={locate}>
          <Locate className="size-3.5" aria-hidden />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface text-dim shadow-[var(--shadow-sm)] transition-colors hover:text-text"
    >
      {children}
    </button>
  );
}
