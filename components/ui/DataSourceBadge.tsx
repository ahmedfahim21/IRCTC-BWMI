"use client";

import * as Popover from "@radix-ui/react-popover";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { cn } from "./cn";

const LABEL: Record<string, string> = {
  stationSearch: "Station search",
  trainSchedule: "Timetables",
  runningStatus: "Running status",
  coachComposition: "Coach composition",
  platformPosition: "Platform position",
  dateStrip: "Date availability strip",
  availabilityMatrix: "Availability matrix",
  confirmationOdds: "Confirmation odds",
  fares: "Fares",
  berthMap: "Berth map",
  bookings: "Bookings",
};

/**
 * Says plainly which parts of the screen are real and which are modelled.
 * Presenting generated numbers as live would be the dishonest option, and the
 * split is real: some of this comes from the RailRadar API, some does not.
 */
export function DataSourceBadge() {
  const { data } = useQuery({
    queryKey: ["status"],
    queryFn: ({ signal }) => api.status(signal),
    staleTime: 5 * 60_000,
  });

  if (!data) return null;
  const liveCount = Object.values(data.sources).filter((v) => v === "live").length;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={
            data.live
              ? `Data sources: ${liveCount} of ${Object.keys(data.sources).length} live. Tap for the breakdown.`
              : "All data is generated. Tap for the breakdown."
          }
          className="flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1.5 text-[0.6875rem] text-dim transition-colors hover:text-text"
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", data.live ? "bg-ok" : "bg-warn")} aria-hidden />
          {/* Never hidden: this is what tells the reader which numbers are real. */}
          <span className="hidden sm:inline">{data.live ? "Part live" : "Demo data"}</span>
          <span className="tnum sm:hidden">
            {data.live ? `${liveCount}/${Object.keys(data.sources).length}` : "demo"}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          collisionPadding={12}
          className="z-50 w-[19rem] rounded-xl border border-border bg-surface p-3.5 shadow-[var(--shadow-lg)]"
        >
          <p className="mb-2 text-[0.8125rem] text-text">
            {data.live ? (
              <>
                <span className="tnum">{liveCount}</span> of {Object.keys(data.sources).length} data sources are live,
                from the RailRadar API.
              </>
            ) : (
              "Everything here is generated. Realistic in shape, not real railway data."
            )}
          </p>

          <dl className="space-y-1 border-t border-border pt-2">
            {Object.entries(data.sources).map(([key, value]) => (
              <div key={key} className="flex items-baseline justify-between gap-3">
                <dt className="text-[0.75rem] text-dim">{LABEL[key] ?? key}</dt>
                <dd className={cn("text-[0.6875rem]", value === "live" ? "text-ok" : "text-faint")}>
                  {value === "live" ? "live" : "modelled"}
                </dd>
              </div>
            ))}
          </dl>

          {data.quota && (
            <p className="mt-2.5 border-t border-border pt-2 text-[0.6875rem] leading-relaxed text-faint">
              <span className="tnum">{data.quota.used}</span> of{" "}
              <span className="tnum">{data.quota.budget}</span> monthly API requests used. Responses are
              cached on disk so repeat views cost nothing.
            </p>
          )}

          <p className="mt-2 text-[0.6875rem] leading-relaxed text-faint">
            Booking is always local — there is no public API for reserving a berth.
          </p>
          <Popover.Arrow className="fill-[var(--border)]" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
