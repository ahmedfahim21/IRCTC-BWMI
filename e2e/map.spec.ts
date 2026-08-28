import { test, expect } from "@playwright/test";
import { stubMapTiles } from "./stubTiles";

const inTwelveDays = () => {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  return d.toISOString().slice(0, 10);
};

test.beforeEach(async ({ page }) => {
  await stubMapTiles(page);
});

test("the landing map paints India and running trains", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const painted = page.getByRole("img", { name: "Map of India" }).or(page.locator(".maplibregl-canvas"));
  await expect(painted.first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("img", { name: "Running trains on the map" }).or(page.locator(".maplibregl-canvas"))).toBeVisible({
    timeout: 20_000,
  });
});

test("search shows origin, destination, and a selected train's route", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/search?from=NDLS&to=MAS&date=${inTwelveDays()}&quota=GN`);
  await expect(page.getByRole("button", { name: /From .+ \(NDLS\)/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /To .+ \(MAS\)/ })).toBeVisible();

  const firstTrain = page.getByRole("article").first();
  await expect(firstTrain).toBeVisible();
  await firstTrain.click();
  await expect(page).toHaveURL(/train=\d{5}/);
  await expect(page.getByTestId("map-route-overlay").or(page.locator(".maplibregl-canvas"))).toBeVisible({ timeout: 20_000 });
});

test("the booking screen shows a coach berth layout", async ({ page }) => {
  const journeyDate = inTwelveDays();
  const response = await page.request.post("/api/bookings/draft", {
    data: { trainNumber: "12951", journeyDate, fromCode: "BCT", toCode: "NDLS", classCode: "3A", quota: "GN" },
  });
  const { draft } = await response.json();
  await page.goto(`/book/${draft.draftId}`);
  await expect(page.getByText("Choose your berth")).toBeVisible();
  await expect(page.locator('button[aria-label^="Berth "]').first()).toBeVisible();
  await expect(page.getByText(/of \d+ free/)).toBeVisible();
});
