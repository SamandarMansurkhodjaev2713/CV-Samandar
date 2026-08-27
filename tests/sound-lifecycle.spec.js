"use strict";

const { test, expect } = require("@playwright/test");

test("legacy sound preference cannot activate an undisclosed audio layer", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "bootstrap contract is browser-independent");
  await page.addInitScript(() => localStorage.setItem("sm-sound", "1"));
  await page.goto("/?sound-lifecycle=1#hero", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await expect(page.locator(".sound-toggle")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => Boolean(window.SMSound))).toBe(false);
  await expect(page.locator("html")).not.toHaveClass(/sm-sound/);
});
