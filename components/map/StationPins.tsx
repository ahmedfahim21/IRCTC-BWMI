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
  const { map } = useRailMap();
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
      el.setAttribute("aria-label", `${pin.kind === "origin" ? "From" : pin.kind === "destination" ? "To" : "Stop"} ${pin.name} (${pin.code})`);
      el.innerHTML = `<span class="rail-station-pin__dot" data-kind="${pin.kind}"></span><span class="rail-station-pin__label">${escapeHtml(pin.code)}</span>`;
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect?.(pin);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      markers.current.push(marker);
    }

    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
    };
  }, [map, pins, onSelect]);

  return null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}
