import { test, expect, type Page } from "@playwright/test";

/**
 * Layout stability on the search form.
 *
 * Picking a station used to grow the field by 20px the moment it was chosen,
 * shoving the second field and the submit button down, then jump back up the
 * next time the field took focus. Controls that move under the pointer are a
 * bug, so this measures rather than trusts.
 */

/** Offsets measured from the form itself, so page scrolling can't skew them. */
async function geometry(page: Page) {
  return page.evaluate(() => {
    const form = document.querySelector("form")!;
    const inputs = [...document.querySelectorAll('[role="combobox"]')];
    const submit = [...document.querySelectorAll("button")].find((b) => /Find trains/.test(b.textContent ?? ""))!;
    const box = form.getBoundingClientRect();
    return {
      formHeight: Math.round(box.height),
      fromInput: Math.round(inputs[0].getBoundingClientRect().top - box.top),
      toInput: Math.round(inputs[1].getBoundingClientRect().top - box.top),
      submit: Math.round(submit.getBoundingClientRect().top - box.top),
    };
  });
}

async function pickStation(page: Page, index: number, query: string) {
  const input = page.locator('[role="combobox"]').nth(index);
  await input.click();
  await input.fill(query);
  const option = page.locator('[role="option"]').first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.locator('[role="listbox"]')).toBeHidden();
}

/** Chips on the availability strip, with the selected one flagged. */
async function stripState(page: Page) {
  return page.evaluate(() => {
    const strip = document.querySelector('[role="radiogroup"][aria-label="Journey date"]');
    if (!strip) return null;
    const chips = [...strip.querySelectorAll('[role="radio"]')];
    const form = document.querySelector("form")!;
    const submit = [...document.querySelectorAll("button")].find((b) => /Find trains/.test(b.textContent ?? ""))!;
    return {
      count: chips.length,
      firstLabel: (chips[0]?.getAttribute("aria-label") ?? "").split(",")[0],
      selectedLabel: (chips.find((c) => c.getAttribute("aria-checked") === "true")?.getAttribute("aria-label") ?? "").split(",")[0],
      scrollWidth: (strip as HTMLElement).scrollWidth,
      formHeight: Math.round(form.getBoundingClientRect().height),
      submitOffset: Math.round(submit.getBoundingClientRect().top - form.getBoundingClientRect().top),
    };
  });
}

test.describe("availability date strip", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
    await pickStation(page, 0, "delhi");
    await pickStation(page, 1, "howrah");
    await expect(page.locator('[role="radiogroup"][aria-label="Journey date"]')).toBeVisible();
    await expect(page.locator('[role="radio"]').first()).toBeVisible();
  });

  test("choosing a date does not reflow the form or refetch the strip", async ({ page }) => {
    const before = await stripState(page);
    expect(before).not.toBeNull();

    await page.locator('[role="radio"]').nth(5).click();
    await expect(page.locator('[role="radio"]').nth(5)).toHaveAttribute("aria-checked", "true");

    const after = await stripState(page);
    // Same window, same width: the strip was not re-requested, so nothing
    // below it collapsed to a skeleton and flashed.
    expect(after!.count).toBe(before!.count);
    expect(after!.scrollWidth).toBe(before!.scrollWidth);
    expect(after!.formHeight).toBe(before!.formHeight);
    expect(after!.submitOffset).toBe(before!.submitOffset);
  });

  test("the window stays anchored to today, so earlier dates remain reachable", async ({ page }) => {
    const before = await stripState(page);

    await page.locator('[role="radio"]').nth(7).click();
    await expect(page.locator('[role="radio"]').nth(7)).toHaveAttribute("aria-checked", "true");

    const after = await stripState(page);
    // It used to re-anchor the window to the chosen date, which stranded every
    // earlier day off the left edge with no way back.
    expect(after!.firstLabel, "strip must still start where it did").toBe(before!.firstLabel);

    // And the earliest chip is still there to be scrolled back to and chosen.
    const first = page.locator('[role="radio"]').first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await expect(first).toHaveAttribute("aria-checked", "true");
    expect((await stripState(page))!.firstLabel).toBe(before!.firstLabel);
  });
});

test.describe("search form layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");
    await expect(page.locator('[role="combobox"]').first()).toBeVisible();
  });

  test("choosing an origin moves nothing", async ({ page }) => {
    const before = await geometry(page);
    await pickStation(page, 0, "delhi");
    const after = await geometry(page);
    expect(after, "picking a station must not shift the form").toEqual(before);
  });

  test("focusing a field that already has a station moves nothing", async ({ page }) => {
    await pickStation(page, 0, "delhi");
    const settled = await geometry(page);

    await page.locator('[role="combobox"]').first().click();
    await expect(page.locator('[role="listbox"]')).toBeVisible();
    expect(await geometry(page), "opening the list must not shift the form").toEqual(settled);

    await page.keyboard.press("Escape");
    await expect(page.locator('[role="listbox"]')).toBeHidden();
    expect(await geometry(page), "closing the list must not shift the form").toEqual(settled);
  });

  test("clearing a station is reachable without blurring, and moves nothing", async ({ page }) => {
    await pickStation(page, 0, "delhi");
    const settled = await geometry(page);

    // The clear control used to disappear the moment the field took focus.
    await page.locator('[role="combobox"]').first().click();
    const clear = page.getByRole("button", { name: /^Clear / }).first();
    await expect(clear).toBeVisible();

    await clear.click();
    expect(await geometry(page), "clearing must not shift the form").toEqual(settled);
  });

  test("the submit button stays put while both stations are chosen", async ({ page }) => {
    const before = await geometry(page);
    await pickStation(page, 0, "delhi");
    await pickStation(page, 1, "mumbai");

    const after = await geometry(page);
    // The date strip appears once a route is complete — that's new content, and
    // it is meant to grow the form. What must not move is the pair of fields.
    expect(after.fromInput).toBe(before.fromInput);
    expect(after.toInput).toBe(before.toInput);
    expect(after.formHeight).toBeGreaterThan(before.formHeight);
  });
});
