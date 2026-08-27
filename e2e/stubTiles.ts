import type { Page } from "@playwright/test";

const EMPTY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/**
 * MapLibre will fetch OpenFreeMap / EOX / OpenRailwayMap from the CI browser.
 * With no egress the `load` event never fires. Stub the tiles so the suite
 * cannot hang on map state — chrome under test does not wait on `load`.
 */
export async function stubMapTiles(page: Page) {
  await page.route("**/tiles.openfreemap.org/**", (route) =>
    route.fulfill({ status: 204, body: "" })
  );
  await page.route("**/tiles.maps.eox.at/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: EMPTY_PNG })
  );
  await page.route("**/tiles.openrailwaymap.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: EMPTY_PNG })
  );
}
