"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RadioTower, X } from "lucide-react";
import type { PackedTrain } from "@/lib/railradar/liveMap";
import { TrainMap, TypeLegend, TYPE_COLOURS, type MapTrain } from "@/components/map/TrainMap";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";

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
 * looking at it — polling a 60 KB payload in a background tab would be rude on
 * a metered connection.
 */
export function LiveMap() {
  const [selected, setSelected] = useState<MapTrain | null>(null);
  const [hidden, setHidden] = useState<Set<number>>(new Set());

  const { data, isPending, isError, error, refetch, isFetching } = useQuery<LiveMapResponse>({
    queryKey: ["liveMap"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/live-map", { signal });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not load the map");
      return response.json();
    },
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

  const visible = useMemo(
    () => (data?.trains ?? []).filter((t) => activeTypes.has(t[4])).length,
    [data, activeTypes]
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
              <span className="tnum text-text">{visible.toLocaleString("en-IN")}</span> trains moving
              {visible !== data.total && <span className="text-faint"> of {data.total.toLocaleString("en-IN")}</span>}
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

      <div className="relative min-h-0 flex-1">
        {isPending && (
          <div className="flex size-full items-center justify-center p-6">
            <Skeleton className="size-full max-h-[32rem] max-w-[32rem] rounded-2xl" />
          </div>
        )}
        {isError && (
          <div className="p-4 sm:p-6">
            <ErrorState error={error} onRetry={() => refetch()} />
          </div>
        )}
        {data && (
          <TrainMap
            trains={data.trains}
            types={data.types}
            activeTypes={activeTypes}
            selected={selected}
            onSelect={setSelected}
          />
        )}

        {selected && (
          <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl border border-border bg-surface p-3.5 shadow-[var(--shadow-lg)] sm:left-2.5 sm:right-auto sm:w-80">
            <div className="mb-1.5 flex items-start gap-2">
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: TYPE_COLOURS[selected.type] }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2">
                  <span className="tnum text-[0.8125rem] text-faint">{selected.number}</span>
                  <span className="truncate text-[0.9375rem] text-text">{selected.name}</span>
                </p>
                <p className="mt-0.5 text-[0.6875rem] text-faint">
                  {data?.types[selected.type]} · moving now
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="shrink-0 rounded-md p-1 text-faint transition-colors hover:text-text"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
            <Link
              href={`/trains/${selected.number}`}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-[0.8125rem] text-on-brand transition-opacity hover:opacity-90"
            >
              Full route and live status
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
