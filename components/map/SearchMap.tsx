"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Station } from "@/lib/types";
import { api } from "@/lib/apiClient";
import { lookupStationCoords } from "@/lib/geo/stationCoords";
import { ClientRailMap } from "@/components/map/ClientRailMap";
import { MapControls } from "@/components/map/MapControls";
import { TrainLayer, type MapTrain } from "@/components/map/TrainLayer";
import { RouteLayer, type RouteStop } from "@/components/map/RouteLayer";
import { StationPins, type StationPin } from "@/components/map/StationPins";
import { TrainCallout } from "@/components/map/TrainCallout";
import { StationCallout } from "@/components/map/StationCallout";
import { useRailMap } from "@/components/map/mapContext";
import { TRAIN_TYPES } from "@/lib/railradar/trainTypes";

const SEARCH_REFETCH_MS = 10 * 60_000;
const SEARCH_LIMIT = 400;

function pinFor(station: Station | undefined, kind: StationPin["kind"]): StationPin | null {
  if (!station) return null;
  const coords =
    Number.isFinite(station.lat) && Number.isFinite(station.lng)
      ? { lat: station.lat, lng: station.lng }
      : lookupStationCoords(station.code);
  if (!coords) return null;
  return { code: station.code, name: station.name, lat: coords.lat, lng: coords.lng, kind };
}

export function SearchMap({
  origin,
  destination,
  selectedTrain,
  date,
  mapOpen = true,
}: {
  origin?: Station;
  destination?: Station;
  selectedTrain?: string | null;
  date: string;
  mapOpen?: boolean;
}) {
  const [bbox, setBbox] = useState<string | undefined>(undefined);
  const [mapTrain, setMapTrain] = useState<MapTrain | null>(null);
  const [stationPin, setStationPin] = useState<StationPin | null>(null);
  const [routeStop, setRouteStop] = useState<RouteStop | null>(null);

  const { data } = useQuery({
    queryKey: ["liveMap", "search", bbox],
    queryFn: ({ signal }) => api.liveMap({ bbox, limit: SEARCH_LIMIT }, signal),
    refetchInterval: SEARCH_REFETCH_MS,
    refetchIntervalInBackground: false,
  });

  const activeTypes = useMemo(() => new Set((data?.types ?? TRAIN_TYPES).map((_, i) => i)), [data]);

  const pins = useMemo(() => {
    const list: StationPin[] = [];
    const from = pinFor(origin, "origin");
    const to = pinFor(destination, "destination");
    if (from) list.push(from);
    if (to) list.push(to);
    return list;
  }, [origin, destination]);

  return (
    <ClientRailMap onMoveEnd={setBbox} className="size-full min-h-[12rem]">
      <MapControls />
      {data && (
        <TrainLayer
          trains={data.trains}
          activeTypes={activeTypes}
          selectedNumber={selectedTrain}
          dimmed={Boolean(selectedTrain)}
          onSelect={(train) => {
            setStationPin(null);
            setRouteStop(null);
            setMapTrain(train);
          }}
        />
      )}
      {selectedTrain && (
        <RouteLayer
          key={`${selectedTrain}-${mapOpen ? "open" : "closed"}`}
          trainNumber={selectedTrain}
          date={date}
          onSelectStop={(stop) => {
            setMapTrain(null);
            setStationPin(null);
            setRouteStop(stop);
          }}
        />
      )}
      {!selectedTrain && <FitStationPair key={mapOpen ? "open" : "closed"} pins={pins} />}
      <StationPins
        pins={pins}
        onSelect={(pin) => {
          setMapTrain(null);
          setRouteStop(null);
          setStationPin(pin);
        }}
      />
      {mapTrain && data && (
        <TrainCallout
          compact
          train={mapTrain}
          typeName={data.types[mapTrain.type]}
          onClose={() => setMapTrain(null)}
        />
      )}
      {stationPin && (
        <StationCallout pin={stationPin} onClose={() => setStationPin(null)} />
      )}
      {routeStop && (
        <StationCallout
          pin={{
            code: routeStop.code,
            name: routeStop.name,
            lat: routeStop.lat,
            lng: routeStop.lng,
            kind: routeStop.kind === "terminal" ? "origin" : "stop",
          }}
          arrivalMinute={routeStop.arrivalMinute}
          departureMinute={routeStop.departureMinute}
          onClose={() => setRouteStop(null)}
        />
      )}
    </ClientRailMap>
  );
}

function FitStationPair({ pins }: { pins: StationPin[] }) {
  const { fitBounds } = useRailMap();
  const fittedFor = useRef("");

  useEffect(() => {
    if (pins.length < 2) return;
    const key = pins.map((pin) => pin.code).join("-");
    if (fittedFor.current === key) return;
    fittedFor.current = key;
    const lngs = pins.map((pin) => pin.lng);
    const lats = pins.map((pin) => pin.lat);
    fitBounds(Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats), 48);
  }, [pins, fitBounds]);

  return null;
}
