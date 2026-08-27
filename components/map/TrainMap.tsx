"use client";

/**
 * Canvas map retired in favour of MapLibre (`RailMap`). Type legend and colour
 * tokens live next to the tiled map so the old hex palette cannot drift back in.
 */
export { TypeLegend } from "./TypeLegend";
export { typeColourVar as TYPE_COLOURS } from "@/lib/railradar/trainTypes";
export type { MapTrain } from "./TrainLayer";
