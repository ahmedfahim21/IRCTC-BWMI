/** Web Mercator helpers for the 2D raster map. */

export const TILE_SIZE = 256;
export const MIN_ZOOM = 4;
export const MAX_ZOOM = 12;

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
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(zW, zH)));
  return {
    centerLng: worldXToLng((lngToWorldX(west, 0) + lngToWorldX(east, 0)) / 2, 0),
    centerLat: worldYToLat((latToWorldY(north, 0) + latToWorldY(south, 0)) / 2, 0),
    zoom,
  };
}

/**
 * Keep the viewport inside geographic bounds. When the viewport is wider or
 * taller than the bounds on an axis, pin the center to the bounds midpoint
 * instead of edge-clamping (which would judder on a small card at MIN_ZOOM).
 */
export function clampView(
  centerLng: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number,
  bounds: [[number, number], [number, number]]
): { centerLng: number; centerLat: number; zoom: number } {
  const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const [[west, south], [east, north]] = bounds;

  const halfW = width / 2 / TILE_SIZE;
  const halfH = height / 2 / TILE_SIZE;

  let centerX = lngToWorldX(centerLng, clampedZoom);
  let centerY = latToWorldY(centerLat, clampedZoom);

  const boundsWestX = lngToWorldX(west, clampedZoom);
  const boundsEastX = lngToWorldX(east, clampedZoom);
  const boundsNorthY = latToWorldY(north, clampedZoom);
  const boundsSouthY = latToWorldY(south, clampedZoom);

  const viewSpanX = halfW * 2;
  const boundsSpanX = boundsEastX - boundsWestX;
  if (viewSpanX >= boundsSpanX) {
    centerX = (boundsWestX + boundsEastX) / 2;
  } else {
    const minX = boundsWestX + halfW;
    const maxX = boundsEastX - halfW;
    centerX = Math.min(maxX, Math.max(minX, centerX));
  }

  const viewSpanY = halfH * 2;
  const boundsSpanY = boundsSouthY - boundsNorthY;
  if (viewSpanY >= boundsSpanY) {
    centerY = (boundsNorthY + boundsSouthY) / 2;
  } else {
    const minY = boundsNorthY + halfH;
    const maxY = boundsSouthY - halfH;
    centerY = Math.min(maxY, Math.max(minY, centerY));
  }

  return {
    centerLng: worldXToLng(centerX, clampedZoom),
    centerLat: worldYToLat(centerY, clampedZoom),
    zoom: clampedZoom,
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

