"use strict";

const { test, expect } = require("@playwright/test");
test("reduced motion preserves all content and native navigation", async ({ page }) => {
  // Explicitly apply before navigation so even the head-inline intro gate sees
  // the preference; this also protects the test from runner/device overrides.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?e2e=1&reduced-intro=1", { waitUntil: "commit" });

  // The E2E head-safety ceiling may release an already-ready shell before
  // Playwright's first locator task runs on a saturated host. The durable
  // boot intent is the contract; requiring the transient panel to still be in
  // the DOM turns a faster accessible exit into a false failure.
  await expect.poll(() => page.evaluate(() => {
    return window.__SM_INTRO && window.__SM_INTRO.mode;
  })).toBe("reduced");
  await expect(page.locator("#sm-intro canvas")).toHaveCount(0);
  await expect(page.locator("#sm-intro")).toHaveCount(0, { timeout: 3600 });
  await page.locator("#main").waitFor({ state: "attached" });
  await page.locator(".proj-card").first().waitFor({ state: "attached" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await expect(page.locator(".proj-card")).toHaveCount(6);
  await expect(page.locator("#main")).toBeVisible();
  await expect(page.locator("#root")).not.toHaveAttribute("aria-hidden", "true");
  const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(["auto", "smooth"]).toContain(behavior);
});
