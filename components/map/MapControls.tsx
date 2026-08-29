"use client";

import type { ReactNode } from "react";
import { Locate, Minus, Plus } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { INDIA_BOUNDS } from "./indiaOverlay";
import { useRailMap } from "./mapContext";
import { useLocale } from "@/lib/i18n/useLocale";

function isInIndia(lng: number, lat: number): boolean {
  const [[west, south], [east, north]] = INDIA_BOUNDS;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/** Zoom, fit-India, and geolocate. Terrain (street) tiles only. */
export function MapControls({ className }: { className?: string }) {
  const { t } = useLocale();
  const { fitIndia, zoomBy, flyTo } = useRailMap();

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        if (!isInIndia(longitude, latitude)) return;
        flyTo(longitude, latitude, 10);
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 8_000, maximumAge: 60_000 }
    );
  };

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-10", className)}>
      <div className="pointer-events-auto absolute bottom-8 right-2.5 flex flex-col gap-1.5 sm:bottom-2.5">
        <ControlButton label={t("map.zoomIn")} onClick={() => zoomBy(1)}>
          <Plus className="size-3.5" aria-hidden />
        </ControlButton>
        <ControlButton label={t("map.zoomOut")} onClick={() => zoomBy(-1)}>
          <Minus className="size-3.5" aria-hidden />
        </ControlButton>
        <ControlButton label={t("map.fitCountry")} onClick={fitIndia}>
          <span className="text-[0.625rem]">IN</span>
        </ControlButton>
        <ControlButton label={t("map.showMyLocation")} onClick={locate}>
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
