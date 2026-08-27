import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AUDIT = readFileSync(resolve(__dirname, "../scripts/contrast-audit.js"), "utf8");

const inTwelveDays = () => {
  const d = new Date();
  d.setDate(d.getDate() + 12);
  return d.toISOString().slice(0, 10);
};

const PAGES = [
  { name: "home", path: "/" },
  { name: "results", path: () => `/search?from=NDLS&to=MAS&date=${inTwelveDays()}&quota=GN` },
  { name: "train", path: "/trains/12951" },
  { name: "map", path: "/map" },
  { name: "trips", path: "/trips" },
  { name: "pnr", path: "/pnr" },
];

const resolvePath = (p: (typeof PAGES)[number]["path"]) => (typeof p === "function" ? p() : p);

for (const theme of ["light", "dark"] as const) {
  for (const page_ of PAGES) {
    test(`${page_.name} meets WCAG AA contrast in ${theme}`, async ({ page }) => {
      await page.addInitScript(
        ([t]) => localStorage.setItem("irctc.theme", t as string),
        [theme]
      );
      await page.goto(resolvePath(page_.path));
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(400);

      await page.evaluate(AUDIT);
      const result = await page.evaluate(() => (window as unknown as { __audit(): unknown }).__audit());
      const report = result as { checked: number; failCount: number; fails: unknown[] };

      expect(report.checked, "audit found text to check").toBeGreaterThan(10);
      expect(report.fails, `${page_.name} / ${theme}`).toEqual([]);
      expect(report.failCount).toBe(0);
    });
  }
}

for (const width of [360, 414, 768, 1280]) {
  test(`no horizontal page scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const page_ of PAGES) {
      await page.goto(resolvePath(page_.path));
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const offenders: string[] = [];
        document.querySelectorAll("body *").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > vw + 1 && rect.height > 0) {
            // Wide content is fine as long as it scrolls inside its own box.
            let node: Element | null = el.parentElement;
            let contained = false;
            while (node) {
              if (getComputedStyle(node).overflowX === "auto" || getComputedStyle(node).overflowX === "hidden") {
                contained = true;
                break;
              }
              node = node.parentElement;
            }
            if (!contained) offenders.push(`${el.tagName}.${(el.className || "").toString().slice(0, 40)}`);
          }
        });
        return offenders;
      });
      expect(overflow, `${page_.name} at ${width}px`).toEqual([]);
    }
  });
}

test("every interactive control is reachable and labelled", async ({ page }) => {
  await page.goto(resolvePath(PAGES[1].path));
  await page.waitForTimeout(500);

  const unlabelled = await page.evaluate(() => {
    const bad: string[] = [];
    document.querySelectorAll("button, a, input, [role='tab'], [role='switch']").forEach((el) => {
      const label =
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        el.textContent?.trim() ||
        (el as HTMLInputElement).placeholder;
      if (!label) bad.push(`${el.tagName}.${(el.className || "").toString().slice(0, 40)}`);
    });
    return bad;
  });
  expect(unlabelled).toEqual([]);

  // Nested interactive elements are invalid HTML and break keyboard navigation.
  const nested = await page.evaluate(
    () => document.querySelectorAll("button button, a button, button a, a a").length
  );
  expect(nested).toBe(0);

  // Tab moves focus somewhere visible.
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(["A", "BUTTON", "INPUT"]).toContain(focused);
});
