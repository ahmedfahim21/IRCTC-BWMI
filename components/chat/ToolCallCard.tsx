"use client";

import { useEffect, useState } from "react";
import {
  Armchair,
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Highlighter,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Radio,
  Search,
  SlidersHorizontal,
  Ticket,
  TrainFront,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/components/ui/cn";
import {
  headerSummary,
  inputRows,
  stationMatches,
  statusLabel,
  toolResultText,
  toolStatus,
  type ToolStatus,
} from "./toolCallDisplay";

const TOOL_ICONS: Record<string, LucideIcon> = {
  lookup_station: MapPin,
  search_trains: TrainFront,
  get_train: TrainFront,
  get_live_status: Radio,
  get_availability_calendar: Calendar,
  get_coach_position: TrainFront,
  list_running_trains: TrainFront,
  get_pnr: Ticket,
  list_bookings: Ticket,
  start_booking: Ticket,
  confirm_booking: Check,
  suggest_alternatives: ArrowRight,
  navigate: Navigation,
  set_search: Search,
  open_train: TrainFront,
  select_class: TrainFront,
  select_berth: Armchair,
  set_passengers: Users,
  set_contact: Phone,
  set_options: SlidersHorizontal,
  confirm: Check,
  highlight: Highlighter,
};

function iconFor(name: string): LucideIcon {
  return TOOL_ICONS[name] ?? Search;
}

export function ToolCallCard({
  name,
  state,
  input,
  output,
  errorText,
}: {
  name: string;
  state: string;
  input: Record<string, unknown> | null;
  output: unknown;
  errorText?: string;
}) {
  const status = toolStatus({ state, output });
  const [open, setOpen] = useState(status !== "done");
  const Icon = iconFor(name);
  const label = name.replaceAll("_", " ");
  const summary = headerSummary(input);
  const stations = stationMatches(output);
  const resultText = toolResultText(output);
  const rows = inputRows(input);
  const failureText = errorText ?? (status === "failed" ? resultText : null);
  const hasBody = rows.length > 0 || stations.length > 0 || Boolean(resultText) || Boolean(failureText);

  useEffect(() => {
    if (status === "done") setOpen(false);
    if (status === "failed") setOpen(true);
  }, [status]);

  return (
    <Collapsible open={hasBody ? open : false} onOpenChange={setOpen}>
      <div
        data-testid="chat-tool"
        className={cn(
          "overflow-hidden rounded-lg border",
          status === "failed" ? "border-danger/40" : "border-border"
        )}
      >
        <Header
          collapsible={hasBody}
          icon={Icon}
          label={label}
          status={status}
          summary={summary}
          stations={stations}
          open={open}
        />
        {hasBody && (
          <CollapsibleContent>
            <div className="space-y-2 border-t border-border px-2.5 py-2">
              {rows.length > 0 && stations.length === 0 && (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[0.6875rem]">
                  {rows.map((row) => (
                    <div key={row.key} className="contents">
                      <dt className="text-faint">{row.key}</dt>
                      <dd className="min-w-0 truncate text-right text-dim">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {stations.length > 0 && (
                <ul className="space-y-1">
                  {stations.map((station) => (
                    <li key={station.code} className="flex items-baseline gap-2">
                      <span className="tnum w-11 shrink-0 text-[0.75rem] text-brand">{station.code}</span>
                      <span className="min-w-0 truncate text-[0.75rem] text-dim">{station.name}</span>
                    </li>
                  ))}
                </ul>
              )}
              {failureText && <p className="text-[0.6875rem] leading-snug text-danger">{failureText}</p>}
              {!failureText && resultText && stations.length === 0 && (
                <p className="whitespace-pre-wrap text-[0.6875rem] leading-snug text-dim">{resultText}</p>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

function Header({
  collapsible,
  icon: Icon,
  label,
  status,
  summary,
  stations,
  open,
}: {
  collapsible: boolean;
  icon: LucideIcon;
  label: string;
  status: ToolStatus;
  summary: string;
  stations: Array<{ code: string; name: string }>;
  open: boolean;
}) {
  const tone = status === "failed" ? "text-danger" : status === "done" ? "text-ok" : "text-faint";
  const inner = (
    <>
      <Icon
        className={cn("size-3.5 shrink-0", status === "failed" ? "text-danger" : "text-brand")}
        aria-hidden
      />
      <span className="shrink-0 text-[0.75rem] text-text">{label}</span>
      <span className="min-w-0 flex-1">
        {stations.length === 1 && status === "done" ? (
          <span className="block truncate text-[0.6875rem] text-dim">
            <span className="tnum text-brand">{stations[0].code}</span>
            <span className="text-faint"> {stations[0].name}</span>
          </span>
        ) : stations.length > 0 && status === "done" ? (
          <span className="flex flex-wrap gap-1">
            {stations.slice(0, 4).map((station) => (
              <span
                key={station.code}
                className="tnum rounded bg-surface-2 px-1.5 py-0.5 text-[0.625rem] text-dim"
              >
                {station.code}
              </span>
            ))}
            {stations.length > 4 && (
              <span className="self-center text-[0.625rem] text-faint">+{stations.length - 4}</span>
            )}
          </span>
        ) : summary ? (
          <span className="block truncate text-[0.6875rem] text-dim">{summary}</span>
        ) : null}
      </span>
      <span className={cn("flex shrink-0 items-center gap-1 text-[0.625rem] tracking-wide", tone)}>
        {status === "calling" && <Loader2 className="size-3 animate-spin" aria-hidden />}
        {statusLabel(status)}
      </span>
      {collapsible && (
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-faint transition-transform", open && "rotate-180")}
          aria-hidden
        />
      )}
    </>
  );

  const classes =
    "flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-surface-2/80";

  if (!collapsible) {
    return <div className={classes}>{inner}</div>;
  }

  return (
    <CollapsibleTrigger className={classes} aria-label={`${label}, ${statusLabel(status)}`}>
      {inner}
    </CollapsibleTrigger>
  );
}
