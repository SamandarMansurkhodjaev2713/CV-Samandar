"use strict";

const { test, expect } = require("@playwright/test");
const { orderedProducts, settleMain, switchMainLanguage, expectNoHorizontalOverflow } = require("./helpers");

test.describe("Firefox release smoke", () => {
  // Windows may need tens of seconds to hand a real compositor window to the
  // Playwright page fixture while another local product stack is active. This
  // budget covers browser setup/teardown only; every navigation, visibility,
  // catalog, locale and overflow assertion keeps its normal strict timeout.
  test.describe.configure({ timeout: process.platform === "win32" ? 120000 : 45000 });

  test("main catalog, navigation and language controls remain functional", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await settleMain(page, "#projects");
    await expect(page.locator(".proj-card")).toHaveCount(4);
    await expect(page.locator(".proj-card:visible")).toHaveCount(4);

    await page.getByRole("button", { name: /Показать ещё 25/ }).click();
    await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
    await expect(page.locator(".proj-card:visible")).toHaveCount(orderedProducts.length);

    await switchMainLanguage(page, "EN");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#projects .sec-head h2")).toContainText("Featured projects");
    await expectNoHorizontalOverflow(expect, page, "Firefox main");
    expect(pageErrors).toEqual([]);

    // The Windows Firefox release profile uses the basic compositor and the
    // production no-WebGL fallback, so Playwright remains the sole lifecycle
    // owner. A manual `about:blank` hand-off here races Firefox SessionStore
    // against context teardown and can fail after every product assertion has
    // already passed.
  });

  test("static product case preserves chapter and locale navigation", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/projects/ttyl/#system", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".lp-title")).toHaveText("TTYL Platform");
    await expect(page.locator('[data-lp-chapter="system"]')).toBeVisible();
    await expect(page.locator("[data-lp-chapter-link].is-active")).toHaveAttribute("data-lp-chapter-link", "system");

    await page.locator('.lp-lang-btn[data-lang="uz"]').click();
    await expect(page).toHaveURL(/\/projects\/ttyl\/uz\/#system$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "uz");
    await expectNoHorizontalOverflow(expect, page, "Firefox case");
    expect(pageErrors).toEqual([]);
  });
});
