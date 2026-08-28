import type { Page } from "@playwright/test";

const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/**
 * Raster tiles come from Esri or OSM. Stub them so the suite cannot hang
 * on map state when the CI browser has no egress.
 */
export async function stubMapTiles(page: Page) {
  await page.route("**/tiles.maps.eox.at/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: EMPTY_PNG })
  );
  await page.route("**/server.arcgisonline.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/jpeg", body: EMPTY_PNG })
  );
  await page.route("**/tile.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: EMPTY_PNG })
  );
}
