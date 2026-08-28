import type { StyleSpecification } from "maplibre-gl";

export const OPENFREEMAP_DARK = "https://tiles.openfreemap.org/styles/dark";
export const OPENFREEMAP_POSITRON = "https://tiles.openfreemap.org/styles/positron";

/**
 * EOX Sentinel-2 cloudless WMTS. Note `{z}/{y}/{x}` — WMTS row/col, not XYZ.
 * 10 m/px; cap at zoom 15. CC BY-NC-SA 4.0, which is fine for an unmonetised demo.
 */
export const EOX_SATELLITE_TILES =
  "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2025_3857/default/g/{z}/{y}/{x}.jpg";

/**
 * OpenRailwayMap. Client-side only — their tiles 403 without a browser Referer
 * and their policy forbids faking one, so this must never be proxied.
 */
export const OPENRAILWAYMAP_TILES = "https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png";

export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  name: "sentinel-cloudless",
  sources: {
    satellite: {
      type: "raster",
      tiles: [EOX_SATELLITE_TILES],
      tileSize: 256,
      maxzoom: 15,
      attribution:
        '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data)',
    },
    openrailwaymap: {
      type: "raster",
      tiles: [OPENRAILWAYMAP_TILES],
      tileSize: 512,
      attribution: "Data © OpenStreetMap contributors, Style: CC-BY-SA 2.0 OpenRailwayMap",
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    {
      id: "openrailwaymap",
      type: "raster",
      source: "openrailwaymap",
      paint: { "raster-opacity": 0.55 },
    },
  ],
};

export type Basemap = "terrain" | "satellite";

/**
 * Raster streets when the vector worker cannot start. Carto Positron matches
 * the light OpenFreeMap look closely enough that the overlay still reads.
 */
export const RASTER_STREET_STYLE: StyleSpecification = {
  version: 8,
  name: "raster-streets",
  sources: {
    raster: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  layers: [{ id: "raster", type: "raster", source: "raster" }],
};

export function streetStyleUrl(theme: "dark" | "light"): string {
  return theme === "dark" ? OPENFREEMAP_DARK : OPENFREEMAP_POSITRON;
}
