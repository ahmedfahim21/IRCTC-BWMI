"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { RadioTower, Search } from "lucide-react";
import { packedTrainKey, type PackedTrain } from "@/lib/railradar/packedTrain";
import { api } from "@/lib/apiClient";
import { typeColourVar } from "@/lib/railradar/trainTypes";
import { TypeLegend } from "@/components/map/TypeLegend";
import { ClientRailMap } from "@/components/map/ClientRailMap";
import { MapControls } from "@/components/map/MapControls";
import { TrainLayer, unpackTrain, type MapTrain } from "@/components/map/TrainLayer";
import { RouteLayer } from "@/components/map/RouteLayer";
import { TrainCallout } from "@/components/map/TrainCallout";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { todayIso } from "@/lib/domain/time";
import { cn } from "@/components/ui/cn";

interface LiveMapResponse {
  source: "live" | "generated";
  types: string[];
  updatedAt: string;
  total: number;
  shown: number;
  trains: PackedTrain[];
}

/**
 * The whole network at a glance. Refreshes on its own, but only while you're
 * looking at it — polling in a background tab would be rude on a metered
 * connection. The list pane is the accessible counterpart to the canvas: every
 * train is keyboard-reachable here even if tiles never load.
 */
export function LiveMap() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedNumber = params.get("train");
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [bbox, setBbox] = useState<string | undefined>(undefined);
  const [listFilter, setListFilter] = useState("");

  const { data, isPending, isError, error, refetch, isFetching } = useQuery<LiveMapResponse>({
    queryKey: ["liveMap", bbox],
    queryFn: ({ signal }) => api.liveMap({ bbox, limit: 4000 }, signal),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const counts = useMemo(() => {
    const out = new Array(data?.types.length ?? 9).fill(0);
    for (const train of data?.trains ?? []) out[train[4]] = (out[train[4]] ?? 0) + 1;
    return out;
  }, [data]);

  const activeTypes = useMemo(() => {
    const all = new Set((data?.types ?? []).map((_, i) => i));
    for (const index of hidden) all.delete(index);
    return all;
  }, [data, hidden]);

  const visibleTrains = useMemo(
    () => (data?.trains ?? []).filter((t) => activeTypes.has(t[4])),
    [data, activeTypes]
  );

  const listed = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return visibleTrains;
    return visibleTrains.filter((t) => t[0].includes(q) || t[1].toLowerCase().includes(q));
  }, [visibleTrains, listFilter]);

  const selected = useMemo(() => {
    if (!selectedNumber || !data) return null;
    const packed = data.trains.find((t) => t[0] === selectedNumber);
    return packed ? unpackTrain(packed) : null;
  }, [selectedNumber, data]);

  const { data: trainDetail } = useQuery({
    queryKey: ["train", selectedNumber, todayIso()],
    queryFn: ({ signal }) => api.train(selectedNumber!, todayIso(), signal),
    enabled: Boolean(selectedNumber),
  });

  const selectTrain = useCallback(
    (train: MapTrain | null) => {
      const next = new URLSearchParams(params.toString());
      if (train) next.set("train", train.number);
      else next.delete("train");
      const qs = next.toString();
      router.replace(qs ? `/map?${qs}` : "/map", { scroll: false });
    },
    [params, router]
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="border-b border-border px-4 py-2.5 sm:px-6">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="flex items-center gap-2 text-[1.0625rem] tracking-[-0.01em]">
            <RadioTower className="size-4 text-brand" aria-hidden />
            Live map
          </h1>
          {data && (
            <p className="text-[0.75rem] text-dim">
              <span className="tnum text-text">{visibleTrains.length.toLocaleString("en-IN")}</span> trains moving
              {visibleTrains.length !== data.total && (
                <span className="text-faint"> of {data.total.toLocaleString("en-IN")}</span>
              )}
            </p>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-[0.6875rem] text-faint">
            {isFetching && <span className="size-1.5 animate-pulse rounded-full bg-ok" aria-hidden />}
            {data ? `updated ${new Date(data.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
        </div>

        {data && (
          <TypeLegend
            types={data.types}
            activeTypes={activeTypes}
            counts={counts}
            onToggle={(index) =>
              setHidden((previous) => {
                const next = new Set(previous);
                if (next.has(index)) next.delete(index);
                else next.add(index);
                return next;
              })
            }
          />
        )}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        <aside className="flex max-h-[40vh] min-h-0 flex-col border-b border-border lg:max-h-none lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-2.5">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" aria-hidden />
              <input
                type="search"
                value={listFilter}
                onChange={(event) => setListFilter(event.target.value)}
                placeholder="Find a train"
                className="field h-9 w-full rounded-full pl-8 pr-3 text-[0.8125rem] text-text outline-none placeholder:text-faint"
              />
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-label="Running trains">
            {isPending && (
              <div className="p-3">
                <Skeleton className="h-24 w-full" />
              </div>
            )}
            {isError && (
              <div className="p-3">
                <ErrorState error={error} onRetry={() => refetch()} />
              </div>
            )}
            {!isPending && !isError && listed.length === 0 && (
              <p className="px-3 py-6 text-center text-[0.8125rem] text-faint">
                No running train matches &ldquo;{listFilter}&rdquo;.
              </p>
            )}
            {listed.map((train, index) => {
              const item = unpackTrain(train);
              const active = item.number === selectedNumber;
              return (
                <button
                  key={packedTrainKey(train, index)}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectTrain(item)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-2",
                    active && "bg-brand-soft shadow-[inset_2px_0_0_var(--brand)]"
                  )}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: typeColourVar(item.type) }}
                    aria-hidden
                  />
                  <span className="tnum shrink-0 font-mono text-[0.75rem] text-brand">{item.number}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-dim">{item.name}</span>
                  <span className="shrink-0 text-[0.5625rem] uppercase tracking-[0.08em] text-faint">
                    {data?.types[item.type]}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">
            {selected ? `Selected ${selected.number} ${selected.name}` : "No train selected"}
          </p>
        </aside>

        <div className="relative min-h-[16rem] min-w-0">
          <ClientRailMap onMoveEnd={setBbox}>
            <MapControls />
            {data && (
              <TrainLayer
                trains={data.trains}
                activeTypes={activeTypes}
                selectedNumber={selectedNumber}
                onSelect={(train) => {
                  if (train) selectTrain(train);
                }}
              />
            )}
            {selectedNumber && <RouteLayer trainNumber={selectedNumber} date={todayIso()} />}
          </ClientRailMap>

          {selected && (
            <TrainCallout
              train={selected}
              typeName={data?.types[selected.type]}
              onClose={() => selectTrain(null)}
              schedule={trainDetail?.train.schedule}
              stations={trainDetail?.stations}
              dateIso={todayIso()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
