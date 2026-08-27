"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Station } from "@/lib/types";
import { api } from "@/lib/apiClient";
import { lookupStationCoords } from "@/lib/geo/stationCoords";
import { ClientRailMap } from "@/components/map/ClientRailMap";
import { MapControls } from "@/components/map/MapControls";
import { TrainLayer } from "@/components/map/TrainLayer";
import { RouteLayer } from "@/components/map/RouteLayer";
import { StationPins, type StationPin } from "@/components/map/StationPins";
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
}: {
  origin?: Station;
  destination?: Station;
  selectedTrain?: string | null;
  date: string;
}) {
  const [bbox, setBbox] = useState<string | undefined>(undefined);

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
          onSelect={() => undefined}
        />
      )}
      {selectedTrain && <RouteLayer trainNumber={selectedTrain} date={date} />}
      <StationPins pins={pins} />
    </ClientRailMap>
  );
}
