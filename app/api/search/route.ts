import type { NextRequest } from "next/server";
import type { ClassCode, QuotaCode, Station } from "@/lib/types";
import { getWorld } from "@/lib/mock/seed";
import { getAvailabilityMatrix } from "@/lib/mock/availability";
import { searchJourneys, resolveStationGroup, isConfirmable } from "@/lib/domain/search";
import { buildAlternatives } from "@/lib/domain/alternatives";
import { todayIso } from "@/lib/domain/time";
import { liveTrainsBetween, isLive } from "@/lib/railradar/source";
import { resolveLiveStationCode } from "@/lib/railradar/stations";
import { synthesizeTrain } from "@/lib/railradar/synthesize";
import { handler, json, badRequest } from "@/lib/api/http";
import { toJourneyDto, toTrainSummary, stationSidecar, type JourneyDto } from "@/lib/api/dto";

/**
 * The results payload: every train, with every class's availability already
 * resolved. No follow-up request per class per train — that per-cell round trip
 * is the single worst thing about booking on IRCTC today.
 *
 * With a RailRadar key the train list, timings and distances are real. Seat
 * counts stay modelled: the seats endpoint is per train *per class*, so one
 * busy route would cost dozens of upstream calls, which the sandbox quota
 * cannot carry. The response labels which is which rather than blurring them.
 */
export const GET = handler(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const date = params.get("date");
  if (!from || !to || !date) return badRequest("from, to and date are required");

  const quota = (params.get("quota") ?? "GN") as QuotaCode;
  const classes = params.get("classes")?.split(",").filter(Boolean) as ClassCode[] | undefined;
  const today = params.get("today") ?? todayIso();

  const world = getWorld();
  const fromCodes = resolveStationGroup(from);
  const toCodes = resolveStationGroup(to);

  // Live first: the API knows the whole network, not just our eleven corridors.
  if (isLive()) {
    const singleFrom = fromCodes[0] ?? (await resolveLiveStationCode(from));
    const singleTo = toCodes[0] ?? (await resolveLiveStationCode(to));
    if (singleFrom && singleTo) {
      const upstream = await liveTrainsBetween(singleFrom, singleTo, date);
      if (upstream?.answered) {
        const journeys: JourneyDto[] = upstream.journeys
          .map((journey) => {
            const train = synthesizeTrain(journey);
            const [fromStop, toStop] = train.schedule;
            return {
              train: toTrainSummary(train),
              fromCode: journey.fromCode,
              toCode: journey.toCode,
              fromPlatform: null,
              toPlatform: null,
              departureMinute: journey.departureMinute,
              arrivalMinute: journey.arrivalMinute,
              durationMins: journey.durationMins,
              distanceKm: journey.distanceKm,
              daySpan: Math.floor(journey.arrivalMinute / 1440) - Math.floor(journey.departureMinute / 1440) + 1,
              runsToday: train.runsOn.includes(new Date(`${date}T00:00:00Z`).getUTCDay()),
              boardAtFraction: 0,
              alightAtFraction: 1,
              availability: getAvailabilityMatrix(train, date, fromStop.stationCode, toStop.stationCode, quota, today),
            };
          })
          .filter((j) => !classes?.length || j.train.classes.some((c) => classes.includes(c)))
          .sort((a, b) => a.departureMinute - b.departureMinute);

        return json({
          source: "live",
          availabilitySource: "generated",
          query: { from, to, date, quota, today, fromCodes: [singleFrom], toCodes: [singleTo] },
          journeys,
          anyConfirmable: journeys.some((j) => j.runsToday && j.availability.some(isConfirmable)),
          alternatives: [],
          /*
           * An empty list here means the railway runs nothing direct between
           * these two stations — a real answer, and a different thing from the
           * station being unrecognised.
           */
          noDirectTrain: journeys.length === 0,
          stations: upstream.stations,
        });
      }
    }
  }

  if (fromCodes.length === 0) return badRequest(`Unknown origin: ${from}`);
  if (toCodes.length === 0) return badRequest(`Unknown destination: ${to}`);

  // A city group means "any of these stations" on either end.
  const seen = new Set<string>();
  const journeys: JourneyDto[] = [];
  for (const fromCode of fromCodes) {
    for (const toCode of toCodes) {
      for (const j of searchJourneys({ fromCode, toCode, dateIso: date, quota, today, classes })) {
        const key = `${j.train.number}:${fromCode}:${toCode}`;
        if (seen.has(key)) continue;
        seen.add(key);
        journeys.push(toJourneyDto(j));
      }
    }
  }
  journeys.sort((a, b) => a.departureMinute - b.departureMinute);

  const anyConfirmable = journeys.some((j) => j.runsToday && j.availability.some(isConfirmable));

  // Only spend the work on alternatives when the asked-for journey is a dead end.
  const preferredClass =
    (classes?.[0] as ClassCode) ??
    (journeys[0]?.train.classes.includes("SL") ? "SL" : journeys[0]?.train.classes[0]) ??
    "SL";

  const alternatives = anyConfirmable
    ? []
    : buildAlternatives({
        fromCode: fromCodes[0],
        toCode: toCodes[0],
        dateIso: date,
        quota,
        classCode: preferredClass,
        today,
      });

  const codes = new Set<string>([...fromCodes, ...toCodes]);
  for (const j of journeys) {
    codes.add(j.fromCode);
    codes.add(j.toCode);
    codes.add(j.train.originCode);
    codes.add(j.train.destinationCode);
  }
  for (const group of alternatives) {
    for (const item of group.items) {
      codes.add(item.fromCode);
      codes.add(item.toCode);
    }
  }

  const stations: Record<string, Station> = stationSidecar(codes, world.stations);
  return json({
    source: "generated",
    availabilitySource: "generated",
    query: { from, to, date, quota, today, fromCodes, toCodes },
    journeys,
    anyConfirmable,
    alternatives,
    stations,
  });
});
