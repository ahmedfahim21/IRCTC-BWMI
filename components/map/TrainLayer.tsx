"use client";

import { useEffect } from "react";
import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import type { PackedTrain } from "@/lib/railradar/liveMap";
import { resolveToken, resolveTypeColours } from "@/lib/railradar/trainTypes";
import { useRailMap } from "./mapContext";

export interface MapTrain {
  number: string;
  name: string;
  lat: number;
  lng: number;
  type: number;
}

const SOURCE = "live-trains";
const CIRCLES = "live-trains-circles";
const HEADING = "live-trains-heading";
const HIT = "live-trains-hit";

const unpack = (t: PackedTrain): MapTrain => ({
  number: t[0],
  name: t[1],
  lat: t[2],
  lng: t[3],
  type: t[4],
});

function headingDeg(lng: number, lat: number, headingLat: number, headingLng: number): number {
  const dLat = headingLat - lat;
  const dLng = headingLng - lng;
  if (dLat === 0 && dLng === 0) return 0;
  return (Math.atan2(dLng, dLat) * 180) / Math.PI;
}

function toFeatureCollection(trains: PackedTrain[], activeTypes: Set<number>): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: trains
      .filter((t) => activeTypes.has(t[4]) && Number.isFinite(t[2]) && Number.isFinite(t[3]))
      .map((t) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [t[3], t[2]] },
        properties: {
          number: t[0],
          name: t[1],
          type: t[4],
          heading: headingDeg(t[3], t[2], t[5], t[6]),
        },
      })),
  };
}

function addHeadingImage(map: MapLibreMap) {
  if (map.hasImage("train-heading")) return;
  const size = 24;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(size / 2, 2);
  ctx.lineTo(size - 3, size - 3);
  ctx.lineTo(size / 2, size - 9);
  ctx.lineTo(3, size - 3);
  ctx.closePath();
  ctx.fill();
  map.addImage("train-heading", ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
}

/**
 * Live trains as a GeoJSON source. Clustering is off by default: 2,800 circles
 * is nothing for the GPU, and clustering destroys the whole-network read.
 * PackedTrain[5]/[6] (next station) drive the heading arrow.
 */
export function TrainLayer({
  trains,
  activeTypes,
  selectedNumber,
  onSelect,
}: {
  trains: PackedTrain[];
  activeTypes: Set<number>;
  selectedNumber?: string | null;
  onSelect: (train: MapTrain | null) => void;
}) {
  const { map } = useRailMap();

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      if (!map.getStyle()) return;
      addHeadingImage(map);

      const data = toFeatureCollection(trains, activeTypes);
      const existing = map.getSource(SOURCE) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(data);
      } else {
        map.addSource(SOURCE, { type: "geojson", data });
      }

      const colours = resolveTypeColours();
      const colourExpr = [
        "match",
        ["get", "type"],
        0,
        colours[0],
        1,
        colours[1],
        2,
        colours[2],
        3,
        colours[3],
        4,
        colours[4],
        5,
        colours[5],
        6,
        colours[6],
        7,
        colours[7],
        colours[8],
      ];

      if (!map.getLayer(CIRCLES)) {
        map.addLayer({
          id: CIRCLES,
          type: "circle",
          source: SOURCE,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 8, 5, 12, 7],
            "circle-color": colourExpr as never,
            "circle-stroke-width": ["case", ["==", ["get", "number"], selectedNumber ?? ""], 2.4, 0.6],
            "circle-stroke-color": resolveToken("--text") || "#fff",
            "circle-opacity": 0.92,
          },
        });
        map.addLayer({
          id: HIT,
          type: "circle",
          source: SOURCE,
          paint: {
            "circle-radius": 14,
            "circle-opacity": 0,
          },
        });
        map.addLayer({
          id: HEADING,
          type: "symbol",
          source: SOURCE,
          minzoom: 7,
          layout: {
            "icon-image": "train-heading",
            "icon-size": 0.55,
            "icon-rotate": ["get", "heading"],
            "icon-rotation-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
          paint: {
            "icon-opacity": 0.85,
            "icon-color": colourExpr as never,
          },
        });
      } else {
        map.setPaintProperty(CIRCLES, "circle-color", colourExpr as never);
        map.setPaintProperty(CIRCLES, "circle-stroke-width", [
          "case",
          ["==", ["get", "number"], selectedNumber ?? ""],
          2.4,
          0.6,
        ]);
        map.setPaintProperty(CIRCLES, "circle-stroke-color", resolveToken("--text") || "#fff");
      }
    };

    const onClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature?.properties) {
        onSelect(null);
        return;
      }
          const [lng, lat] = (feature.geometry as Point).coordinates;
      onSelect({
        number: String(feature.properties.number),
        name: String(feature.properties.name),
        type: Number(feature.properties.type),
        lat,
        lng,
      });
    };

    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    const onStyle = () => ensure();
    ensure();
    map.on("styledata", onStyle);
    map.on("click", HIT, onClick);
    map.on("mouseenter", HIT, onEnter);
    map.on("mouseleave", HIT, onLeave);

    return () => {
      map.off("styledata", onStyle);
      map.off("click", HIT, onClick);
      map.off("mouseenter", HIT, onEnter);
      map.off("mouseleave", HIT, onLeave);
    };
  }, [map, trains, activeTypes, selectedNumber, onSelect]);

  return null;
}

export { unpack as unpackTrain };
