"use strict";

const { test, expect } = require("@playwright/test");
test("reduced motion preserves all content and native navigation", async ({ page }) => {
  // Explicitly apply before navigation so even the head-inline intro gate sees
  // the preference; this also protects the test from runner/device overrides.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?e2e=1&reduced-intro=1", { waitUntil: "commit" });
  await expect(page.locator("#sm-intro")).toHaveAttribute("data-intro-mode", "reduced");
  await expect(page.locator("#sm-intro canvas")).toHaveCount(0);
  await expect(page.locator("#sm-intro")).toHaveCount(0, { timeout: 3600 });
  await page.locator("#main").waitFor({ state: "attached" });
  await page.locator(".proj-card").first().waitFor({ state: "attached" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await expect(page.locator(".proj-card")).toHaveCount(24);
  await expect(page.locator("#main")).toBeVisible();
  await expect(page.locator("#root")).not.toHaveAttribute("aria-hidden", "true");
  const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(["auto", "smooth"]).toContain(behavior);
});
