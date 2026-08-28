import type { NextRequest } from "next/server";
import { liveMapSnapshot, TRAIN_TYPES, uniquePackedTrains, type PackedTrain } from "@/lib/railradar/liveMap";
import { getWorld } from "@/lib/mock/seed";
import { getLiveStatus } from "@/lib/mock/live";
import { todayIso } from "@/lib/domain/time";
import { handler, json } from "@/lib/api/http";

/**
 * Every train running right now, as points on a map.
 *
 * The payload is packed tuples rather than objects, and can be clipped to a
 * bounding box, because this is the heaviest response in the app and it is
 * meant to work on a phone on a bad connection.
 */
export const GET = handler(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const bbox = params.get("bbox");
  const limit = Math.min(4000, Number(params.get("limit") ?? 4000));

  const snapshot = await liveMapSnapshot();
  if (snapshot) {
    let trains = uniquePackedTrains(snapshot.trains);
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
      if ([minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
        trains = trains.filter(([, , lat, lng]) => lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng);
      }
    }
    return json({
      source: "live",
      types: TRAIN_TYPES,
      updatedAt: snapshot.updatedAt,
      total: snapshot.total,
      shown: Math.min(trains.length, limit),
      trains: trains.slice(0, limit),
    });
  }

  // Generated fallback: place every train in our world that is running now.
  const world = getWorld();
  const now = new Date();
  const today = todayIso(now);
  const trains: PackedTrain[] = [];

  for (const train of world.trainList) {
    for (const dateIso of [today, new Date(now.getTime() - 86400_000).toISOString().slice(0, 10)]) {
      if (!train.runsOn.includes(new Date(`${dateIso}T00:00:00Z`).getUTCDay())) continue;
      const live = getLiveStatus(train, dateIso, world.stations, now);
      if (live.state !== "running" && live.state !== "halted") continue;
      const next = live.nextStopCode ? world.stations.get(live.nextStopCode) : null;
      trains.push([
        train.number,
        train.name,
        Math.round(live.position.lat * 1000) / 1000,
        Math.round(live.position.lng * 1000) / 1000,
        typeToIndex(train.type),
        Math.round((next?.lat ?? live.position.lat) * 1000) / 1000,
        Math.round((next?.lng ?? live.position.lng) * 1000) / 1000,
      ]);
      break;
    }
  }

  const unique = uniquePackedTrains(trains);
  const total = unique.length;
  let clipped = unique;
  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(",").map(Number);
    if ([minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
      clipped = unique.filter(([, , lat, lng]) => lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng);
    }
  }

  return json({
    source: "generated",
    types: TRAIN_TYPES,
    updatedAt: now.toISOString(),
    total,
    shown: Math.min(clipped.length, limit),
    trains: clipped.slice(0, limit),
  });
});

function typeToIndex(type: string): number {
  const order = ["rajdhani", "shatabdi", "vandeBharat", "duronto", "superfast", "express", "passenger"];
  const index = order.indexOf(type);
  return index >= 0 ? index : 8;
}
