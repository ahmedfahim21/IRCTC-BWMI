"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, SlidersHorizontal, TriangleAlert } from "lucide-react";
import type { ClassCode, QuotaCode } from "@/lib/types";
import { api } from "@/lib/apiClient";
import { isConfirmable } from "@/lib/domain/search";
import { formatDateShort, formatWeekday, todayIso } from "@/lib/domain/time";
import { GLOSSARY } from "@/lib/glossary";
import { useAgentIntentDrain, useAgentPublish } from "@/lib/agent/agentStore";
import { JourneyRow } from "@/components/availability/JourneyRow";
import { ResultFilters, DEPARTURE_WINDOWS, type Filters } from "@/components/availability/ResultFilters";
import { AlternativesPanel } from "@/components/availability/AlternativesPanel";
import { GlossaryLegend } from "@/components/availability/GlossaryLegend";
import { DateStrip } from "@/components/search/DateStrip";
import { SearchMap } from "@/components/map/SearchMap";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/components/ui/cn";

export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const publish = useAgentPublish();

  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const date = params.get("date") ?? todayIso();
  const quota = (params.get("quota") ?? "GN") as QuotaCode;
  const selectedTrain = params.get("train");

  const [showDates, setShowDates] = useState(false);
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
        default:
          return a.departureMinute - b.departureMinute;
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
    setShowDates(false);
  };

  const selectTrain = (number: string) => {
    const nextParams = new URLSearchParams({ from, to, date, quota, train: number });
    router.replace(`/search?${nextParams}`, { scroll: false });
  };

  if (!from || !to) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <p className="text-dim">No route chosen.</p>
      </div>
    );
  }

  const originName = data?.stations[data.query.fromCodes[0]]?.name ?? from.replace("city:", "");
  const destinationName = data?.stations[data.query.toCodes[0]]?.name ?? to.replace("city:", "");

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(22rem,36rem)_1fr]">
      <div className="min-w-0 px-4 pb-20 pt-5 sm:px-6">
      {/* Journey summary, editable in place — the search is never a dead end you have to back out of. */}
      <div className="card mb-4 p-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="flex min-w-0 items-center gap-2 text-[0.9375rem] text-text">
            <span className="truncate">{originName}</span>
            <ArrowRight className="size-3.5 shrink-0 text-faint" aria-hidden />
            <span className="truncate">{destinationName}</span>
          </p>
          <button
            type="button"
            onClick={() => setShowDates((v) => !v)}
            aria-expanded={showDates}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[0.75rem] transition-colors",
              showDates ? "border-brand text-brand" : "border-border text-dim hover:border-border-strong"
            )}
          >
            <CalendarDays className="size-3.5" aria-hidden />
            {formatWeekday(date)} {formatDateShort(date)}
          </button>
          <span className="rounded-lg border border-border px-2.5 py-1.5 text-[0.75rem] text-dim">
            {GLOSSARY[quota].short}
          </span>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="ml-auto text-[0.75rem] text-faint underline decoration-dotted underline-offset-2 hover:text-dim"
          >
            Change route
          </button>
        </div>

        {showDates && (
          <div className="mt-3.5 border-t border-border pt-3.5">
            <DateStrip from={from} to={to} date={date} onPick={setDate} />
          </div>
        )}
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
              <div className="card mb-4 p-3.5">
                <div className="mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5 text-faint" aria-hidden />
                  <span className="eyebrow">Narrow it down</span>
                </div>
                <ResultFilters
                  filters={filters}
                  onChange={setFilters}
                  availableClasses={availableClasses}
                  matchCount={filtered.length}
                  totalCount={data.journeys.length}
                />
              </div>

              {!data.anyConfirmable && (
                <div className="card mb-4 flex items-start gap-2.5 border-warn/30 bg-warn-soft p-3.5">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                  <div>
                    <p className="text-[0.875rem] text-text">Nothing on this date is likely to confirm</p>
                    <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-dim">
                      Every class on every train is either full or on a waiting list that rarely clears.
                      The options below are what we&rsquo;d actually try next.
                    </p>
                  </div>
                </div>
              )}

              {filtered.length === 0 ? (
                <p className="card p-8 text-center text-[0.875rem] text-dim">
                  No train matches these filters.{" "}
                  <button
                    type="button"
                    onClick={() => setFilters({ ...filters, departureWindows: [], classes: [], confirmableOnly: false })}
                    className="underline decoration-dotted underline-offset-2"
                  >
                    Clear them
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
                <div className="mt-8 border-t border-border pt-7">
                  <h2 className="mb-4 text-[1.0625rem] tracking-[-0.01em] text-text">Other ways to get there</h2>
                  <AlternativesPanel groups={data.alternatives} stations={data.stations} />
                </div>
              )}
            </>
          )}
        </>
      )}
      </div>
      <div className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] min-h-[16rem] lg:block">
        <SearchMap
          origin={data?.stations[data.query.fromCodes[0]]}
          destination={data?.stations[data.query.toCodes[0]]}
          selectedTrain={selectedTrain}
          date={date}
        />
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
  return (
    <div className="card p-8 text-center">
      <p className="text-[0.9375rem] text-text">
        No direct train runs {originName} → {destinationName}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[0.8125rem] leading-relaxed text-dim">
        {noDirectTrain
          ? "Both stations exist and the timetable was checked — Indian Railways simply doesn't run a through train on this pair. You'll need to change somewhere along the way."
          : "Nothing in the timetable connects these two stations without a change. Try a nearby junction, or a different pair of cities."}
      </p>
    </div>
  );
}
