"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { useRailMap } from "./mapContext";

export interface StationPin {
  code: string;
  name: string;
  lat: number;
  lng: number;
  kind: "origin" | "destination" | "stop";
}

/**
 * Labelled origin/destination pins as in the Omio reference. A miss (no finite
 * coordinates) is skipped — never rendered at (0, 0).
 */
export function StationPins({
  pins,
  onSelect,
}: {
  pins: StationPin[];
  onSelect?: (pin: StationPin) => void;
}) {
  const { map, project } = useRailMap();
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    if (!map) return;

    for (const pin of pins) {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) continue;

      const el = document.createElement("button");
      el.type = "button";
      el.className = "rail-station-pin";
      el.setAttribute(
        "aria-label",
        `${pin.kind === "origin" ? "From" : pin.kind === "destination" ? "To" : "Stop"} ${pin.name} (${pin.code})`
      );
      el.innerHTML = `<span class="rail-station-pin__dot" data-kind="${pin.kind}"></span><span class="rail-station-pin__label">${escapeHtml(pin.code)}</span>`;
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect?.(pin);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([pin.lng, pin.lat]).addTo(map);
      markers.current.push(marker);
    }

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
    };
  }, [map, pins, onSelect]);

  if (map) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]" data-testid="map-station-pins">
      {pins.map((pin) => {
        if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return null;
        const pt = project(pin.lng, pin.lat);
        if (!pt) return null;
        const label =
          pin.kind === "origin" ? "From" : pin.kind === "destination" ? "To" : "Stop";
        return (
          <button
            key={`${pin.kind}-${pin.code}`}
            type="button"
            className="rail-station-pin pointer-events-auto absolute"
            style={{ left: pt.x, top: pt.y, transform: "translate(-50%, -100%)" }}
            aria-label={`${label} ${pin.name} (${pin.code})`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(pin);
            }}
          >
            <span className="rail-station-pin__dot" data-kind={pin.kind} />
            <span className="rail-station-pin__label">{pin.code}</span>
          </button>
        );
      })}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}
