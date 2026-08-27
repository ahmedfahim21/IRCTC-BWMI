import { test, expect } from "@playwright/test";
import { stubMapTiles } from "./stubTiles";

test.beforeEach(async ({ page }) => {
  await stubMapTiles(page);
});

async function openChat(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Open booking chat" }).click();
  await expect(page.getByLabel("Booking chat")).toBeVisible();
}

async function say(page: import("@playwright/test").Page, text: string) {
  const box = page.locator("#booking-chat-input");
  await box.fill(text);
  const send = page.getByRole("button", { name: "Send message" });
  await expect(send).toBeEnabled({ timeout: 20_000 });
  await send.click();
}

test("search → book → PNR through chat", async ({ page }) => {
  await openChat(page);

  await say(page, "from New Delhi to Mumbai tomorrow");
  await page.waitForURL(/\/search\?/, { timeout: 20_000 });
  await expect(page.getByLabel("Booking chat")).toContainText(/Searching NDLS/i);

  await say(page, "book 12951 in 3A");
  await page.waitForURL(/\/book\/dft_/, { timeout: 20_000 });
  await expect(page.getByText(/Seats held for|Seat hold expired/)).toBeVisible();

  await say(page, "confirm this booking");
  await page.waitForURL(/\/trips\/\d{10}/, { timeout: 30_000 });
  await expect(page.locator('svg[aria-label^="Barcode"]')).toBeVisible();
});

test("Delhi is treated as ambiguous", async ({ page }) => {
  await openChat(page);
  await say(page, "I want to travel from Delhi to Mumbai");
  await expect(page.getByLabel("Booking chat")).toContainText(/more than one station/i, { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/search\?/);
});

test("no direct train offers alternatives", async ({ page }) => {
  await openChat(page);
  await say(page, "no direct train please");
  await expect(page.getByLabel("Booking chat")).toContainText(/No direct train/i, { timeout: 15_000 });
});

test("expired hold is explained", async ({ page }) => {
  await openChat(page);
  await say(page, "the hold expired");
  await expect(page.getByLabel("Booking chat")).toContainText(/expired/i, { timeout: 15_000 });
});

test("change of mind returns to search", async ({ page }) => {
  await page.goto("/pnr");
  await page.getByRole("button", { name: "Open booking chat" }).click();
  await say(page, "change of mind, start over");
  await page.waitForURL(/\/$/, { timeout: 15_000 });
});
