import type { ClassCode, ScheduleStop, Train, TrainType } from "@/lib/types";
import { BERTH_COUNTS } from "@/lib/mock/berths";
import { toTrainType } from "./map";
import type { LiveJourney } from "./source";

/**
 * The API gives a real train list for a route, but not each train's rake — and
 * fetching the rake per train would cost one request each, which the sandbox
 * quota cannot carry for a results page.
 *
 * So for the availability matrix we build a standard formation from the train's
 * type and run the same generated availability model over it. The timings,
 * distance and train identity are real; the seat counts are modelled, and the
 * API response says so via `availabilitySource`.
 */
const STANDARD_RAKE: Record<TrainType, Array<[ClassCode, number]>> = {
  rajdhani: [["1A", 1], ["2A", 3], ["3A", 10]],
  duronto: [["2A", 3], ["3A", 8], ["SL", 6]],
  vandeBharat: [["EC", 2], ["CC", 12]],
  shatabdi: [["EC", 1], ["CC", 12]],
  superfast: [["2A", 2], ["3A", 4], ["SL", 9], ["2S", 2]],
  express: [["2A", 1], ["3A", 2], ["SL", 10], ["2S", 3]],
  passenger: [["2S", 8]],
};

const PREFIX: Record<string, string> = { "1A": "H", "2A": "A", "3A": "B", SL: "S", CC: "C", EC: "E", "2S": "D" };

export function synthesizeTrain(journey: LiveJourney): Train {
  const type = toTrainType(journey.trainType);
  const formation = STANDARD_RAKE[type];

  const rake = [
    { code: "ENG", type: "ENG" as const, position: 1, berthCount: 0 },
    ...formation.flatMap(([classCode, count], groupIndex) =>
      Array.from({ length: count }, (_, i) => ({
        code: `${PREFIX[classCode] ?? "X"}${i + 1}`,
        type: classCode as Train["rake"][number]["type"],
        position: 2 + groupIndex * 10 + i,
        berthCount: BERTH_COUNTS[classCode],
      }))
    ),
  ];

  const schedule: ScheduleStop[] = [
    {
      stationCode: journey.fromCode,
      arrivalMinute: null,
      departureMinute: journey.departureMinute,
      dayOffset: Math.floor(journey.departureMinute / 1440),
      distanceKm: 0,
      isHalt: true,
      haltMins: 0,
      platform: null,
    },
    {
      stationCode: journey.toCode,
      arrivalMinute: journey.arrivalMinute,
      departureMinute: null,
      dayOffset: Math.floor(journey.arrivalMinute / 1440),
      distanceKm: journey.distanceKm,
      isHalt: true,
      haltMins: 0,
      platform: null,
    },
  ];

  return {
    number: journey.trainNumber,
    name: journey.trainName,
    type,
    corridorId: "",
    direction: "up",
    runsOn: journey.runsOn,
    classes: formation.map(([classCode]) => classCode),
    hasPantry: type === "rajdhani" || type === "shatabdi" || type === "duronto",
    returnTrainNumber: "",
    departureMinute: journey.departureMinute,
    schedule,
    rake,
    avgDelayMins: type === "rajdhani" ? 14 : type === "superfast" ? 34 : 48,
    distanceKm: journey.distanceKm,
    durationMins: journey.durationMins,
    haltCount: journey.haltsBetween,
    avgSpeedKmph: Math.round((journey.distanceKm / Math.max(1, journey.durationMins)) * 60 * 10) / 10,
    maxSpeedKmph: 0,
  };
}
