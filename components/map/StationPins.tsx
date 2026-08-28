"use client";

import { useRailMap } from "./mapContext";

export interface StationPin {
  code: string;
  name: string;
  lat: number;
  lng: number;
  kind: "origin" | "destination" | "stop";
}

/**
 * Labelled origin/destination pins. A miss (no finite coordinates) is skipped —
 * never rendered at (0, 0).
 */
export function StationPins({
  pins,
  onSelect,
}: {
  pins: StationPin[];
  onSelect?: (pin: StationPin) => void;
}) {
  const { project } = useRailMap();

  return (
    <div className="pointer-events-none absolute inset-0 z-[6]" data-testid="map-station-pins">
      {pins.map((pin) => {
        if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return null;
        const pt = project(pin.lng, pin.lat);
        if (!pt) return null;
        const label = pin.kind === "origin" ? "From" : pin.kind === "destination" ? "To" : "Stop";
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
