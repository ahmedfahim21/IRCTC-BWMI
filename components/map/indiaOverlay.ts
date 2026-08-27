import type { Feature, FeatureCollection, MultiLineString } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { INDIA_RINGS } from "@/components/rail/indiaOutline";
import { resolveToken } from "@/lib/railradar/trainTypes";

const SOURCE = "india-boundary";
const LAYER = "india-boundary-line";

/** Mainland + island rings as a MultiLineString, so tiles don't get the last word on the border. */
export function indiaBoundaryGeoJSON(): Feature<MultiLineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiLineString",
      coordinates: INDIA_RINGS.map((ring) => ring.map(([lng, lat]) => [lng, lat])),
    },
  };
}

export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [68.1, 6.6],
  [97.4, 37.1],
];

export function addIndiaBoundary(map: MapLibreMap) {
  const data = indiaBoundaryGeoJSON();
  const existing = map.getSource(SOURCE) as GeoJSONSource | undefined;
  if (existing) {
    existing.setData(data);
  } else {
    map.addSource(SOURCE, { type: "geojson", data });
  }

  if (!map.getLayer(LAYER)) {
    map.addLayer({
      id: LAYER,
      type: "line",
      source: SOURCE,
      paint: {
        "line-color": resolveToken("--text") || "#ffffff",
        "line-width": 1.4,
        "line-opacity": 0.55,
      },
    });
  }
}

export function paintIndiaBoundary(map: MapLibreMap) {
  if (!map.getLayer(LAYER)) return;
  map.setPaintProperty(LAYER, "line-color", resolveToken("--text") || "#ffffff");
}

/** Prefer Hindi names when the locale is hi; OpenFreeMap is OpenMapTiles schema. */
export function applyPlaceLabels(map: MapLibreMap, locale: "en" | "hi") {
  const field =
    locale === "hi"
      ? (["coalesce", ["get", "name:hi"], ["get", "name:en"], ["get", "name"]] as unknown as string)
      : (["coalesce", ["get", "name:en"], ["get", "name"]] as unknown as string);

  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol") continue;
    const layout = map.getLayoutProperty(layer.id, "text-field");
    if (layout === undefined) continue;
    try {
      map.setLayoutProperty(layer.id, "text-field", field);
    } catch {
      // Some layers use formatted expressions that reject a swap; skip them.
    }
  }
}
