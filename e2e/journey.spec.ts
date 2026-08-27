import { test, expect } from "@playwright/test";

/**
 * The whole point of the product, end to end: find a train, see every class at
 * once, pick a real berth, pay, and land on a live trip screen.
 */
test("search → pick a berth → confirm → track the trip", async ({ page }) => {
  const date = new Date();
  date.setDate(date.getDate() + 12);
  const journeyDate = date.toISOString().slice(0, 10);

  await page.goto(`/search?from=BCT&to=NDLS&date=${journeyDate}&quota=GN`);

  // Every class of every train is on screen without a further request.
  const firstRow = page.getByRole("article").first();
  await expect(firstRow).toBeVisible();
  const cells = firstRow.locator('button[aria-label*="₹"]');
  await expect(cells.first()).toBeVisible();
  expect(await cells.count()).toBeGreaterThan(1);

  // Start a booking from an available class.
  const availableCell = firstRow.locator('button[aria-label*="seats free"]').first();
  await expect(availableCell).toBeVisible();
  await availableCell.click();

  await page.waitForURL(/\/book\/dft_/);
  await expect(page.getByText(/Seats held for/)).toBeVisible();

  // Pick a real berth off the coach diagram.
  const freeBerth = page.locator('button[aria-label^="Berth "]:not([disabled])').first();
  await expect(freeBerth).toBeVisible();
  const berthLabel = await freeBerth.getAttribute("aria-label");
  await freeBerth.click();
  await expect(page.getByText(/1 of 1 chosen here/)).toBeVisible();

  // Refund terms are visible before paying, not after.
  await expect(page.getByText("If you cancel")).toBeVisible();
  await expect(page.getByText(/₹[\d,]+ back/)).toBeVisible();

  await page.getByPlaceholder("As on your ID").fill("Ahmed Fahim");
  await page.getByPlaceholder("10 digits").fill("9876543210");

  const confirm = page.getByRole("button", { name: /Confirm and pay/ });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // An honest queue, then a PNR.
  await expect(page.getByText(/in the queue/)).toBeVisible();
  await page.waitForURL(/\/trips\/\d{10}/, { timeout: 30_000 });

  const pnr = page.url().match(/\/trips\/(\d{10})/)![1];
  await expect(page.getByText(pnr, { exact: false }).first()).toBeVisible();

  // The trip screen carries the things that live in three other apps today.
  await expect(page.getByText(/Platform/).first()).toBeVisible();
  await expect(page.getByText(/Coach/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Alarms" })).toBeVisible();
  await expect(page.locator('svg[aria-label^="Barcode"]')).toBeVisible();

  // The berth we picked is the berth we got.
  const berthNumber = berthLabel!.match(/Berth (\d+)/)![1];
  await expect(page.getByText(new RegExp(`CNF \\w+/${berthNumber}`))).toBeVisible();
});

test("a draft survives a reload with nothing lost", async ({ page }) => {
  const date = new Date();
  date.setDate(date.getDate() + 20);
  const journeyDate = date.toISOString().slice(0, 10);

  const response = await page.request.post("/api/bookings/draft", {
    data: { trainNumber: "12951", journeyDate, fromCode: "BCT", toCode: "NDLS", classCode: "3A", quota: "GN" },
  });
  const { draft } = await response.json();

  await page.goto(`/book/${draft.draftId}`);
  await page.getByPlaceholder("As on your ID").fill("Rhea Nair");
  await page.getByPlaceholder("10 digits").fill("9998887776");
  const freeBerth = page.locator('button[aria-label^="Berth "]:not([disabled])').first();
  await freeBerth.click();
  const berthLabel = await freeBerth.getAttribute("aria-label");

  // Give the debounced autosave time to land, then reload from scratch.
  await page.waitForTimeout(1200);
  await page.reload();

  await expect(page.getByPlaceholder("As on your ID")).toHaveValue("Rhea Nair");
  await expect(page.getByPlaceholder("10 digits")).toHaveValue("9998887776");
  await expect(page.locator(`button[aria-label="${berthLabel}"]`)).toHaveAttribute("aria-pressed", "true");
});

test("a ticket still renders with the network cut", async ({ page, context }) => {
  await page.goto("/trips");
  const firstTrip = page.locator('a[href^="/trips/"]').first();
  await firstTrip.click();
  await page.waitForURL(/\/trips\/\d{10}/);
  await expect(page.locator('svg[aria-label^="Barcode"]')).toBeVisible();

  // The service worker installs on first load and only controls the page after
  // it activates, so wait for that before cutting the network.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.locator('svg[aria-label^="Barcode"]')).toBeVisible();
  await page.waitForTimeout(1000);
  await context.setOffline(true);
  await page.reload();

  await expect(page.locator('svg[aria-label^="Barcode"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/No network/)).toBeVisible();
  await context.setOffline(false);
});
