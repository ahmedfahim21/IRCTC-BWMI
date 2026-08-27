import type { NextRequest } from "next/server";
import type { Availability, ClassCode, QuotaCode } from "@/lib/types";
import { resolveStationGroup, searchJourneys, bestAvailability, isConfirmable } from "@/lib/domain/search";
import { addDays, todayIso } from "@/lib/domain/time";
import { handler, json, badRequest } from "@/lib/api/http";

export interface RouteDay {
  date: string;
  /** Best state across every train running that day. */
  state: Availability["state"] | "none";
  label: string;
  trainCount: number;
  confirmableCount: number;
  cheapestFare: number | null;
}

/**
 * Availability for a whole route, day by day. This is what lets the date picker
 * show a dead date *before* you search it instead of after — you should never
 * burn a search on a day nothing runs.
 */
export const GET = handler(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  if (!from || !to) return badRequest("from and to are required");

  const date = params.get("date") ?? todayIso();
  const quota = (params.get("quota") ?? "GN") as QuotaCode;
  const classes = params.get("classes")?.split(",").filter(Boolean) as ClassCode[] | undefined;
  const today = params.get("today") ?? todayIso();
  const span = Math.min(30, Math.max(3, Number(params.get("span") ?? 10)));

  const fromCodes = resolveStationGroup(from);
  const toCodes = resolveStationGroup(to);
  if (fromCodes.length === 0 || toCodes.length === 0) return badRequest("Unknown station");

  const start = date < today ? today : date;
  const days: RouteDay[] = [];

  for (let offset = 0; offset < span; offset++) {
    const dateIso = addDays(start, offset);
    const journeys = fromCodes.flatMap((fromCode) =>
      toCodes.flatMap((toCode) => searchJourneys({ fromCode, toCode, dateIso, quota, today, classes }))
    );
    const running = journeys.filter((j) => j.runsToday);
    const all = running.flatMap((j) => j.availability);
    const best = bestAvailability(all);
    const confirmable = running.filter((j) => j.availability.some(isConfirmable));
    const fares = all.filter((a) => isConfirmable(a)).map((a) => a.fare.total);

    days.push({
      date: dateIso,
      state: best && running.length > 0 ? best.state : "none",
      label: running.length === 0 ? "No trains" : (best?.label ?? "—"),
      trainCount: running.length,
      confirmableCount: confirmable.length,
      cheapestFare: fares.length ? Math.min(...fares) : null,
    });
  }

  return json({ from, to, quota, days });
});
