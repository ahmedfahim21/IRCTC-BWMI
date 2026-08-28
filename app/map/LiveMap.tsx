"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RadioTower, Search, X } from "lucide-react";
import type { PackedTrain } from "@/lib/railradar/liveMap";
import { api } from "@/lib/apiClient";
import { typeColourVar } from "@/lib/railradar/trainTypes";
import { TypeLegend } from "@/components/map/TypeLegend";
import { ClientRailMap } from "@/components/map/ClientRailMap";
import { MapControls } from "@/components/map/MapControls";
import { TrainLayer, unpackTrain, type MapTrain } from "@/components/map/TrainLayer";
import { RouteLayer } from "@/components/map/RouteLayer";
import { RailSpine } from "@/components/rail/RailSpine";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
            <RadioTower className="size-4 text-primary" aria-hidden />
            Live map
          </h1>
          {data && (
            <p className="text-[0.75rem] text-muted-foreground">
              <span className="tnum text-foreground">{visibleTrains.length.toLocaleString("en-IN")}</span> trains moving
              {visibleTrains.length !== data.total && (
                <span className="text-muted-foreground"> of {data.total.toLocaleString("en-IN")}</span>
              )}
            </p>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
            {isFetching && <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden />}
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
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={listFilter}
                onChange={(event) => setListFilter(event.target.value)}
                placeholder="Find a train"
                className="h-9 rounded-lg border-border bg-muted pl-8 pr-3 text-[0.8125rem]"
              />
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
          <div role="listbox" aria-label="Running trains">
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
            {listed.map((train) => {
              const item = unpackTrain(train);
              const active = item.number === selectedNumber;
              return (
                <Button
                  key={item.number}
                  type="button"
                  variant="ghost"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectTrain(item)}
                  className={cn(
                    "h-auto w-full items-start gap-2.5 rounded-none border-b border-border px-3 py-2.5 text-left hover:bg-muted",
                    active && "bg-accent"
                  )}
                >
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full"
                    style={{ background: typeColourVar(item.type) }}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="tnum text-[0.75rem] text-muted-foreground">{item.number}</span>
                      <span className="truncate text-[0.8125rem] text-foreground">{item.name}</span>
                    </span>
                    <span className="text-[0.6875rem] text-muted-foreground">{data?.types[item.type]}</span>
                  </span>
                </Button>
              );
            })}
          </div>
          </ScrollArea>
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
            <div className="absolute inset-x-2.5 bottom-2.5 z-20 max-h-[45%] overflow-y-auto rounded-xl border border-border bg-card p-3.5 shadow-[var(--shadow-lg)] sm:left-2.5 sm:right-auto sm:w-[22rem]">
              <div className="mb-1.5 flex items-start gap-2">
                <span
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{ background: typeColourVar(selected.type) }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <span className="tnum text-[0.8125rem] text-muted-foreground">{selected.number}</span>
                    <span className="truncate text-[0.9375rem] text-foreground">{selected.name}</span>
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">{data?.types[selected.type]} · moving now</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => selectTrain(null)}
                  aria-label="Close"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </div>
              {trainDetail && (
                <div className="mb-3 max-h-48 overflow-y-auto">
                  <RailSpine
                    schedule={trainDetail.train.schedule}
                    stations={trainDetail.stations}
                    dateIso={todayIso()}
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Link
                  href={`/trains/${selected.number}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[0.8125rem] text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Full route
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                {trainDetail && (
                  <Link
                    href={`/?from=${trainDetail.train.schedule[0]?.stationCode ?? ""}`}
                    className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-[0.8125rem] text-muted-foreground hover:text-foreground"
                  >
                    Search from here
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
