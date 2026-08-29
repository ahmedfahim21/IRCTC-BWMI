"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import type { ClassCode, QuotaCode } from "@/lib/types";
import { api } from "@/lib/apiClient";
import { isConfirmable } from "@/lib/domain/search";
import { todayIso } from "@/lib/domain/time";
import { useAgentIntentDrain, useAgentPublish } from "@/lib/agent/agentStore";
import { JourneyRow } from "@/components/availability/JourneyRow";
import { ResultFilters, DEPARTURE_WINDOWS, type Filters } from "@/components/availability/ResultFilters";
import { AlternativesPanel } from "@/components/availability/AlternativesPanel";
import { GlossaryLegend } from "@/components/availability/GlossaryLegend";
import { DateStrip } from "@/components/search/DateStrip";
import { SearchForm } from "@/components/search/SearchForm";
import { SearchMap } from "@/components/map/SearchMap";
import { MapCanvasCard } from "@/components/map/MapCanvasCard";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useLocale } from "@/lib/i18n/useLocale";

export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const publish = useAgentPublish();
  const { t } = useLocale();

  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const date = params.get("date") ?? todayIso();
  const quota = (params.get("quota") ?? "GN") as QuotaCode;
  const selectedTrain = params.get("train");

  const [mapOpen, setMapOpen] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    departureWindows: [],
    classes: [],
    confirmableOnly: false,
    sort: "departure",
  });

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["search", from, to, date, quota],
    queryFn: ({ signal }) => api.search({ from, to, date, quota }, signal),
    enabled: Boolean(from && to),
  });

  const availableClasses = useMemo(() => {
    const set = new Set<ClassCode>();
    for (const journey of data?.journeys ?? []) {
      for (const a of journey.availability) set.add(a.classCode);
    }
    return [...set].sort();
  }, [data]);

  const statusCodes = useMemo(() => {
    const set = new Set<string>();
    for (const journey of data?.journeys ?? []) {
      for (const a of journey.availability) set.add(a.label.split(" ")[0]);
    }
    return [...set];
  }, [data]);

  const filtered = useMemo(() => {
    let list = data?.journeys ?? [];

    if (filters.departureWindows.length) {
      const windows = DEPARTURE_WINDOWS.filter((w) => filters.departureWindows.includes(w.id));
      list = list.filter((j) => {
        const minute = j.departureMinute % 1440;
        return windows.some((w) => minute >= w.from && minute < w.to);
      });
    }
    if (filters.classes.length) {
      list = list.filter((j) => j.availability.some((a) => filters.classes.includes(a.classCode)));
    }
    if (filters.confirmableOnly) {
      list = list.filter((j) => j.runsToday && j.availability.some(isConfirmable));
    }

    const cheapest = (j: (typeof list)[number]) =>
      Math.min(...j.availability.filter((a) => filters.classes.length === 0 || filters.classes.includes(a.classCode)).map((a) => a.fare.total));

    return [...list].sort((a, b) => {
      switch (filters.sort) {
        case "duration":
          return a.durationMins - b.durationMins;
        case "arrival":
          return a.arrivalMinute - b.arrivalMinute;
        case "fare":
          return cheapest(a) - cheapest(b);
        case "departure":
          return a.departureMinute - b.departureMinute;
        default: {
          const _never: never = filters.sort;
          return _never;
        }
      }
    });
  }, [data, filters]);

  useAgentIntentDrain(
    Boolean(data && !isPending && from && to),
    async (intent) => {
      if (intent.name === "highlight") {
        const trainNumber = String(intent.input.trainNumber ?? "");
        const nextParams = new URLSearchParams({ from, to, date, quota, train: trainNumber });
        router.replace(`/search?${nextParams}`, { scroll: false });
        return { ok: true, detail: `Highlighted train ${trainNumber}` };
      }
      if (intent.name === "select_class") {
        const classCode = String(intent.input.classCode ?? "") as ClassCode;
        const trainNumber = selectedTrain ?? filtered[0]?.train.number;
        const journey = filtered.find((item) => item.train.number === trainNumber) ?? filtered[0];
        if (!journey) {
          return { ok: false, error: "No trains on screen to book." };
        }
        const availability = journey.availability.find((entry) => entry.classCode === classCode);
        if (!availability || !journey.runsToday) {
          return { ok: false, error: `Class ${classCode} is not bookable on the visible train.` };
        }
        const { draft } = await api.createDraft({
          trainNumber: journey.train.number,
          journeyDate: date,
          fromCode: journey.fromCode,
          toCode: journey.toCode,
          classCode,
          quota,
        });
        router.push(`/book/${draft.draftId}`);
        return { ok: true, detail: `Started booking ${journey.train.number} in ${classCode}` };
      }
      return { ok: false, error: `Unhandled intent ${intent.name}` };
    },
    (intent) => intent.name === "highlight" || intent.name === "select_class"
  );

  useEffect(() => {
    if (!data || !from || !to) return;
    publish.current({
      searchResults: {
        from,
        to,
        date,
        quota,
        highlightedTrain: selectedTrain,
        trains: (data.journeys ?? []).map((journey) => ({
          number: journey.train.number,
          name: journey.train.name,
          classes: journey.availability.map((entry) => entry.classCode),
        })),
      },
    });
  }, [data, from, to, date, quota, selectedTrain, publish]);

  const setDate = (next: string) => {
    const nextParams = new URLSearchParams({ from, to, date: next, quota });
    if (selectedTrain) nextParams.set("train", selectedTrain);
    router.push(`/search?${nextParams}`);
  };

  const selectTrain = (number: string) => {
    const nextParams = new URLSearchParams({ from, to, date, quota, train: number });
    router.replace(`/search?${nextParams}`, { scroll: false });
  };

  if (!from || !to) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <p className="text-dim">{t("results.noRoute")}</p>
      </div>
    );
  }

  const originName = data?.stations[data.query.fromCodes[0]]?.name ?? from.replace("city:", "");
  const destinationName = data?.stations[data.query.toCodes[0]]?.name ?? to.replace("city:", "");
  const searchDefaults = useMemo(
    () => ({
      from: { token: from, label: originName, sublabel: from.replace("city:", "") },
      to: { token: to, label: destinationName, sublabel: to.replace("city:", "") },
      date,
      quota,
    }),
    [from, to, date, quota, originName, destinationName]
  );

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden">
      <div className="shrink-0 border-b border-border bg-surface px-4 py-2.5 sm:px-6">
        <SearchForm variant="bar" defaults={searchDefaults} />
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)]">
        <div className="min-w-0 px-4 pb-20 pt-4 sm:px-6 lg:overflow-y-auto">
          <div className="mb-3">
            <DateStrip from={from} to={to} date={date} onPick={setDate} />
          </div>

          {isPending && <SkeletonRows rows={5} />}
          {isError && <ErrorState error={error} onRetry={() => refetch()} />}

          {data && (
            <>
              {data.journeys.length === 0 ? (
                <EmptyRoute
                  originName={originName}
                  destinationName={destinationName}
                  noDirectTrain={Boolean(data.noDirectTrain)}
                />
              ) : (
                <>
                  <div className="mb-3">
                    <ResultFilters
                      filters={filters}
                      onChange={setFilters}
                      availableClasses={availableClasses}
                      matchCount={filtered.length}
                      totalCount={data.journeys.length}
                    />
                  </div>

                  {!data.anyConfirmable && (
                    <div className="card mb-3 flex items-start gap-2.5 border-warn/30 bg-warn-soft p-3.5">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                      <div>
                        <p className="text-[0.875rem] text-text">{t("results.noneConfirmable")}</p>
                        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-dim">
                          {t("results.noneConfirmableBody")}
                        </p>
                      </div>
                    </div>
                  )}

                  {filtered.length === 0 ? (
                    <p className="card p-8 text-center text-[0.875rem] text-dim">
                      {t("results.noMatch")}{" "}
                      <button
                        type="button"
                        onClick={() => setFilters({ ...filters, departureWindows: [], classes: [], confirmableOnly: false })}
                        className="underline decoration-dotted underline-offset-2"
                      >
                        {t("search.clear")}
                      </button>
                      .
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {filtered.map((journey) => (
                        <JourneyRow
                          key={`${journey.train.number}:${journey.fromCode}:${journey.toCode}`}
                          journey={journey}
                          stations={data.stations}
                          date={date}
                          quota={quota}
                          selected={selectedTrain === journey.train.number}
                          onSelect={() => selectTrain(journey.train.number)}
                        />
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    <GlossaryLegend classCodes={availableClasses} statusCodes={statusCodes} />
                  </div>

                  {data.alternatives.length > 0 && (
                    <div className="mt-8">
                      <h2 className="mb-4 text-[1.0625rem] tracking-[-0.01em] text-text">{t("results.otherWays")}</h2>
                      <AlternativesPanel groups={data.alternatives} stations={data.stations} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <aside className="hidden min-h-0 border-l border-border lg:block">
          <MapCanvasCard
            label={t("results.routeMap")}
            className="flex h-full flex-col rounded-none border-0 shadow-none"
            bodyClassName="min-h-0 flex-1"
            onOpenChange={setMapOpen}
          >
              <SearchMap
                origin={data?.stations[data.query.fromCodes[0]]}
                destination={data?.stations[data.query.toCodes[0]]}
                fromToken={from}
                toToken={to}
                quota={quota}
                selectedTrain={selectedTrain}
                date={date}
                mapOpen={mapOpen}
              />
            </MapCanvasCard>
        </aside>
      </div>
    </div>
  );
}

function EmptyRoute({
  originName,
  destinationName,
  noDirectTrain,
}: {
  originName: string;
  destinationName: string;
  noDirectTrain: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="card p-8 text-center">
      <p className="text-[0.9375rem] text-text">
        {t("results.noDirect")} {originName} → {destinationName}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[0.8125rem] leading-relaxed text-dim">
        {noDirectTrain ? t("results.noDirectExplained") : t("results.noConnection")}
      </p>
    </div>
  );
}
