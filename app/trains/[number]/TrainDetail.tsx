"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gauge, Info, MapPin, Repeat, Route, Timer, Utensils } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatDuration, formatMinute, todayIso } from "@/lib/domain/time";
import { RailSpine } from "@/components/rail/RailSpine";
import { TrainHeroMap } from "@/components/map/TrainHeroMap";
import { CoachStrip, PlatformDiagram } from "@/components/coach/CoachStrip";
import { BerthMap } from "@/components/coach/BerthMap";
import { PunctualitySparkline } from "@/components/rail/PunctualitySparkline";
import { CrossingsList } from "@/components/rail/CrossingsList";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { ErrorState } from "@/components/ui/ErrorState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const TABS = ["route", "coaches", "crossings", "punctuality"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  route: "Route",
  coaches: "Coaches",
  crossings: "Trains you meet",
  punctuality: "How late it runs",
};

export function TrainDetail({ number }: { number: string }) {
  const params = useSearchParams();
  const date = params.get("date") ?? todayIso();
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;
  const [tab, setTab] = useState<Tab>("route");
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["train", number, date],
    queryFn: ({ signal }) => api.train(number, date, signal),
  });

  const { data: liveData } = useQuery({
    queryKey: ["live", number, date],
    queryFn: ({ signal }) => api.live(number, date, signal),
    enabled: Boolean(data),
    refetchInterval: 20_000,
  });

  const { data: coachData } = useQuery({
    queryKey: ["coaches", number, data?.train.classes[0], date],
    queryFn: ({ signal }) =>
      api.coaches(
        number,
        data!.train.classes[0],
        {
          from: data!.train.schedule[0].stationCode,
          to: data!.train.schedule[data!.train.schedule.length - 1].stationCode,
          date,
        },
        signal
      ),
    enabled: Boolean(data) && tab === "coaches",
  });

  if (isPending) return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6"><SkeletonRows rows={4} /></div>;
  if (isError)
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );

  const { train, stations, crossings, punctuality } = data;
  const first = train.schedule[0];
  const last = train.schedule[train.schedule.length - 1];
  const live = liveData?.live ?? null;
  const selectedLayout =
    coachData?.coaches.find((c) => c.code === selectedCoach) ?? coachData?.coaches[0] ?? null;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-5 sm:px-6">
      <header className="mb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tnum text-[1.0625rem] text-muted-foreground">{train.number}</span>
          <h1 className="text-[1.25rem] tracking-[-0.01em] text-foreground">{train.name}</h1>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[0.6875rem] capitalize text-muted-foreground">{train.type}</span>
          {train.hasPantry && (
            <span className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
              <Utensils className="size-3" aria-hidden /> Pantry
            </span>
          )}
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.875rem] text-muted-foreground">
          <span>{stations[first.stationCode]?.name}</span>
          <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
          <span>{stations[last.stationCode]?.name}</span>
          <span className="tnum text-muted-foreground">
            {formatMinute(first.departureMinute)} → {formatMinute(last.arrivalMinute)}
          </span>
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground" aria-label="Days it runs">
            {DAY_LETTERS.map((letter, index) => (
              <span
                key={index}
                className={cn("inline-block w-3 text-center", train.runsOn.includes(index) ? "text-muted-foreground" : "text-muted-foreground/35")}
              >
                {letter}
              </span>
            ))}
          </span>
          <Link
            href={`/trains/${train.returnTrainNumber}`}
            className="flex items-center gap-1.5 text-[0.75rem] text-muted-foreground transition-colors hover:text-primary"
          >
            <Repeat className="size-3" aria-hidden />
            Return: <span className="tnum">{train.returnTrainNumber}</span>
          </Link>
        </div>
      </header>

      <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat icon={Route} label="Distance" value={`${train.distanceKm} km`} />
        <Stat icon={Timer} label="Duration" value={formatDuration(train.durationMins)} />
        <Stat icon={MapPin} label="Halts" value={`${train.haltCount}`} sub={`of ${train.schedule.length} stops`} />
        <Stat icon={Gauge} label="Avg speed" value={`${train.avgSpeedKmph}`} sub="km/h" />
        <Stat icon={Gauge} label="Fastest leg" value={`${train.maxSpeedKmph}`} sub="km/h" />
      </dl>

      <TrainHeroMap
        trainNumber={train.number}
        schedule={train.schedule}
        stations={stations}
        live={live}
        highlightFrom={from}
        highlightTo={to}
        className="mb-4 aspect-[3/2] w-full sm:aspect-[16/7]"
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="mb-4 gap-0">
        <TabsList variant="line" className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
          {TABS.map((key) => (
            <TabsTrigger
              key={key}
              value={key}
              className="shrink-0 rounded-none border-b-2 border-transparent px-3 py-2 text-[0.8125rem] data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {TAB_LABEL[key]}
            </TabsTrigger>
          ))}
        </TabsList>

        <Card className="mt-4 gap-0 overflow-hidden py-0 shadow-none">
          <CardContent className="min-w-0 p-4">
        <TabsContent value="route" className="mt-0">
          <RailSpine
            schedule={train.schedule}
            stations={stations}
            dateIso={date}
            timeline={liveData?.timeline}
            live={live}
            highlightFrom={from}
            highlightTo={to}
          />
        </TabsContent>

        <TabsContent value="coaches" className="mt-0 space-y-5">
          <div>
            <p className="eyebrow mb-2">Rake order, from the engine</p>
            <CoachStrip
              rake={train.rake}
              selectedCode={selectedCoach}
              onSelect={(coach) => setSelectedCoach(coach.code === selectedCoach ? null : coach.code)}
            />
            <p className="mt-2 text-[0.75rem] text-muted-foreground">
              Tap a coach to see its berths and where it stops on the boarding platform.
            </p>
          </div>

          {coachData ? (
            <PlatformDiagram
              positions={coachData.positions}
              stationName={coachData.boardingStation.name}
              platform={coachData.platform}
              highlightCoach={selectedCoach}
            />
          ) : (
            <SkeletonRows rows={1} />
          )}

          {coachData && selectedLayout && (
            <div>
              <p className="eyebrow mb-2">Berths in {selectedLayout.code}</p>
              <BerthMap
                coach={selectedLayout}
                selections={[]}
                onToggle={() => undefined}
                passengerCount={1}
                selectable={false}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="crossings" className="mt-0">
          {data.crossingsAvailable === false ? (
            <Unavailable
              title="Not available for live timetables"
              body="Working out which trains you cross means reading the timetable of every other train on the line. Against a live API that is one request per train, which the sandbox quota can't carry. It works on the generated timetable — try 12951 or 16511."
            />
          ) : (
            <div>
              <p className="mb-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                Other trains on this line that you pass, overtake, or get overtaken by.
              </p>
              <CrossingsList crossings={crossings} stations={stations} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="punctuality" className="mt-0">
          {data.punctualityAvailable === false ? (
            <Unavailable
              title="Not available for live timetables"
              body="This needs the running history of the last 30 journeys — one request each. It works on the generated timetable, where the history is computed rather than fetched."
            />
          ) : (
            <PunctualitySparkline history={punctuality} />
          )}
        </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted p-3.5">
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="text-[0.875rem] text-foreground">{title}</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Route;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <dt className="mb-1 flex items-center gap-1.5 text-[0.625rem] uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        {label}
      </dt>
      <dd className="tnum text-[0.9375rem] text-foreground">
        {value}
        {sub && <span className="ml-1 text-[0.6875rem] text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
}
