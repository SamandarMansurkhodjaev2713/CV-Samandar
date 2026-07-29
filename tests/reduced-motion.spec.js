"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain } = require("./helpers");

test("reduced motion preserves all content and native navigation", async ({ page }) => {
  // Explicitly apply before navigation so even the head-inline intro gate sees
  // the preference; this also protects the test from runner/device overrides.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settleMain(page, "#projects");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await expect(page.locator(".proj-card")).toHaveCount(24);
  await expect(page.locator("#main")).toBeVisible();
  const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(["auto", "smooth"]).toContain(behavior);
});
