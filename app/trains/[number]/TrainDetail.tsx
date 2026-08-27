"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Gauge, Info, MapPin, Repeat, Route, Timer, Utensils } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatDuration, formatMinute, todayIso } from "@/lib/domain/time";
import { RailSpine } from "@/components/rail/RailSpine";
import { SchematicMap } from "@/components/rail/SchematicMap";
import { CoachStrip, PlatformDiagram } from "@/components/coach/CoachStrip";
import { PunctualitySparkline } from "@/components/rail/PunctualitySparkline";
import { CrossingsList } from "@/components/rail/CrossingsList";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
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

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-5 sm:px-6">
      <header className="mb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="tnum text-[1.0625rem] text-faint">{train.number}</span>
          <h1 className="text-[1.25rem] tracking-[-0.01em] text-text">{train.name}</h1>
          <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[0.6875rem] capitalize text-dim">{train.type}</span>
          {train.hasPantry && (
            <span className="flex items-center gap-1 text-[0.6875rem] text-faint">
              <Utensils className="size-3" aria-hidden /> Pantry
            </span>
          )}
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.875rem] text-dim">
          <span>{stations[first.stationCode]?.name}</span>
          <ArrowRight className="size-3.5 text-faint" aria-hidden />
          <span>{stations[last.stationCode]?.name}</span>
          <span className="tnum text-faint">
            {formatMinute(first.departureMinute)} → {formatMinute(last.arrivalMinute)}
          </span>
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[0.75rem] text-faint" aria-label="Days it runs">
            {DAY_LETTERS.map((letter, index) => (
              <span
                key={index}
                className={cn("inline-block w-3 text-center", train.runsOn.includes(index) ? "text-dim" : "text-faint/35")}
              >
                {letter}
              </span>
            ))}
          </span>
          <Link
            href={`/trains/${train.returnTrainNumber}`}
            className="flex items-center gap-1.5 text-[0.75rem] text-faint transition-colors hover:text-brand"
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

      <SchematicMap
        schedule={train.schedule}
        stations={stations}
        live={live}
        highlightFrom={from}
        highlightTo={to}
        className="mb-4 aspect-[3/2] w-full sm:aspect-[16/7]"
        aspect={3 / 2}
      />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-[0.8125rem] transition-colors",
              tab === key ? "border-brand text-text" : "border-transparent text-faint hover:text-dim"
            )}
          >
            {TAB_LABEL[key]}
          </button>
        ))}
      </div>

      <div className="card min-w-0 overflow-hidden p-4">
        {tab === "route" && (
          <RailSpine
            schedule={train.schedule}
            stations={stations}
            dateIso={date}
            timeline={liveData?.timeline}
            live={live}
            highlightFrom={from}
            highlightTo={to}
          />
        )}

        {tab === "coaches" && (
          <div className="space-y-5">
            <div>
              <p className="eyebrow mb-2">Rake order, from the engine</p>
              <CoachStrip
                rake={train.rake}
                selectedCode={selectedCoach}
                onSelect={(coach) => setSelectedCoach(coach.code === selectedCoach ? null : coach.code)}
              />
              <p className="mt-2 text-[0.75rem] text-faint">
                Tap a coach to see where it stops on the boarding platform.
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
          </div>
        )}

        {tab === "crossings" &&
          (data.crossingsAvailable === false ? (
            <Unavailable
              title="Not available for live timetables"
              body="Working out which trains you cross means reading the timetable of every other train on the line. Against a live API that is one request per train, which the sandbox quota can't carry. It works on the generated timetable — try 12951 or 16511."
            />
          ) : (
            <div>
              <p className="mb-3 text-[0.8125rem] leading-relaxed text-dim">
                Other trains on this line that you pass, overtake, or get overtaken by.
              </p>
              <CrossingsList crossings={crossings} stations={stations} />
            </div>
          ))}

        {tab === "punctuality" &&
          (data.punctualityAvailable === false ? (
            <Unavailable
              title="Not available for live timetables"
              body="This needs the running history of the last 30 journeys — one request each. It works on the generated timetable, where the history is computed rather than fetched."
            />
          ) : (
            <PunctualitySparkline history={punctuality} />
          ))}
      </div>
    </div>
  );
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-2 p-3.5">
      <Info className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
      <div>
        <p className="text-[0.875rem] text-text">{title}</p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-dim">{body}</p>
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
    <div className="card px-3 py-2.5">
      <dt className="mb-1 flex items-center gap-1.5 text-[0.625rem] uppercase tracking-wider text-faint">
        <Icon className="size-3" aria-hidden />
        {label}
      </dt>
      <dd className="tnum text-[0.9375rem] text-text">
        {value}
        {sub && <span className="ml-1 text-[0.6875rem] text-faint">{sub}</span>}
      </dd>
    </div>
  );
}
