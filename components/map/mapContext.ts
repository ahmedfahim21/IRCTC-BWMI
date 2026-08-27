"use client";

import { createContext, useContext } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { Basemap } from "./mapStyles";

export interface RailMapApi {
  map: MapLibreMap | null;
  ready: boolean;
  basemap: Basemap;
  setBasemap: (next: Basemap) => void;
  theme: "dark" | "light";
  reducedMotion: boolean;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  fitIndia: () => void;
}

export const RailMapContext = createContext<RailMapApi | null>(null);

export function useRailMap(): RailMapApi {
  const ctx = useContext(RailMapContext);
  if (!ctx) throw new Error("useRailMap must be used inside RailMap");
  return ctx;
}
