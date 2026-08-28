"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { ClientRailMap } from "@/components/map/ClientRailMap";
import { MapControls } from "@/components/map/MapControls";
import { TrainLayer, type MapTrain } from "@/components/map/TrainLayer";
import { TrainCallout } from "@/components/map/TrainCallout";
import { TRAIN_TYPES } from "@/lib/railradar/trainTypes";

const LANDING_REFETCH_MS = 10 * 60_000;
const LANDING_LIMIT = 600;

/**
 * Ambience, not tracking: a long refetch, a viewport bbox, and a hard limit so
 * the landing page cannot burn the RailRadar month.
 */
export function LandingMap() {
  const [bbox, setBbox] = useState<string | undefined>(undefined);
  const [hidden] = useState<Set<number>>(() => new Set());
  const [selected, setSelected] = useState<MapTrain | null>(null);

  const { data } = useQuery({
    queryKey: ["liveMap", "landing", bbox],
    queryFn: ({ signal }) => api.liveMap({ bbox, limit: LANDING_LIMIT }, signal),
    refetchInterval: LANDING_REFETCH_MS,
    refetchIntervalInBackground: false,
  });

  const activeTypes = useMemo(() => {
    const all = new Set((data?.types ?? TRAIN_TYPES).map((_, i) => i));
    for (const index of hidden) all.delete(index);
    return all;
  }, [data, hidden]);

  return (
    <ClientRailMap onMoveEnd={setBbox} className="size-full min-h-[10rem]">
      <MapControls />
      {data && (
        <TrainLayer
          trains={data.trains}
          activeTypes={activeTypes}
          selectedNumber={selected?.number ?? null}
          onSelect={(train) => setSelected(train)}
        />
      )}
      {selected && data && (
        <TrainCallout
          compact
          train={selected}
          typeName={data.types[selected.type]}
          onClose={() => setSelected(null)}
        />
      )}
    </ClientRailMap>
  );
}
