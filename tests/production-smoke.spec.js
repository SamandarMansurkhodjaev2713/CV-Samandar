"use strict";

const { test, expect } = require("@playwright/test");
const PRODUCTS = require("../src/content/product-registry.js");

const ENABLED = process.env.PRODUCTION_SMOKE === "1";
const BASE = new URL(
  process.env.PRODUCTION_BASE_URL ||
  "https://samandarmansurkhodjaev2713.github.io/CV-Samandar/"
);
const CASES = PRODUCTS.filter((product) => product.presentation === "case");

function url(relative) {
  return new URL(relative, BASE).toString();
}

test.describe("deployed portfolio smoke", () => {
  test.skip(!ENABLED, "Run explicitly with npm run test:production");

  test("production main mounts the complete canonical catalog without runtime errors", async ({ page }) => {
    const failures = [];
    page.on("pageerror", (error) => failures.push("pageerror: " + error.message));
    page.on("response", (response) => {
      if (response.status() < 400) return;
      const failedUrl = response.url();
      // GitHub telemetry is optional and has a tested static 403/rate-limit
      // fallback. Any failed first-party production asset is release-blocking.
      if (new URL(failedUrl).hostname === "api.github.com") return;
      failures.push("HTTP " + response.status() + ": " + failedUrl);
    });

    await page.goto(url("./?production-smoke=1#projects"), { waitUntil: "domcontentloaded" });
    await page.locator("#main").waitFor({ state: "attached" });
    await expect(page.locator("#sm-intro")).toHaveCount(0);
    const expand = page.locator(".proj-expand");
    if (await expand.count()) await expand.click();
    await expect(page.locator(".proj-card")).toHaveCount(PRODUCTS.length);
    await expect(page.locator("#proj-ttyl")).toBeVisible();
    expect(failures).toEqual([]);
  });

  test("every generated RU, EN and UZ case route returns its localized static shell", async ({ request }) => {
    const routes = [];
    for (const product of CASES) {
      routes.push({ product, locale: "ru", path: product.casePage });
      routes.push({ product, locale: "en", path: product.casePage + "en/" });
      routes.push({ product, locale: "uz", path: product.casePage + "uz/" });
    }

    for (let offset = 0; offset < routes.length; offset += 6) {
      const batch = routes.slice(offset, offset + 6);
      const results = await Promise.all(batch.map(async (route) => {
        const response = await request.get(url(route.path));
        return { route, response, html: await response.text() };
      }));
      for (const result of results) {
        expect(result.response.status(), result.route.path).toBe(200);
        expect(result.html, result.route.path).toMatch(
          new RegExp("<html[^>]*\\slang=[\"']" + result.route.locale + "[\"']", "i")
        );
        expect(result.html, result.route.path).toContain('class="lp-page lp-page--' + result.route.product.slug + '"');
      }
    }
    expect(routes).toHaveLength(48);
  });

  test("a deployed case returns to the exact originating project card without replaying intro", async ({ page }) => {
    await page.goto(url("projects/ttyl/"), { waitUntil: "domcontentloaded" });
    await expect(page.locator("#lp-root .lp-page--ttyl")).toBeVisible();
    await page.locator(".lp-back").click();
    await expect(page).toHaveURL(/#proj-ttyl$/);
    await expect(page.locator("#sm-intro")).toHaveCount(0);
    const card = page.locator("#proj-ttyl");
    await expect(card).toBeVisible();
    await expect.poll(() => card.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < innerHeight;
    })).toBe(true);
  });
});
