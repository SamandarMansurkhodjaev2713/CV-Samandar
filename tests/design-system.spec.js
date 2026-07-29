"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow } = require("./helpers");

test("Builder + QA proof rail and local type system survive every viewport", async ({ page }) => {
  const remoteFontRequests = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (host === "fonts.googleapis.com" || host === "fonts.gstatic.com") {
      remoteFontRequests.push(request.url());
    }
  });

  await settleMain(page, "#hero");
  await expect(page.locator(".hero-proof-step")).toHaveCount(3);
  await expect(page.locator(".hero-roles")).toContainText(/Builder/i);
  await expect(page.locator(".hero-roles")).toContainText("QA");

  const type = await page.evaluate(() => ({
    heading: getComputedStyle(document.querySelector(".hero-name")).fontFamily,
    body: getComputedStyle(document.body).fontFamily,
    mono: getComputedStyle(document.querySelector(".hero-proof-label")).fontFamily,
  }));
  expect(type.heading).toContain("Oswald");
  expect(type.body).toContain("Inter");
  expect(type.mono).toContain("JetBrains Mono");
  expect(remoteFontRequests).toEqual([]);
  await expectNoHorizontalOverflow(expect, page, "design-system hero");
});

test("Signal remains reader-controlled instead of auto-changing disclosure state", async ({ page }) => {
  await settleMain(page, "#signal");
  const rows = page.locator(".signal-row");
  await expect(rows).toHaveCount(6);
  await expect(page.locator('.signal-row[aria-expanded="true"]')).toHaveCount(0);
  await page.waitForTimeout(1200);
  const expanded = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-expanded")));
  expect(expanded).toEqual(["false", "false", "false", "false", "false", "false"]);
});

test("fullscreen menu owns the interaction layer and its language controls receive real pointer input", async ({ page }) => {
  await settleMain(page, "#hero");
  await page.locator(".nav-burger").click();
  await expect(page.locator(".nav-menu")).toHaveClass(/is-open/);

  const layers = await page.evaluate(() => ({
    menu: Number.parseInt(getComputedStyle(document.querySelector(".nav-menu")).zIndex, 10),
    nav: Number.parseInt(getComputedStyle(document.querySelector(".nav")).zIndex, 10),
    highestSection: Math.max(
      ...Array.from(document.querySelectorAll("main section")).map((section) => {
        const value = Number.parseInt(getComputedStyle(section).zIndex, 10);
        return Number.isFinite(value) ? value : 0;
      })
    ),
  }));
  expect(layers.menu).toBeGreaterThan(layers.highestSection);
  expect(layers.nav).toBeGreaterThan(layers.menu);

  await page.locator(".nav-menu-lang button").filter({ hasText: /^UZ$/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await page.locator(".nav-burger").click();
  await expect(page.locator(".nav-menu")).not.toHaveClass(/is-open/);
  await expect(page.locator(".hero-roles")).toContainText("Builder");
  await expectNoHorizontalOverflow(expect, page, "menu language switch");
});

test("intro owns the scroll lock and always releases into a readable hero", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "timing contract is engine-independent");

  await page.goto("/?intro-contract=1", { waitUntil: "commit" });
  await expect(page.locator("#sm-intro")).toHaveCount(1, { timeout: 1500 });
  await expect(page.locator("html")).toHaveClass(/intro-lock/);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(50);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await expect(page.locator("#sm-intro")).toHaveCount(0, { timeout: 3600 });
  await expect(page.locator("html")).not.toHaveClass(/intro-lock/);
  await expect(page.locator("#hero")).toHaveClass(/is-lit/);
  await expect(page.locator(".hero-proof")).toBeVisible();
});
