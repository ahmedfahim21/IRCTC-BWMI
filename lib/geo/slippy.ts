/** Web Mercator helpers for the WebGL-free raster fallback. */

export const TILE_SIZE = 256;

export function lngToWorldX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * 2 ** zoom;
}

export function latToWorldY(lat: number, zoom: number): number {
  const clamped = Math.min(85.05112878, Math.max(-85.05112878, lat));
  const sin = Math.sin((clamped * Math.PI) / 180);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * 2 ** zoom;
}

export function worldXToLng(x: number, zoom: number): number {
  return (x / 2 ** zoom) * 360 - 180;
}

export function worldYToLat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** zoom;
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function zoomToFit(
  west: number,
  south: number,
  east: number,
  north: number,
  width: number,
  height: number,
  padding: number
): { centerLng: number; centerLat: number; zoom: number } {
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  const xSpan = Math.max(1e-6, lngToWorldX(east, 0) - lngToWorldX(west, 0));
  const ySpan = Math.max(1e-6, latToWorldY(south, 0) - latToWorldY(north, 0));
  const zW = Math.log2(innerW / (xSpan * TILE_SIZE));
  const zH = Math.log2(innerH / (ySpan * TILE_SIZE));
  const zoom = Math.min(12, Math.max(3, Math.min(zW, zH)));
  return {
    centerLng: (west + east) / 2,
    centerLat: (south + north) / 2,
    zoom,
  };
}

export function viewportBbox(
  centerLng: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number
): string {
  const cx = lngToWorldX(centerLng, zoom);
  const cy = latToWorldY(centerLat, zoom);
  const halfW = width / 2 / TILE_SIZE;
  const halfH = height / 2 / TILE_SIZE;
  const west = worldXToLng(cx - halfW, zoom);
  const east = worldXToLng(cx + halfW, zoom);
  const north = worldYToLat(cy - halfH, zoom);
  const south = worldYToLat(cy + halfH, zoom);
  return `${west.toFixed(3)},${south.toFixed(3)},${east.toFixed(3)},${north.toFixed(3)}`;
}

/** Pixel position of a lng/lat in a slippy viewport. Same math the tile painter uses. */
export function lngLatToViewPx(
  lng: number,
  lat: number,
  centerLng: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: (lngToWorldX(lng, zoom) - lngToWorldX(centerLng, zoom)) * TILE_SIZE + width / 2,
    y: (latToWorldY(lat, zoom) - latToWorldY(centerLat, zoom)) * TILE_SIZE + height / 2,
  };
}

export function gpuCanRunMapLibre(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    return Boolean(gl && gl.getParameter(gl.VERSION));
  } catch {
    return false;
  }
}
