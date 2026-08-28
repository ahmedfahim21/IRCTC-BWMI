"use client";

import { useEffect, useRef } from "react";
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

  if (map) return null;
  return (
    <SlippyTrainOverlay
      trains={trains}
      activeTypes={activeTypes}
      selectedNumber={selectedNumber}
      onSelect={onSelect}
    />
  );
}

function SlippyTrainOverlay({
  trains,
  activeTypes,
  selectedNumber,
}: {
  trains: PackedTrain[];
  activeTypes: Set<number>;
  selectedNumber?: string | null;
  onSelect: (train: MapTrain | null) => void;
}) {
  const { project, viewEpoch, theme } = useRailMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width < 2 || height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const colours = resolveTypeColours();
    const stroke = resolveToken("--text") || (theme === "dark" ? "#fff" : "#111");

    for (const packed of trains) {
      if (!activeTypes.has(packed[4])) continue;
      const lat = packed[2];
      const lng = packed[3];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const pt = project(lng, lat);
      if (!pt) continue;
      if (pt.x < -12 || pt.y < -12 || pt.x > width + 12 || pt.y > height + 12) continue;
      const selected = packed[0] === selectedNumber;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, selected ? 5.5 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = colours[packed[4]] ?? "#888";
      ctx.fill();
      ctx.lineWidth = selected ? 2.2 : 0.7;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }, [trains, activeTypes, selectedNumber, project, viewEpoch, theme]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="map-train-overlay"
      className="pointer-events-none absolute inset-0 z-[4] size-full"
      role="img"
      aria-label="Running trains on the map"
    />
  );
}

export { unpack as unpackTrain };
