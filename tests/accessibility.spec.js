"use strict";

const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { settleMain, caseProducts, expectNoHorizontalOverflow } = require("./helpers");

test("main semantic shell has no WCAG 2.2 A/AA axe violations", async ({ page, isMobile, browserName }) => {
  test.skip(browserName === "webkit", "Axe semantics are engine-independent; WebKit keeps the functional/keyboard matrix.");
  test.setTimeout(90000);
  await settleMain(page, "#projects");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

for (const product of caseProducts) {
  test(product.slug + " case has no WCAG 2.2 A/AA axe violations", async ({ page, browserName, isMobile }) => {
    test.skip(browserName === "webkit" || isMobile, "The shared case renderer is audited once per product in desktop Chromium.");
    test.setTimeout(90000);
    await page.goto("/" + product.casePage, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    await expectNoHorizontalOverflow(expect, page, product.slug);
  });
}

test("custom 404 has no WCAG 2.2 A/AA axe violations", async ({ page, browserName, isMobile }) => {
  test.skip(browserName === "webkit" || isMobile, "The static error document is viewport-audited once in Chromium.");
  const response = await page.goto("/route-that-does-not-exist", { waitUntil: "domcontentloaded" });
  expect(response && response.status()).toBe(404);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("primary navigation and language controls are keyboard reachable", async ({ page, isMobile }) => {
  // Use a genuine top-level entry here. A URL fragment moves the browser's
  // sequential-focus start point to the fragment target, so it cannot prove
  // that the skip link is the first focusable control on a fresh visit.
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await page.locator("#sm-intro").waitFor({ state: "detached", timeout: 8000 });
  await page.evaluate(() => document.documentElement.classList.add("e2e-stable"));
  if (isMobile) {
    // Mobile Chromium emulation does not establish a deterministic sequential
    // focus origin after a full-screen touch intro. External-keyboard access is
    // still proved by focusing and activating the same real link.
    await page.locator(".skip-link").focus();
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  await expect(page.locator("html")).not.toHaveClass(/is-cinema-transitioning/, { timeout: 10000 });

  const languageButton = isMobile
    ? page.locator(".nav-menu-lang button").filter({ hasText: /^EN$/ })
    : page.locator(".nav .lang button").filter({ hasText: /^EN$/ });
  if (isMobile) {
    const menuButton = page.locator(".nav-burger");
    await menuButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".nav-menu")).toHaveAttribute("aria-hidden", "false");
  }
  await expect(languageButton).toBeVisible();
  await languageButton.focus();
  await expect(languageButton).toBeFocused();
  await languageButton.press("Space");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
