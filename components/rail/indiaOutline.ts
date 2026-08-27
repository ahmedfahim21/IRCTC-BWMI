/**
 * A simplified India outline in [lng, lat]. Deliberately coarse — it exists to
 * give the route geographic context, not to be an atlas. Keeping it as data
 * means the map needs no tile server, works offline, and costs nothing on the
 * critical path.
 */
export const INDIA_OUTLINE: Array<[number, number]> = [
  [68.2, 23.7], [68.9, 22.4], [69.6, 22.5], [70.0, 21.8], [69.1, 21.6],
  [70.5, 20.9], [72.0, 21.1], [72.6, 21.7], [72.9, 20.5], [72.8, 19.1],
  [73.3, 17.5], [74.0, 15.5], [74.7, 13.5], [75.7, 11.5], [76.5, 9.5],
  [77.5, 8.1], [78.5, 9.5], [79.8, 10.3], [80.2, 13.1], [80.3, 15.9],
  [81.2, 16.3], [82.3, 16.6], [83.3, 17.7], [84.8, 19.1], [86.5, 20.2],
  [87.0, 21.5], [88.1, 21.7], [89.0, 22.0], [89.1, 24.5], [88.2, 25.2],
  [88.5, 26.5], [89.8, 26.7], [90.0, 25.2], [91.0, 25.2], [92.0, 24.2],
  [92.5, 22.2], [93.2, 23.7], [94.5, 25.0], [95.3, 26.7], [96.5, 27.3],
  [97.4, 28.2], [96.0, 29.3], [94.0, 29.3], [92.0, 28.0], [89.5, 28.1],
  [88.0, 27.9], [85.0, 28.3], [82.0, 30.3], [80.0, 30.5], [78.5, 32.5],
  [79.0, 34.5], [77.0, 35.5], [76.0, 35.8], [74.5, 34.7], [73.9, 33.2],
  [74.5, 32.5], [75.3, 32.3], [74.6, 31.0], [73.8, 29.9], [72.5, 28.0],
  [70.5, 27.8], [70.0, 26.0], [68.8, 24.3],
];

/** Equirectangular projection. Good enough at India's latitudes. */
export function project(lng: number, lat: number): [number, number] {
  return [(lng - 67) * 10, (38 - lat) * 10];
}

export const INDIA_PATH = `${INDIA_OUTLINE.map(([lng, lat], i) => {
  const [x, y] = project(lng, lat);
  return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
}).join("")}Z`;
