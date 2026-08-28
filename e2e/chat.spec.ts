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

test("changing destination mid-conversation updates the search", async ({ page }) => {
  await openChat(page);
  await say(page, "from New Delhi to Mumbai tomorrow");
  await page.waitForURL(/\/search\?.*from=NDLS/, { timeout: 20_000 });
  await say(page, "change destination to Chennai");
  await page.waitForURL(/to=MAS/, { timeout: 20_000 });
  await expect(page.getByTestId("chat-tool").filter({ hasText: /set search/i }).first()).toBeVisible();
});

test("changing origin mid-conversation keeps the destination", async ({ page }) => {
  await openChat(page);
  await say(page, "from New Delhi to Mumbai tomorrow");
  await page.waitForURL(/from=NDLS/, { timeout: 20_000 });
  await say(page, "change origin to NZM");
  await page.waitForURL(/from=NZM/, { timeout: 20_000 });
});

test("a new city pair replaces the whole journey", async ({ page }) => {
  await openChat(page);
  await say(page, "from New Delhi to Mumbai tomorrow");
  await page.waitForURL(/from=NDLS/, { timeout: 20_000 });
  await say(page, "from Bangalore to Chennai tomorrow");
  await page.waitForURL(/from=SBC.*to=MAS/, { timeout: 20_000 });
});

test("add meals toggles the booking switch", async ({ page }) => {
  await openChat(page);
  await say(page, "book 12951 in 3A");
  await page.waitForURL(/\/book\/dft_/, { timeout: 20_000 });
  await expect(page.getByRole("switch", { name: "Add meals" })).toHaveAttribute("aria-checked", "false");
  await say(page, "add meals please");
  await expect(page.getByRole("switch", { name: "Add meals" })).toHaveAttribute("aria-checked", "true", { timeout: 15_000 });
  await expect(page.getByTestId("chat-tool").filter({ hasText: /set options/i })).toBeVisible();
});

test("booking options can be changed across multiple chat turns", async ({ page }) => {
  await openChat(page);
  await say(page, "book 12951 in 3A");
  await page.waitForURL(/\/book\/dft_/, { timeout: 20_000 });
  await say(page, "add meals please");
  await expect(page.getByRole("switch", { name: "Add meals" })).toHaveAttribute("aria-checked", "true", {
    timeout: 15_000,
  });
  await expect(page.getByTestId("chat-tool").filter({ hasText: /set options/i }).first()).toContainText(/done|Updated/i);
  await say(page, "remove travel insurance and turn off auto upgrade");
  await expect(page.getByRole("switch", { name: "Travel insurance" })).toHaveAttribute("aria-checked", "false", {
    timeout: 15_000,
  });
  await expect(page.getByRole("switch", { name: /Auto-upgrade/i })).toHaveAttribute("aria-checked", "false", {
    timeout: 15_000,
  });
  await say(page, "remove meals");
  await expect(page.getByRole("switch", { name: "Add meals" })).toHaveAttribute("aria-checked", "false", {
    timeout: 15_000,
  });
});

test("asking for seats shows the coach diagram and picks a berth", async ({ page }) => {
  await openChat(page);
  await say(page, "book 12951 in 3A");
  await page.waitForURL(/\/book\/dft_/, { timeout: 20_000 });
  await expect(page.getByText("Choose your berth")).toBeVisible();
  await expect(page.locator('button[aria-label^="Berth "]').first()).toBeVisible();
  await say(page, "show me the seat layout");
  await expect(page.getByText(/1 of 1 chosen here/)).toBeVisible({ timeout: 15_000 });
});

test("unknown turns ask a clarifying question", async ({ page }) => {
  await openChat(page);
  await say(page, "hello");
  await expect(page.getByLabel("Booking chat")).toContainText(/Which stations/i, { timeout: 15_000 });
});

test("transcript survives a hard reload", async ({ page }) => {
  await openChat(page);
  await say(page, "from New Delhi to Mumbai tomorrow");
  await expect(page.getByLabel("Booking chat")).toContainText(/Searching NDLS/i, { timeout: 15_000 });
  await page.reload();
  await page.getByRole("button", { name: "Open booking chat" }).click();
  await expect(page.getByLabel("Booking chat")).toContainText(/Searching NDLS/i);
});

test("new chat clears the transcript", async ({ page }) => {
  await openChat(page);
  await say(page, "from New Delhi to Mumbai tomorrow");
  await expect(page.getByLabel("Booking chat")).toContainText(/Searching NDLS/i, { timeout: 15_000 });
  await page.getByRole("button", { name: "New" }).click();
  await expect(page.getByLabel("Booking chat")).not.toContainText(/Searching NDLS/i);
  await expect(page.getByText("Ask for a train the way you would say it")).toBeVisible();
});

test("berth selection off the booking screen reports failure", async ({ page }) => {
  await openChat(page);
  await say(page, "pick a lower berth in coach B1");
  await expect(page.getByTestId("chat-tool").filter({ hasText: /select berth/i })).toContainText(
    /booking screen is not open|not open/i,
    { timeout: 15_000 }
  );
});

test("context is retained across navigation", async ({ page }) => {
  await openChat(page);
  await say(page, "from New Delhi to Mumbai tomorrow");
  await page.waitForURL(/\/search\?/, { timeout: 20_000 });
  await say(page, "book 12951 in 3A");
  await page.waitForURL(/\/book\/dft_/, { timeout: 20_000 });
  await say(page, "add meals please");
  await expect(page.getByRole("switch", { name: "Add meals" })).toHaveAttribute("aria-checked", "true", {
    timeout: 15_000,
  });
  await expect(page.getByLabel("Booking chat")).toContainText(/Searching NDLS/i);
});
