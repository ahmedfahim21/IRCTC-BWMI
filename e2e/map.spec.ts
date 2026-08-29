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
  await expect(page.getByRole("img", { name: "Map of India" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("img", { name: "Running trains on the map" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: /satellite/i })).toHaveCount(0);
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
  await expect(page.getByTestId("map-route-overlay")).toBeVisible({ timeout: 20_000 });
});

test("search map pins and callouts are interactive", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/search?from=NDLS&to=MAS&date=${inTwelveDays()}&quota=GN`);
  const fromPin = page.getByRole("button", { name: /From .+ \(NDLS\)/ });
  await expect(fromPin).toBeVisible({ timeout: 20_000 });

  await fromPin.click();
  await expect(page.getByRole("dialog", { name: /\(NDLS\)/ })).toBeVisible();

  const trainCanvas = page.getByRole("img", { name: "Running trains on the map" });
  await expect(trainCanvas).toBeVisible();
  /*
   * Train positions are modelled from the wall clock, so no fixed pixel is
   * guaranteed to have a train under it. The layer publishes where it drew
   * the first train; click exactly there.
   */
  await expect(trainCanvas).toHaveAttribute("data-train-x", /\d+/, { timeout: 10_000 });
  const box = await trainCanvas.boundingBox();
  expect(box).toBeTruthy();
  const trainX = Number(await trainCanvas.getAttribute("data-train-x"));
  const trainY = Number(await trainCanvas.getAttribute("data-train-y"));
  await page.mouse.click(box!.x + trainX, box!.y + trainY);
  const trainDialog = page.getByRole("dialog").filter({ hasText: /\d{5}/ });
  await expect(trainDialog.first()).toBeVisible({ timeout: 10_000 });
});

test("search map card collapse unmounts the canvas", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/search?from=NDLS&to=MAS&date=${inTwelveDays()}&quota=GN&train=12621`);
  await expect(page.getByRole("img", { name: "Map of India" })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /Route map/i }).click();
  await expect(page.getByRole("img", { name: "Map of India" })).toBeHidden();

  await page.getByRole("button", { name: /Route map/i }).click();
  await expect(page.getByRole("img", { name: "Map of India" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("map-route-overlay")).toBeVisible({ timeout: 20_000 });
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
