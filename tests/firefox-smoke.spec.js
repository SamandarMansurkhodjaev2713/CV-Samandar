"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, switchMainLanguage, expectNoHorizontalOverflow } = require("./helpers");

test.describe("Firefox release smoke", () => {
  test("main catalog, navigation and language controls remain functional", async ({ page }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await settleMain(page, "#projects");
    await expect(page.locator(".proj-card")).toHaveCount(25);
    await expect(page.locator(".proj-card:visible")).toHaveCount(4);

    await page.getByRole("button", { name: /Показать ещё 21/ }).click();
    await expect(page.locator(".proj-card:visible")).toHaveCount(25);

    await switchMainLanguage(page, "EN");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#projects .sec-head h2")).toContainText("Featured projects");
    await expectNoHorizontalOverflow(expect, page, "Firefox main");
    expect(pageErrors).toEqual([]);
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
