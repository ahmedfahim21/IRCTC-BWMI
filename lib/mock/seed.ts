import type {
  ClassCode,
  Coach,
  CoachType,
  Corridor,
  ScheduleStop,
  Station,
  Train,
  TrainType,
} from "@/lib/types";
import { rngFor } from "./rng";
import { STATION_TABLE } from "./stations";
import { CORRIDOR_SPECS } from "./corridors";
import { TRAIN_TABLE } from "./trains";
import { BERTH_COUNTS } from "./berths";

/** Average end-to-end speed including halts, by train type. */
const SPEED_PROFILE: Record<TrainType, number> = {
  rajdhani: 85,
  duronto: 82,
  vandeBharat: 88,
  shatabdi: 80,
  superfast: 60,
  express: 48,
  passenger: 32,
};

/** Minimum platform count a station needs before this train type halts there. */
const HALT_TIER: Record<TrainType, number> = {
  rajdhani: 6,
  duronto: 6,
  vandeBharat: 6,
  shatabdi: 5,
  superfast: 5,
  express: 3,
  passenger: 0,
};

/** Corridors with ghat sections or heavy congestion run slower than the profile. */
const CORRIDOR_SPEED_FACTOR: Record<string, number> = {
  "bengaluru-kozhikode": 0.8,
  "mumbai-chennai-pune": 0.92,
  "chennai-trivandrum": 0.95,
  "delhi-katra": 0.9,
};

const TYPICAL_DELAY: Record<TrainType, number> = {
  rajdhani: 14,
  duronto: 16,
  vandeBharat: 8,
  shatabdi: 10,
  superfast: 34,
  express: 52,
  passenger: 28,
};

function parseStations(): Map<string, Station> {
  const map = new Map<string, Station>();
  for (const line of STATION_TABLE.split("\n")) {
    const row = line.trim();
    if (!row || row.startsWith("//")) continue;
    const [code, name, city, stateCode, zone, platforms, lat, lng] = row.split("|");
    map.set(code, {
      code,
      name,
      city,
      stateCode,
      zone,
      platformCount: Number(platforms),
      lat: lat ? Number(lat) : Number.NaN,
      lng: lng ? Number(lng) : Number.NaN,
    });
  }
  return map;
}

function parseCorridors(): Corridor[] {
  return CORRIDOR_SPECS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    stops: spec.stops
      .split(/\s+/)
      .filter(Boolean)
      .map((token) => {
        const [stationCode, distance] = token.split(":");
        return { stationCode, distanceKm: Number(distance) };
      }),
  }));
}

/**
 * Small halts have no authored coordinates. Fill them by interpolating along
 * their corridor between the nearest anchored stations — geographically
 * approximate, but the route traces correctly, which is what the map needs.
 */
function fillCoordinates(stations: Map<string, Station>, corridors: Corridor[]): void {
  for (const corridor of corridors) {
    const anchors = corridor.stops
      .map((stop, index) => ({ index, stop, station: stations.get(stop.stationCode)! }))
      .filter((entry) => Number.isFinite(entry.station.lat));
    if (anchors.length < 2) continue;

    for (let i = 0; i < corridor.stops.length; i++) {
      const stop = corridor.stops[i];
      const station = stations.get(stop.stationCode)!;
      if (Number.isFinite(station.lat)) continue;

      let before = anchors[0];
      let after = anchors[anchors.length - 1];
      for (const anchor of anchors) {
        if (anchor.index <= i) before = anchor;
        if (anchor.index >= i) {
          after = anchor;
          break;
        }
      }
      const span = after.stop.distanceKm - before.stop.distanceKm;
      const t = span === 0 ? 0 : (stop.distanceKm - before.stop.distanceKm) / span;
      station.lat = before.station.lat + (after.station.lat - before.station.lat) * t;
      station.lng = before.station.lng + (after.station.lng - before.station.lng) * t;
    }
  }
  // Anything still unresolved would be a data bug — fail loudly rather than
  // silently placing a station at (0,0) in the Gulf of Guinea.
  for (const station of stations.values()) {
    if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) {
      throw new Error(`Station ${station.code} has no coordinates and is on no corridor`);
    }
  }
}

/** Coach counts per class, by train type. */
function coachCounts(type: TrainType, classes: ClassCode[]): Array<[ClassCode, number]> {
  const table: Partial<Record<TrainType, Partial<Record<ClassCode, number>>>> = {
    rajdhani: { "1A": 1, "2A": 3, "3A": 10 },
    duronto: { "1A": 1, "2A": 3, "3A": 8, SL: 6 },
    vandeBharat: { EC: 2, CC: 12 },
    shatabdi: { EC: 1, CC: 12, "2S": 4 },
    superfast: { "1A": 1, "2A": 2, "3A": 4, SL: 9, CC: 8, "2S": 2 },
    express: { "1A": 1, "2A": 1, "3A": 2, SL: 10, CC: 6, "2S": 3 },
    passenger: { "2S": 8 },
  };
  const forType = table[type] ?? {};
  return classes.map((code) => [code, forType[code] ?? 2]);
}

const COACH_PREFIX: Partial<Record<ClassCode, string>> = {
  "1A": "H",
  "2A": "A",
  "3A": "B",
  "3E": "M",
  SL: "S",
  CC: "C",
  EC: "E",
  "2S": "D",
};

/** Rake order from the loco outward. Roughly how IR actually marshals a rake. */
function buildRake(type: TrainType, classes: ClassCode[], hasPantry: boolean): Coach[] {
  const rake: Coach[] = [];
  let position = 1;
  const push = (code: string, coachType: CoachType) => {
    rake.push({ code, type: coachType, position: position++, berthCount: BERTH_COUNTS[coachType] });
  };

  push("ENG", "ENG");
  push("SLR1", "SLR");
  if (type !== "vandeBharat" && type !== "shatabdi") push("GS1", "GS");

  const order: ClassCode[] = ["2S", "SL", "3E", "3A", "CC", "2A", "EC", "1A"];
  const counts = new Map(coachCounts(type, classes));
  for (const classCode of order) {
    const count = counts.get(classCode);
    if (!count) continue;
    if (classCode === "2A" && hasPantry) push("PC", "PC");
    for (let i = 1; i <= count; i++) {
      push(`${COACH_PREFIX[classCode] ?? "X"}${i}`, classCode as CoachType);
    }
  }
  if (hasPantry && !rake.some((c) => c.type === "PC")) push("PC", "PC");
  if (type !== "vandeBharat" && type !== "shatabdi") push("GS2", "GS");
  push("SLR2", "SLR");
  return rake;
}

function buildSchedule(
  train: {
    number: string;
    type: TrainType;
    corridorId: string;
    direction: "up" | "down";
    fromCode: string;
    toCode: string;
    departureMinute: number;
  },
  corridor: Corridor,
  stations: Map<string, Station>
): ScheduleStop[] {
  const total = corridor.stops[corridor.stops.length - 1].distanceKm;
  const oriented =
    train.direction === "up"
      ? corridor.stops.map((s) => ({ ...s }))
      : [...corridor.stops].reverse().map((s) => ({ ...s, distanceKm: total - s.distanceKm }));

  const startIndex = oriented.findIndex((s) => s.stationCode === train.fromCode);
  const endIndex = oriented.findIndex((s) => s.stationCode === train.toCode);
  const segment = oriented.slice(startIndex, endIndex + 1);
  const originKm = segment[0].distanceKm;

  const tier = HALT_TIER[train.type];
  const rng = rngFor(`schedule:${train.number}`);
  const speedFactor = CORRIDOR_SPEED_FACTOR[train.corridorId] ?? 1;
  // Running speed sits above the end-to-end average, because halts eat the rest.
  const runSpeed = SPEED_PROFILE[train.type] * speedFactor * 1.18;

  const stops: ScheduleStop[] = [];
  let minute = train.departureMinute;
  let previousKm = originKm;

  for (let i = 0; i < segment.length; i++) {
    const entry = segment[i];
    const station = stations.get(entry.stationCode)!;
    const distanceKm = Math.round(entry.distanceKm - originKm);
    const isTerminus = i === 0 || i === segment.length - 1;

    // Halt at anything comfortably above the tier, plus a seeded slice of the
    // tier below — which is what makes two trains on one corridor differ.
    const isHalt =
      isTerminus ||
      station.platformCount >= tier ||
      (station.platformCount >= tier - 1 && rng.bool(0.4));

    if (i > 0) {
      const legKm = entry.distanceKm - previousKm;
      const legMins = Math.max(1, Math.round((legKm / runSpeed) * 60 * rng.gaussian(1, 0.06)));
      minute += legMins;
    }
    previousKm = entry.distanceKm;

    let haltMins = 0;
    if (isHalt && !isTerminus) {
      haltMins =
        station.platformCount >= 8 ? rng.int(8, 12) : station.platformCount >= 6 ? rng.int(4, 6) : rng.int(1, 3);
    }

    const arrivalMinute = i === 0 ? null : minute;
    minute += haltMins;
    const departureMinute = i === segment.length - 1 ? null : minute;

    stops.push({
      stationCode: entry.stationCode,
      arrivalMinute,
      departureMinute,
      dayOffset: Math.floor((arrivalMinute ?? departureMinute ?? 0) / 1440),
      distanceKm,
      isHalt,
      haltMins,
      platform: isHalt ? rngFor(`pf:${train.number}:${entry.stationCode}`).int(1, Math.max(1, station.platformCount)) : null,
    });
  }
  return stops;
}

function parseTrains(corridors: Corridor[], stations: Map<string, Station>): Map<string, Train> {
  const byId = new Map(corridors.map((c) => [c.id, c]));
  const trains = new Map<string, Train>();

  for (const line of TRAIN_TABLE.split("\n")) {
    const row = line.trim();
    if (!row || row.startsWith("//")) continue;
    const [number, name, type, corridorId, direction, fromCode, toCode, depart, runsOnRaw, classesRaw, pantry, returns] =
      row.split("|");

    const [hh, mm] = depart.split(":").map(Number);
    const departureMinute = hh * 60 + mm;
    const corridor = byId.get(corridorId);
    if (!corridor) throw new Error(`Train ${number} references unknown corridor ${corridorId}`);

    const classes = classesRaw.split(",") as ClassCode[];
    const trainType = type as TrainType;
    const schedule = buildSchedule(
      { number, type: trainType, corridorId, direction: direction as "up" | "down", fromCode, toCode, departureMinute },
      corridor,
      stations
    );

    const last = schedule[schedule.length - 1];
    const durationMins = (last.arrivalMinute ?? 0) - departureMinute;
    const distanceKm = last.distanceKm;

    let maxSpeedKmph = 0;
    for (let i = 1; i < schedule.length; i++) {
      const legKm = schedule[i].distanceKm - schedule[i - 1].distanceKm;
      const legMins = (schedule[i].arrivalMinute ?? 0) - (schedule[i - 1].departureMinute ?? 0);
      if (legMins > 0 && legKm > 0) maxSpeedKmph = Math.max(maxSpeedKmph, (legKm / legMins) * 60);
    }

    const delayRng = rngFor(`delay:${number}`);
    trains.set(number, {
      number,
      name,
      type: trainType,
      corridorId,
      direction: direction as "up" | "down",
      runsOn: runsOnRaw === "daily" ? [0, 1, 2, 3, 4, 5, 6] : runsOnRaw.split(",").map(Number),
      classes,
      hasPantry: pantry === "y",
      returnTrainNumber: returns,
      departureMinute,
      schedule,
      rake: buildRake(trainType, classes, pantry === "y"),
      avgDelayMins: Math.max(2, Math.round(delayRng.gaussian(TYPICAL_DELAY[trainType], 12))),
      distanceKm,
      durationMins,
      haltCount: schedule.filter((s) => s.isHalt).length,
      avgSpeedKmph: Math.round((distanceKm / durationMins) * 60 * 10) / 10,
      maxSpeedKmph: Math.round(maxSpeedKmph * 10) / 10,
    });
  }
  return trains;
}

export interface World {
  stations: Map<string, Station>;
  stationList: Station[];
  corridors: Corridor[];
  trains: Map<string, Train>;
  trainList: Train[];
  /** Station code -> train numbers that halt there. */
  trainsByStation: Map<string, string[]>;
  /** City name -> station codes, for "All Delhi stations". */
  stationsByCity: Map<string, string[]>;
}

let cached: World | null = null;

/** The mock world. Built once, memoized — everything downstream is a pure read. */
export function getWorld(): World {
  if (cached) return cached;

  const stations = parseStations();
  const corridors = parseCorridors();
  fillCoordinates(stations, corridors);
  const trains = parseTrains(corridors, stations);

  const trainsByStation = new Map<string, string[]>();
  for (const train of trains.values()) {
    for (const stop of train.schedule) {
      if (!stop.isHalt) continue;
      const list = trainsByStation.get(stop.stationCode) ?? [];
      list.push(train.number);
      trainsByStation.set(stop.stationCode, list);
    }
  }

  const stationsByCity = new Map<string, string[]>();
  for (const station of stations.values()) {
    const list = stationsByCity.get(station.city) ?? [];
    list.push(station.code);
    stationsByCity.set(station.city, list);
  }

  cached = {
    stations,
    stationList: [...stations.values()],
    corridors,
    trains,
    trainList: [...trains.values()],
    trainsByStation,
    stationsByCity,
  };
  return cached;
}
