"use client";

import type { ReactNode } from "react";
import { Locate, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
        <ToggleGroup
          type="single"
          variant="outline"
          value={basemap}
          onValueChange={(value) => value && setBasemap(value as "terrain" | "satellite")}
          className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-sm)]"
        >
          <ToggleGroupItem
            value="terrain"
            aria-label="Switch to terrain map"
            className="h-auto flex-col rounded-none border-0 px-2 py-1.5 data-[state=on]:bg-secondary"
          >
            <span className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">Terrain</span>
            <span className="m-1.5 mt-1 block h-10 w-16 rounded-md bg-secondary" aria-hidden />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="satellite"
            aria-label="Switch to satellite map"
            className="h-auto flex-col rounded-none border-0 px-2 py-1.5 data-[state=on]:bg-secondary"
          >
            <span className="text-[0.625rem] uppercase tracking-wider text-muted-foreground">Satellite</span>
            <span className="m-1.5 mt-1 block h-10 w-16 rounded-md bg-success/40" aria-hidden />
          </ToggleGroupItem>
        </ToggleGroup>
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
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={label}
      onClick={onClick}
      className="rounded-lg border-border bg-card text-muted-foreground shadow-[var(--shadow-sm)] hover:text-foreground"
    >
      {children}
    </Button>
  );
}
