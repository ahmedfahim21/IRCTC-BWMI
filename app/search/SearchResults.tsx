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
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
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
        <p className="text-muted-foreground">No route chosen.</p>
      </div>
    );
  }

  const originName = data?.stations[data.query.fromCodes[0]]?.name ?? from.replace("city:", "");
  const destinationName = data?.stations[data.query.toCodes[0]]?.name ?? to.replace("city:", "");

  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(22rem,36rem)_1fr]">
      <div className="min-w-0 px-4 pb-20 pt-5 sm:px-6">
      {/* Journey summary, editable in place — the search is never a dead end you have to back out of. */}
      <Card className="mb-4 gap-0 py-0 shadow-none">
        <CardContent className="p-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="flex min-w-0 items-center gap-2 text-[0.9375rem] text-foreground">
            <span className="truncate">{originName}</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{destinationName}</span>
          </p>
          <Collapsible open={showDates} onOpenChange={setShowDates}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "gap-1.5 rounded-lg text-[0.75rem]",
                  showDates ? "border-primary text-primary" : "text-muted-foreground"
                )}
              >
                <CalendarDays className="size-3.5" aria-hidden />
                {formatWeekday(date)} {formatDateShort(date)}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Separator className="my-3.5" />
              <DateStrip from={from} to={to} date={date} onPick={setDate} />
            </CollapsibleContent>
          </Collapsible>
          <span className="rounded-lg border border-border px-2.5 py-1.5 text-[0.75rem] text-muted-foreground">
            {GLOSSARY[quota].short}
          </span>
          <Button
            type="button"
            variant="link"
            onClick={() => router.push("/")}
            className="ml-auto h-auto p-0 text-[0.75rem] text-muted-foreground decoration-dotted"
          >
            Change route
          </Button>
        </div>
        </CardContent>
      </Card>

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
              <Card className="mb-4 gap-0 py-0 shadow-none">
                <CardContent className="p-3.5">
                <div className="mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5 text-muted-foreground" aria-hidden />
                  <span className="eyebrow">Narrow it down</span>
                </div>
                <ResultFilters
                  filters={filters}
                  onChange={setFilters}
                  availableClasses={availableClasses}
                  matchCount={filtered.length}
                  totalCount={data.journeys.length}
                />
                </CardContent>
              </Card>

              {!data.anyConfirmable && (
                <Card className="mb-4 gap-0 border-warning/30 bg-warning-soft py-0 shadow-none">
                  <CardContent className="flex items-start gap-2.5 p-3.5">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                  <div>
                    <p className="text-[0.875rem] text-foreground">Nothing on this date is likely to confirm</p>
                    <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      Every class on every train is either full or on a waiting list that rarely clears.
                      The options below are what we&rsquo;d actually try next.
                    </p>
                  </div>
                  </CardContent>
                </Card>
              )}

              {filtered.length === 0 ? (
                <Card className="gap-0 py-0 shadow-none">
                  <CardContent className="p-8 text-center text-[0.875rem] text-muted-foreground">
                  No train matches these filters.{" "}
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setFilters({ ...filters, departureWindows: [], classes: [], confirmableOnly: false })}
                    className="h-auto p-0 decoration-dotted"
                  >
                    Clear them
                  </Button>
                  .
                  </CardContent>
                </Card>
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
                  <h2 className="mb-4 text-[1.0625rem] tracking-[-0.01em] text-foreground">Other ways to get there</h2>
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
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className="p-8 text-center">
      <p className="text-[0.9375rem] text-foreground">
        No direct train runs {originName} → {destinationName}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">
        {noDirectTrain
          ? "Both stations exist and the timetable was checked — Indian Railways simply doesn't run a through train on this pair. You'll need to change somewhere along the way."
          : "Nothing in the timetable connects these two stations without a change. Try a nearby junction, or a different pair of cities."}
      </p>
      </CardContent>
    </Card>
  );
}
