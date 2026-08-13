"use strict";

const { test, expect } = require("@playwright/test");
const {
  caseProducts,
  expectNoHorizontalOverflow,
  expectResponsiveProjectImage,
} = require("./helpers");

for (const product of caseProducts) {
  test(product.slug + " has complete generated structure", async ({ page, isMobile }) => {
    test.skip(isMobile, "Complete route sweep runs once on desktop; mobile geometry is covered in one shared sweep.");
    const response = await page.goto("/" + product.casePage, { waitUntil: "domcontentloaded" });
    expect(response && response.status()).toBe(200);
    await expect(page.locator("h1")).toHaveText(product.i18n.ru.name);
    await expect(page.locator(".lp-back")).toHaveAttribute("href", "../../#proj-" + product.slug);
    await expect(page.locator("[data-lp-chapter]")).toHaveCount(5);
    await expect(page.locator(".lp-quick-item")).toHaveCount(3);

    const image = page.locator("img").first();
    await expect(image).toBeVisible();
    const dimensions = await image.evaluate((node) => ({
      complete: node.complete,
      width: node.naturalWidth,
      height: node.naturalHeight,
      currentSrc: node.currentSrc,
    }));
    expectResponsiveProjectImage(expect, dimensions, product.slug + " hero image");
    await expectNoHorizontalOverflow(expect, page, product.slug);
  });
}

test("all case pages fit the mobile viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Mobile-only geometry sweep.");
  test.setTimeout(180000);
  for (const product of caseProducts) {
    await test.step(product.slug, async () => {
      await page.goto("/" + product.casePage, { waitUntil: "domcontentloaded" });
      await expect(page.locator("h1")).toHaveText(product.i18n.ru.name);
      await expect(page.locator("img").first()).toBeVisible();
      await expectNoHorizontalOverflow(expect, page, product.slug);
    });
  }
});

test("new cases switch RU / EN / UZ without losing chapter or route", async ({ page, isMobile }) => {
  test.skip(isMobile, "Runtime language behavior is viewport-independent and covered once.");
  for (const slug of ["vacation-control", "b24-sales-analyst", "chat-app", "birthday-agent"]) {
    const product = caseProducts.find((item) => item.slug === slug);
    await test.step(slug, async () => {
      await page.goto("/" + product.casePage + "#system", { waitUntil: "domcontentloaded" });
      await page.locator('.lp-lang-btn[data-lang="en"]').click();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page).toHaveURL(new RegExp("/" + product.casePage + "en/#system$"));
      await expect(page).toHaveURL(/#system$/);
      await expect(page.locator("h1")).toHaveText(product.i18n.en.name);

      await page.locator('.lp-lang-btn[data-lang="uz"]').click();
      await expect(page.locator("html")).toHaveAttribute("lang", "uz");
      await expect(page).toHaveURL(new RegExp("/" + product.casePage + "uz/#system$"));
      await expect(page).toHaveURL(/#system$/);
      await expect(page.locator("h1")).toHaveText(product.i18n.uz.name);
      await expect(page.locator(".lp-back")).toHaveAttribute("href", "../../../#proj-" + product.slug);
    });
  }
});

test("case locale navigation cannot be trapped by a throttled background exit timer", async ({ page, isMobile }) => {
  test.skip(isMobile, "The native locale fallback is engine and viewport independent.");
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, "hasFocus", {
      configurable: true,
      value: () => false,
    });
  });
  await page.goto("/projects/ttyl/#system", { waitUntil: "domcontentloaded" });
  await page.locator('.lp-lang-btn[data-lang="uz"]').click();
  await expect(page).toHaveURL(/\/projects\/ttyl\/uz\/#system$/, { timeout: 4000 });
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await expect(page.locator("html")).not.toHaveAttribute("aria-busy", "true");
});

test("every direct system deep link resolves the exact sticky chapter", async ({ page }) => {
  test.setTimeout(180000);
  for (const product of caseProducts) {
    await test.step(product.slug, async () => {
      await page.goto("/" + product.casePage + "#system", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".lp-current-index")).toHaveText("03");
      await expect(page.locator('[data-lp-chapter-link="system"]')).toHaveAttribute("aria-current", "location");
      await expect(page).toHaveURL(/#system$/);
    });
  }
});

test("scroll spy, language switch and reload preserve the reader chapter", async ({ page }) => {
  const product = caseProducts.find((item) => item.slug === "chat-app");
  await page.goto("/" + product.casePage + "#system", { waitUntil: "domcontentloaded" });
  await page.locator('[data-lp-chapter="evidence"]').scrollIntoViewIfNeeded();
  await expect(page.locator(".lp-current-index")).toHaveText("04");
  await expect(page.locator('[data-lp-chapter-link="evidence"]')).toHaveAttribute("aria-current", "location");
  await expect(page).toHaveURL(/#evidence$/);

      await page.locator('.lp-lang-btn[data-lang="en"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".lp-current-index")).toHaveText("04");
  await expect(page).toHaveURL(/#evidence$/);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".lp-current-index")).toHaveText("04");
  await expect(page.locator('[data-lp-chapter-link="evidence"]')).toHaveAttribute("aria-current", "location");
});
