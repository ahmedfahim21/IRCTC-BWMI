"use client";

import { createContext, useContext } from "react";

export interface RailMapApi {
  ready: boolean;
  /** Increments on pan/zoom/resize so HTML overlays stay pinned to the view. */
  viewEpoch: number;
  reducedMotion: boolean;
  project: (lng: number, lat: number) => { x: number; y: number } | null;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  fitIndia: () => void;
  fitBounds: (west: number, south: number, east: number, north: number, padding?: number) => void;
  zoomBy: (delta: number) => void;
}

export const RailMapContext = createContext<RailMapApi | null>(null);

export function useRailMap(): RailMapApi {
  const ctx = useContext(RailMapContext);
  if (!ctx) throw new Error("useRailMap must be used inside RailMap");
  return ctx;
}
