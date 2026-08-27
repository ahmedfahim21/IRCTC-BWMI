import type { ClassCode, QuotaCode } from "@/lib/types";
import { getWorld } from "@/lib/mock/seed";
import { getAvailabilityMatrix, getAvailability } from "@/lib/mock/availability";
import { searchJourneys, resolveStationGroup, isConfirmable } from "@/lib/domain/search";
import { buildAlternatives } from "@/lib/domain/alternatives";
import { coachPositions } from "@/lib/domain/platform";
import { getLiveStatus } from "@/lib/mock/live";
import { addDays, formatDuration, formatMinute, todayIso } from "@/lib/domain/time";
import { liveTrain, liveStatus, liveTrainsBetween, liveSeatCalendar, liveStationSearch, isLive } from "@/lib/railradar/source";
import { liveMapSnapshot } from "@/lib/railradar/liveMap";
import { synthesizeTrain } from "@/lib/railradar/synthesize";
import { createDraft, patchDraft, confirmDraft, getBooking, listBookings } from "@/lib/mock/bookings";
import { explainStatus } from "@/lib/glossary";
import { findStop } from "@/lib/railradar/stations";

/**
 * The platform's capabilities, exposed as MCP tools so an agent can do the same
 * things a person can — find a train, read availability, track a running
 * service, hold and confirm a booking.
 *
 * Each tool returns text an agent can act on rather than raw JSON dumps, plus a
 * structured payload for anything that needs parsing.
 */

export interface ToolResult {
  text: string;
  data?: unknown;
}

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /*
   * Arguments arrive as untyped JSON over JSON-RPC and are checked against
   * `inputSchema` by the transport before dispatch. This is the one place where
   * untyped input meets typed code, so each tool annotates the shape it expects
   * and the boundary is deliberately loose here rather than at twelve call sites.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (args: any) => Promise<ToolResult>;
}

const str = (description: string, extra: Record<string, unknown> = {}) => ({ type: "string", description, ...extra });
const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const fmtDate = (d: string) => d;

async function resolveOne(query: string): Promise<{ code: string; name: string } | null> {
  const world = getWorld();
  const upper = query.trim().toUpperCase();
  if (world.stations.has(upper)) {
    const s = world.stations.get(upper)!;
    return { code: s.code, name: s.name };
  }
  const live = await liveStationSearch(query, 3).catch(() => null);
  if (live?.length) return { code: live[0].code, name: live[0].name };

  const lower = query.trim().toLowerCase();
  const match = world.stationList
    .filter((s) => s.city.toLowerCase().includes(lower) || s.name.toLowerCase().includes(lower))
    .sort((a, b) => b.platformCount - a.platformCount)[0];
  return match ? { code: match.code, name: match.name } : null;
}

export const TOOLS: McpTool[] = [
  {
    name: "lookup_station",
    title: "Look up a station",
    description:
      "Find Indian Railways station codes by name, city or code. Use this first when the user names a place rather than a code.",
    inputSchema: object({ query: str("Station name, city or code, e.g. 'Kacheguda' or 'NDLS'") }, ["query"]),
    run: async ({ query }: { query: string }) => {
      const live = await liveStationSearch(query, 8).catch(() => null);
      const world = getWorld();
      const results =
        live?.length
          ? live
          : world.stationList
              .filter(
                (s) =>
                  s.code.toLowerCase().startsWith(query.toLowerCase()) ||
                  s.name.toLowerCase().includes(query.toLowerCase()) ||
                  s.city.toLowerCase().includes(query.toLowerCase())
              )
              .sort((a, b) => b.platformCount - a.platformCount)
              .slice(0, 8);

      if (results.length === 0) return { text: `No station matches "${query}".` };
      return {
        text: results.map((s) => `${s.code} — ${s.name}${s.city && s.city !== s.name ? ` (${s.city})` : ""}`).join("\n"),
        data: results.map((s) => ({ code: s.code, name: s.name, city: s.city })),
      };
    },
  },

  {
    name: "search_trains",
    title: "Search trains between two stations",
    description:
      "Every train on a route for a date, with each class's availability, fare and confirmation odds already resolved. Station codes preferred; names are resolved automatically.",
    inputSchema: object(
      {
        from: str("Origin station code or name"),
        to: str("Destination station code or name"),
        date: str("Journey date, YYYY-MM-DD. Defaults to today."),
        quota: str("Quota code", { enum: ["GN", "TQ", "PT", "LD", "SS"], default: "GN" }),
      },
      ["from", "to"]
    ),
    run: async ({ from, to, date, quota }: { from: string; to: string; date?: string; quota?: QuotaCode }) => {
      const today = todayIso();
      const journeyDate = date ?? today;
      const [origin, destination] = await Promise.all([resolveOne(from), resolveOne(to)]);
      if (!origin) return { text: `Couldn't find a station matching "${from}".` };
      if (!destination) return { text: `Couldn't find a station matching "${to}".` };

      const upstream = await liveTrainsBetween(origin.code, destination.code, journeyDate).catch(() => null);
      const rows: string[] = [];
      const data: unknown[] = [];

      if (upstream?.answered) {
        if (upstream.journeys.length === 0) {
          return { text: `No direct train runs ${origin.name} → ${destination.name}. A change of train would be needed.` };
        }
        for (const journey of upstream.journeys) {
          const train = synthesizeTrain(journey);
          const availability = getAvailabilityMatrix(train, journeyDate, journey.fromCode, journey.toCode, quota ?? "GN", today);
          rows.push(
            `${train.number} ${train.name} — dep ${formatMinute(journey.departureMinute)}, arr ${formatMinute(journey.arrivalMinute)} (${formatDuration(journey.durationMins)}, ${journey.distanceKm} km)\n` +
              availability.map((a) => `    ${a.classCode.padEnd(3)} ${a.label.padEnd(12)} ₹${a.fare.total}  ${explainStatus(a.label)}`).join("\n")
          );
          data.push({ trainNumber: train.number, trainName: train.name, departureMinute: journey.departureMinute, arrivalMinute: journey.arrivalMinute, availability });
        }
      } else {
        const fromCodes = resolveStationGroup(origin.code);
        const toCodes = resolveStationGroup(destination.code);
        if (!fromCodes.length || !toCodes.length) return { text: `No timetable data for ${origin.code} → ${destination.code}.` };
        const journeys = searchJourneys({ fromCode: fromCodes[0], toCode: toCodes[0], dateIso: journeyDate, quota: quota ?? "GN", today });
        if (journeys.length === 0) return { text: `No direct train runs ${origin.name} → ${destination.name}.` };
        for (const journey of journeys) {
          rows.push(
            `${journey.train.number} ${journey.train.name} — dep ${formatMinute(journey.departureMinute)}, arr ${formatMinute(journey.arrivalMinute)} (${formatDuration(journey.durationMins)}, ${journey.distanceKm} km)\n` +
              journey.availability.map((a) => `    ${a.classCode.padEnd(3)} ${a.label.padEnd(12)} ₹${a.fare.total}  ${explainStatus(a.label)}`).join("\n")
          );
          data.push({ trainNumber: journey.train.number, trainName: journey.train.name, availability: journey.availability });
        }
      }

      return {
        text: `${origin.name} → ${destination.name} on ${fmtDate(journeyDate)} — ${rows.length} train(s):\n\n${rows.join("\n\n")}`,
        data,
      };
    },
  },

  {
    name: "get_train",
    title: "Get a train's timetable",
    description: "Full stop-by-stop schedule for a train, including stations it passes without stopping, plus its rake formation.",
    inputSchema: object({ trainNumber: str("Five-digit train number, e.g. 12951") }, ["trainNumber"]),
    run: async ({ trainNumber }: { trainNumber: string }) => {
      const upstream = await liveTrain(trainNumber).catch(() => null);
      const world = getWorld();
      const source = upstream?.train ?? world.trains.get(trainNumber);
      const stations = upstream?.stations ?? Object.fromEntries(world.stations);
      if (!source) return { text: `No train ${trainNumber}.` };

      const halts = source.schedule.filter((s) => s.isHalt);
      const lines = halts.map(
        (s) =>
          `  ${(stations[s.stationCode]?.name ?? s.stationCode).padEnd(28)} ${s.arrivalMinute !== null ? formatMinute(s.arrivalMinute) : "  —  "} / ${s.departureMinute !== null ? formatMinute(s.departureMinute) : "  —  "}  ${String(s.distanceKm).padStart(5)} km${s.platform ? `  PF ${s.platform}` : ""}`
      );

      return {
        text:
          `${source.number} ${source.name} (${source.type})\n` +
          `${source.distanceKm} km · ${formatDuration(source.durationMins)} · ${halts.length} halts of ${source.schedule.length} stops · avg ${source.avgSpeedKmph} km/h\n` +
          `Classes: ${source.classes.join(", ")}\nRake: ${source.rake.map((c) => c.code).join("-")}\n\nHalts (arrival / departure):\n${lines.join("\n")}`,
        data: { train: source },
      };
    },
  },

  {
    name: "get_live_status",
    title: "Where a train is right now",
    description: "Live running position, delay, last station and next stop for a train on a given day.",
    inputSchema: object(
      { trainNumber: str("Five-digit train number"), date: str("Journey start date, YYYY-MM-DD. Defaults to today.") },
      ["trainNumber"]
    ),
    run: async ({ trainNumber, date }: { trainNumber: string; date?: string }) => {
      const journeyDate = date ?? todayIso();
      const upstream = await liveTrain(trainNumber).catch(() => null);

      if (upstream) {
        const result = await liveStatus(trainNumber, journeyDate, upstream.stations).catch(() => null);
        if (result) {
          const { live } = result;
          const last = live.lastStationCode ? upstream.stations[live.lastStationCode]?.name : null;
          const next = live.nextStopCode ? upstream.stations[live.nextStopCode]?.name : null;
          return {
            text:
              `${trainNumber} ${upstream.train.name} on ${journeyDate}: ${live.state}` +
              `${last ? `, last reported at ${last}` : ""}${next ? `, next stop ${next}` : ""}` +
              `, running ${live.delayMins} minute(s) late, ${Math.round(live.distanceCoveredKm)} km covered.`,
            data: live,
          };
        }
      }

      const world = getWorld();
      const train = world.trains.get(trainNumber);
      if (!train) return { text: `No train ${trainNumber}.` };
      const live = getLiveStatus(train, journeyDate, world.stations, new Date());
      return {
        text: `${trainNumber} ${train.name} on ${journeyDate}: ${live.state}, ${live.delayMins} minute(s) late, ${live.distanceCoveredKm} km covered.`,
        data: live,
      };
    },
  },

  {
    name: "get_availability_calendar",
    title: "Availability across a fortnight",
    description: "Seat availability for one class on a route, day by day, so you can find a date that will actually confirm.",
    inputSchema: object(
      {
        trainNumber: str("Five-digit train number"),
        from: str("Boarding station code"),
        to: str("Alighting station code"),
        classCode: str("Class code, e.g. SL, 3A, 2A, 1A"),
        date: str("First date to check, YYYY-MM-DD. Defaults to today."),
        quota: str("Quota code", { enum: ["GN", "TQ", "PT", "LD", "SS"], default: "GN" }),
      },
      ["trainNumber", "from", "to", "classCode"]
    ),
    run: async ({ trainNumber, from, to, classCode, date, quota }: { trainNumber: string; from: string; to: string; classCode: ClassCode; date?: string; quota?: QuotaCode }) => {
      const today = todayIso();
      const start = date ?? today;
      const upstream = await liveTrain(trainNumber).catch(() => null);

      if (upstream) {
        const fromStop = findStop(upstream.train.schedule, from);
        const toStop = findStop(upstream.train.schedule, to);
        const distanceKm = (toStop?.distanceKm ?? upstream.train.distanceKm) - (fromStop?.distanceKm ?? 0);
        const calendar = await liveSeatCalendar(upstream.train, classCode, quota ?? "GN", from, to, start, distanceKm).catch(() => null);
        if (calendar?.length) {
          return {
            text: `${trainNumber} ${classCode} ${from}→${to}:\n${calendar.map((d) => `  ${d.date}  ${d.label.padEnd(14)} ₹${d.fare.total}`).join("\n")}`,
            data: calendar,
          };
        }
      }

      const world = getWorld();
      const train = world.trains.get(trainNumber);
      if (!train) return { text: `No train ${trainNumber}.` };
      const days = Array.from({ length: 14 }, (_, i) => addDays(start, i)).map((dateIso) =>
        getAvailability({ train, dateIso, classCode, quota: quota ?? "GN", fromCode: from, toCode: to, today })
      );
      return {
        text: `${trainNumber} ${classCode} ${from}→${to}:\n${days.map((d) => `  ${d.date}  ${d.label.padEnd(14)} ₹${d.fare.total}`).join("\n")}`,
        data: days,
      };
    },
  },

  {
    name: "get_coach_position",
    title: "Where a coach stops on the platform",
    description: "Which part of the platform a given coach comes to rest at, relative to the foot-over-bridge.",
    inputSchema: object(
      { trainNumber: str("Five-digit train number"), stationCode: str("Station code where you're boarding") },
      ["trainNumber", "stationCode"]
    ),
    run: async ({ trainNumber, stationCode }: { trainNumber: string; stationCode: string }) => {
      const upstream = await liveTrain(trainNumber).catch(() => null);
      const world = getWorld();
      const train = upstream?.train ?? world.trains.get(trainNumber);
      const station = upstream?.stations[stationCode] ?? world.stations.get(stationCode);
      if (!train) return { text: `No train ${trainNumber}.` };
      if (!station) return { text: `No station ${stationCode}.` };

      const stop = findStop(train.schedule, stationCode);
      if (!stop) return { text: `${trainNumber} does not stop at ${stationCode}.` };

      const positions = coachPositions(train, station, stop.platform);
      return {
        text:
          `${trainNumber} at ${station.name}${stop.platform ? `, platform ${stop.platform}` : ""}:\n` +
          positions.filter((p) => p.coach.type !== "ENG").map((p) => `  ${p.hint}`).join("\n"),
        data: positions,
      };
    },
  },

  {
    name: "list_running_trains",
    title: "How many trains are moving right now",
    description: "A live count of every train currently running across the network, broken down by type.",
    inputSchema: object({}),
    run: async () => {
      const snapshot = await liveMapSnapshot().catch(() => null);
      if (!snapshot) return { text: "The live network snapshot is only available when a RailRadar key is configured." };
      const byType = new Map<number, number>();
      for (const t of snapshot.trains) byType.set(t[4], (byType.get(t[4]) ?? 0) + 1);
      const { TRAIN_TYPES } = await import("@/lib/railradar/liveMap");
      return {
        text:
          `${snapshot.total} trains are running right now.\n` +
          [...byType.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => `  ${TRAIN_TYPES[type]}: ${count}`).join("\n"),
        data: { total: snapshot.total, updatedAt: snapshot.updatedAt },
      };
    },
  },

  {
    name: "get_pnr",
    title: "Look up a booking by PNR",
    description: "Passenger list, berth allotment, chart status and live running for a ten-digit PNR.",
    inputSchema: object({ pnr: str("Ten-digit PNR") }, ["pnr"]),
    run: async ({ pnr }: { pnr: string }) => {
      const booking = getBooking(pnr);
      if (!booking) return { text: `No booking with PNR ${pnr}. Bookings made through this platform are held in memory.` };
      return {
        text:
          `PNR ${booking.pnr} — ${booking.trainNumber} ${booking.trainName}, ${booking.journeyDate}\n` +
          `${booking.fromCode} → ${booking.toCode}, class ${booking.classCode}, status ${booking.status}, chart ${booking.chartStatus}\n` +
          booking.passengers.map((p) => `  ${p.name} (${p.age}) — ${p.statusLabel} · ${explainStatus(p.statusLabel)}`).join("\n") +
          `\nTotal paid ₹${booking.fareBreakdown.total}`,
        data: booking,
      };
    },
  },

  {
    name: "list_bookings",
    title: "List bookings on this device",
    description: "Every booking held by this server, past and upcoming.",
    inputSchema: object({}),
    run: async () => {
      const bookings = listBookings();
      if (bookings.length === 0) return { text: "No bookings yet." };
      return {
        text: bookings
          .map((b) => `${b.pnr}  ${b.journeyDate}  ${b.trainNumber} ${b.fromCode}→${b.toCode}  ${b.classCode}  ${b.status}`)
          .join("\n"),
        data: bookings,
      };
    },
  },

  {
    name: "start_booking",
    title: "Hold a booking",
    description:
      "Open a booking draft and hold it. Add passengers, then call confirm_booking. Payment is simulated — no money moves.",
    inputSchema: object(
      {
        trainNumber: str("Five-digit train number"),
        journeyDate: str("Journey date, YYYY-MM-DD"),
        fromCode: str("Boarding station code"),
        toCode: str("Alighting station code"),
        classCode: str("Class code, e.g. SL, 3A, 2A"),
        quota: str("Quota code", { enum: ["GN", "TQ", "PT", "LD", "SS"], default: "GN" }),
        passengers: {
          type: "array",
          description: "Passengers to travel, up to six",
          items: object(
            {
              name: str("Full name as on ID"),
              age: { type: "integer", description: "Age in years" },
              gender: str("Gender", { enum: ["male", "female", "other"] }),
            },
            ["name", "age", "gender"]
          ),
        },
      },
      ["trainNumber", "journeyDate", "fromCode", "toCode", "classCode", "passengers"]
    ),
    run: async (args: {
      trainNumber: string;
      journeyDate: string;
      fromCode: string;
      toCode: string;
      classCode: ClassCode;
      quota?: QuotaCode;
      passengers: Array<{ name: string; age: number; gender: "male" | "female" | "other" }>;
    }) => {
      const draft = createDraft({
        trainNumber: args.trainNumber,
        journeyDate: args.journeyDate,
        fromCode: args.fromCode,
        toCode: args.toCode,
        classCode: args.classCode,
        quota: args.quota ?? "GN",
      });

      patchDraft(draft.draftId, {
        passengers: args.passengers.map((p, i) => ({
          id: `mcp_${draft.draftId}_${i}`,
          name: p.name,
          age: p.age,
          gender: p.gender,
          berthPreference: null,
          allocatedCoach: null,
          allocatedBerth: null,
          allocatedBerthType: null,
          status: "confirmed" as const,
          statusLabel: "",
        })),
      });

      return {
        text: `Draft ${draft.draftId} held until ${new Date(draft.holdExpiresAt).toLocaleTimeString("en-IN")}. ${args.passengers.length} passenger(s) on ${args.trainNumber} ${args.fromCode}→${args.toCode}, ${args.classCode}. Call confirm_booking with this draft id to issue the PNR.`,
        data: { draftId: draft.draftId, holdExpiresAt: draft.holdExpiresAt },
      };
    },
  },

  {
    name: "confirm_booking",
    title: "Confirm a held booking",
    description: "Turn a held draft into a PNR with berths allotted. Payment is simulated.",
    inputSchema: object({ draftId: str("Draft id returned by start_booking") }, ["draftId"]),
    run: async ({ draftId }: { draftId: string }) => {
      const booking = confirmDraft(draftId);
      return {
        text:
          `Confirmed. PNR ${booking.pnr} — ${booking.trainNumber} ${booking.trainName} on ${booking.journeyDate}, ${booking.fromCode}→${booking.toCode}.\n` +
          booking.passengers.map((p) => `  ${p.name} — ${p.statusLabel}`).join("\n") +
          `\nTotal ₹${booking.fareBreakdown.total} (simulated payment).`,
        data: booking,
      };
    },
  },

  {
    name: "suggest_alternatives",
    title: "What to do when a journey is full",
    description:
      "When nothing confirms on a date, this returns the options worth trying: other dates, nearby stations, split tickets, connections, and other classes or quotas.",
    inputSchema: object(
      {
        from: str("Origin station code"),
        to: str("Destination station code"),
        date: str("Journey date, YYYY-MM-DD"),
        classCode: str("Class you wanted, e.g. SL"),
        quota: str("Quota code", { enum: ["GN", "TQ", "PT", "LD", "SS"], default: "GN" }),
      },
      ["from", "to", "date", "classCode"]
    ),
    run: async ({ from, to, date, classCode, quota }: { from: string; to: string; date: string; classCode: ClassCode; quota?: QuotaCode }) => {
      const today = todayIso();
      const groups = buildAlternatives({ fromCode: from, toCode: to, dateIso: date, classCode, quota: quota ?? "GN", today });
      if (groups.length === 0) {
        return { text: `No alternatives found for ${from}→${to} on ${date}. This is computed from the generated timetable, which covers eleven corridors.` };
      }
      return {
        text: groups
          .map(
            (g) =>
              `${g.title} — ${g.rationale}\n` +
              g.items.map((i) => `  ${i.headline} · ${i.detail} · ${i.availabilityLabel} · ₹${i.fareTotal}${i.tradeoff ? ` · ${i.tradeoff}` : ""}`).join("\n")
          )
          .join("\n\n"),
        data: groups,
      };
    },
  },
];

export function toolByName(name: string): McpTool | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

export const SERVER_INFO = {
  name: "irctc-rail",
  title: "IRCTC — Indian Railways",
  version: "0.1.0",
};

export function serverInstructions(): string {
  return [
    "Indian Railways search, live tracking and booking.",
    "This is an independent redesign concept, not the official IRCTC service, and it cannot issue a real ticket.",
    isLive()
      ? "Timetables, station data, running positions and coach formations are live from the RailRadar API; seat availability, fares and confirmation odds are modelled."
      : "All data is generated — realistic in shape, not live railway data.",
    "Bookings are held on this server and payment is always simulated. No real reservation is made and no money moves.",
    "Prefer station codes. Use lookup_station first when the user gives a place name.",
  ].join(" ");
}
