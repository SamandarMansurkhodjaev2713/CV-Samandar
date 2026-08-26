"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow } = require("./helpers");

test.describe("honest degraded states", () => {
  test.skip(({ isMobile }) => isMobile, "Each failure contract is viewport-independent and covered once.");

  test("pre-React failure resolves to a useful recovery surface", async ({ page }) => {
    test.setTimeout(20000);
    await page.route("**/src/components/app.js*", (route) => route.abort("failed"));
    await page.goto("/#hero", { waitUntil: "domcontentloaded" });
    const recovery = page.getByRole("alert");
    await expect(recovery).toBeVisible({ timeout: 12000 });
    await expect(recovery.getByRole("heading")).toContainText("Сайт не загрузился");
    await expect(recovery.getByRole("link", { name: "Написать в Telegram" }))
      .toHaveAttribute("href", "https://t.me/killallofthem13");
  });

  test("a shell that mounts after the intro deadline replaces recovery synchronously", async ({ page }) => {
    test.setTimeout(20000);
    await page.route("**/src/components/app.js*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3400));
      await route.continue();
    });

    await page.goto("/?late-shell=1", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 7000 });
    await page.locator("#main").waitFor({ state: "attached", timeout: 10000 });

    await expect(page.locator("#sm-intro")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/intro-lock/);
    await expect(page.locator("#root")).not.toHaveAttribute("aria-hidden", "true");
    expect(await page.locator("#root").evaluate((root) => root.inert)).toBe(false);
  });

  test("font failure keeps the main experience readable and unlocked", async ({ page }) => {
    let blocked = 0;
    await page.route("**/assets/fonts/**", (route) => {
      blocked += 1;
      return route.abort("failed");
    });

    await settleMain(page, "#hero");
    await expect.poll(() => blocked).toBeGreaterThan(0);
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator("#hero h1")).toBeVisible();
    await expect(page.locator("#sm-intro")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/intro-lock/);
    await expectNoHorizontalOverflow(expect, page, "font fallback");
  });

  test("missing project artwork becomes a branded fallback on cards and case pages", async ({ page }) => {
    let blocked = 0;
    await page.route("**/assets/proj/**/*.webp*", (route) => {
      blocked += 1;
      return route.abort("failed");
    });

    await settleMain(page, "#projects");
    const card = page.locator(".proj-card:visible").first();
    await expect(card.locator(".proj-screen-body--img")).toHaveClass(/is-image-fallback/);
    await expect(card.locator(".proj-name")).not.toBeEmpty();
    await expect(card.locator(".proj-cta")).toBeVisible();
    await expect.poll(() => blocked).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(expect, page, "project artwork fallback");

    await page.goto("/projects/ttyl/", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".lp-photo")).toHaveClass(/is-image-fallback/);
    await expect(page.locator(".lp-title")).toHaveText("TTYL Platform");
    await expect(page.locator(".lp-cta").first()).toBeVisible();
    await expectNoHorizontalOverflow(expect, page, "case artwork fallback");
  });

  test("About proof is complete without runtime GitHub telemetry", async ({ page }) => {
    let requests = 0;
    await page.route("https://api.github.com/**", (route) => {
      requests += 1;
      return route.abort("failed");
    });

    // Profile facts are authored content. The section must not depend on a
    // rate-limited third-party API or change shape after it becomes visible.
    await page.goto("/#about", { waitUntil: "domcontentloaded" });
    await page.locator("#main").waitFor({ state: "attached" });
    await expect(page.locator(".about-proof")).toBeVisible();
    await expect(page.locator(".about-proof-route li")).toHaveCount(4);
    await expect(page.locator(".about-stat")).toHaveCount(4);
    await expect.poll(() => requests).toBe(0);
    await expect(page.locator(".about-contrib")).toHaveCount(0);
    await expect(page.locator(".about-gh-live")).toHaveCount(0);
    await expect(page.locator(".about-gh-stats")).toHaveCount(0);
    await expectNoHorizontalOverflow(expect, page, "About proof");
  });

  test("optional Three.js failure preserves the real project image", async ({ page }) => {
    let blocked = 0;
    await page.route("**/vendor/three.min.js*", (route) => {
      blocked += 1;
      return route.abort("failed");
    });

    await settleMain(page, "#projects");
    const result = await page.evaluate(async () => {
      // Exercise the download branch deterministically even when the shared CI
      // host has already lowered its adaptive motion tier under load.
      window.__SM_MOTION_POLICY = {
        allows: () => true,
        getState: () => ({ pointerClass: "fine" }),
      };
      return (await window.__SM_LAZY_EFFECTS.ensure()) === null;
    });

    expect(result).toBe(true);
    await expect.poll(() => blocked).toBe(1);
    const image = page.locator(".proj-card:visible .proj-screen-img").first();
    await expect(image).toBeVisible();
    expect(await image.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator(".imgfx-canvas")).toHaveCount(0);
    await expectNoHorizontalOverflow(expect, page, "Three.js fallback");
  });
});
