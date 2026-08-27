"use client";

import { useEffect, useRef } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useQuery } from "@tanstack/react-query";
import type { ScheduleStop, Station } from "@/lib/types";
import { api } from "@/lib/apiClient";
import { resolveToken } from "@/lib/railradar/trainTypes";
import { useRailMap } from "./mapContext";

const SOURCE = "train-route";
const LINE = "train-route-line";
const HALTS = "train-route-halts";
const TERMINALS = "train-route-terminals";

function routeCollection(
  schedule: ScheduleStop[],
  stations: Record<string, Station>
): { collection: FeatureCollection; bounds: [[number, number], [number, number]] | null } {
  const coords: [number, number][] = [];
  const pointFeatures: Feature[] = [];

  const usable = schedule.filter((stop) => {
    const station = stations[stop.stationCode];
    return station && Number.isFinite(station.lat) && Number.isFinite(station.lng);
  });

  usable.forEach((stop, index) => {
    const station = stations[stop.stationCode];
    const pair: [number, number] = [station.lng, station.lat];
    coords.push(pair);
    const kind = index === 0 || index === usable.length - 1 ? "terminal" : stop.isHalt ? "halt" : "pass";
    if (kind === "pass") return;
    pointFeatures.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: pair },
      properties: { code: station.code, name: station.name, kind },
    });
  });

  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: [
      ...(coords.length >= 2
        ? [
            {
              type: "Feature" as const,
              geometry: { type: "LineString" as const, coordinates: coords },
              properties: { kind: "line" },
            },
          ]
        : []),
      ...pointFeatures,
    ],
  };

  if (coords.length === 0) return { collection, bounds: null };
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return { collection, bounds: [[minLng, minLat], [maxLng, maxLat]] };
}

function ensureLayers(map: MapLibreMap) {
  const brand = resolveToken("--brand") || "#4d82e3";
  const surface = resolveToken("--surface") || "#111";

  if (!map.getLayer(LINE)) {
    map.addLayer({
      id: LINE,
      type: "line",
      source: SOURCE,
      filter: ["==", ["geometry-type"], "LineString"],
      paint: { "line-color": brand, "line-width": 3.2, "line-opacity": 0.9 },
      layout: { "line-cap": "round", "line-join": "round" },
    });
    map.addLayer({
      id: HALTS,
      type: "circle",
      source: SOURCE,
      filter: ["==", ["get", "kind"], "halt"],
      paint: {
        "circle-radius": 4,
        "circle-color": surface,
        "circle-stroke-width": 1.6,
        "circle-stroke-color": brand,
      },
    });
    map.addLayer({
      id: TERMINALS,
      type: "circle",
      source: SOURCE,
      filter: ["==", ["get", "kind"], "terminal"],
      paint: {
        "circle-radius": 6,
        "circle-color": brand,
        "circle-stroke-width": 2,
        "circle-stroke-color": surface,
      },
    });
  } else {
    map.setPaintProperty(LINE, "line-color", brand);
    map.setPaintProperty(HALTS, "circle-stroke-color", brand);
    map.setPaintProperty(HALTS, "circle-color", surface);
    map.setPaintProperty(TERMINALS, "circle-color", brand);
    map.setPaintProperty(TERMINALS, "circle-stroke-color", surface);
  }
}

/**
 * A train's route from `/api/trains/{number}` — schedule zipped with station
 * coordinates — plus halt circles, origin/destination pins, and fitBounds.
 */
export function RouteLayer({
  trainNumber,
  date,
  schedule,
  stations,
}: {
  trainNumber?: string | null;
  date?: string;
  schedule?: ScheduleStop[];
  stations?: Record<string, Station>;
}) {
  const { map, reducedMotion } = useRailMap();
  const fittedFor = useRef<string | null>(null);

  const { data } = useQuery({
    queryKey: ["train", trainNumber, date],
    queryFn: ({ signal }) => api.train(trainNumber!, date, signal),
    enabled: Boolean(trainNumber) && !schedule,
  });

  const resolvedSchedule = schedule ?? data?.train.schedule;
  const resolvedStations = stations ?? data?.stations;
  const key = trainNumber ?? "";

  useEffect(() => {
    if (!map) return;

    const paint = () => {
      if (!map.getStyle()) return;
      if (!resolvedSchedule || !resolvedStations || !key) {
        const existing = map.getSource(SOURCE) as GeoJSONSource | undefined;
        existing?.setData({ type: "FeatureCollection", features: [] });
        return;
      }

      const { collection, bounds } = routeCollection(resolvedSchedule, resolvedStations);
      const existing = map.getSource(SOURCE) as GeoJSONSource | undefined;
      if (existing) existing.setData(collection);
      else map.addSource(SOURCE, { type: "geojson", data: collection });
      ensureLayers(map);

      if (bounds && fittedFor.current !== key) {
        fittedFor.current = key;
        map.fitBounds(bounds, { padding: 48, duration: reducedMotion ? 0 : 700, maxZoom: 8 });
      }
    };

    paint();
    map.on("styledata", paint);
    return () => {
      map.off("styledata", paint);
    };
  }, [map, resolvedSchedule, resolvedStations, key, reducedMotion]);

  useEffect(() => {
    fittedFor.current = null;
  }, [key]);

  return null;
}
