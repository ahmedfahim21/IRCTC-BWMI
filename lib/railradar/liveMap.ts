import { callRailRadar, isLive } from "./client";
import { titleCase } from "./map";
import { TRAIN_TYPES } from "./trainTypes";

export { TRAIN_TYPES };

/** One running train, as the snapshot feed reports it. */
interface RrLiveMapTrain {
  train_number: string;
  train_name: string;
  type: string;
  mins_since_dep: number;
  current_station: string;
  current_station_name: string;
  current_lat: number;
  current_lng: number;
  next_station?: string;
  next_station_name?: string;
  next_lat?: number;
  next_lng?: number;
  next_arrival_minutes?: number;
  curr_distance?: number;
  next_distance?: number;
}

function typeIndex(type: string, name: string): number {
  const haystack = `${type} ${name}`.toLowerCase();
  if (haystack.includes("rajdhani")) return 0;
  if (haystack.includes("shatabdi")) return 1;
  if (haystack.includes("vande")) return 2;
  if (haystack.includes("duronto")) return 3;
  if (haystack.includes("superfast")) return 4;
  if (haystack.includes("special")) return 7;
  if (haystack.includes("passenger") || haystack.includes("memu") || haystack.includes("demu")) return 6;
  if (haystack.includes("express") || haystack.includes("mail")) return 5;
  return 8;
}

/**
 * Packed tuple: [number, name, lat, lng, typeIndex, headingLat, headingLng].
 * Roughly a fifth the size of the object form, which matters at 2,800 entries.
 */
export type PackedTrain = [string, string, number, number, number, number, number];

export interface LiveMapSnapshot {
  updatedAt: string;
  total: number;
  trains: PackedTrain[];
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export async function liveMapSnapshot(): Promise<LiveMapSnapshot | null> {
  if (!isLive()) return null;
  const data = await callRailRadar<RrLiveMapTrain[]>("/legacy/trains/live-map", {}, 60_000);
  if (!data) return null;

  const trains: PackedTrain[] = [];
  for (const train of data) {
    const lat = train.current_lat;
    const lng = train.current_lng;
    // Drop anything without a usable fix rather than parking it at (0,0).
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < 6 || lat > 37 || lng < 68 || lng > 98) continue;

    trains.push([
      train.train_number,
      titleCase(train.train_name ?? ""),
      round(lat),
      round(lng),
      typeIndex(train.type ?? "", train.train_name ?? ""),
      round(train.next_lat ?? lat),
      round(train.next_lng ?? lng),
    ]);
  }

  return { updatedAt: new Date().toISOString(), total: trains.length, trains };
}
