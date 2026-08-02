"use strict";

const { test, expect } = require("@playwright/test");
const {
  orderedProducts,
  caseProducts,
  liveProducts,
  settleMain,
  expectNoHorizontalOverflow,
} = require("./helpers");

test.describe("project catalog", () => {
  test("@smoke registry renders all canonical cards without duplicate routes", async ({ page }) => {
    await settleMain(page, "#projects");

    const cards = page.locator(".proj-card");
    await expect(cards).toHaveCount(orderedProducts.length);

    const state = await cards.evaluateAll((nodes) => nodes.map((card) => ({
      id: card.id,
      href: card.querySelector(".proj-cta") && card.querySelector(".proj-cta").getAttribute("href"),
      github: card.querySelector(".proj-repo") && card.querySelector(".proj-repo").getAttribute("href"),
    })));

    expect(state.map((item) => item.id)).toEqual(orderedProducts.map((p) => "proj-" + p.slug));
    expect(state.map((item) => item.href)).toEqual(
      orderedProducts.map((p) => p.presentation === "live" ? p.liveUrl : p.casePage)
    );
    expect(new Set(state.map((item) => item.href)).size).toBe(orderedProducts.length);
    expect(liveProducts).toHaveLength(9);
    expect(caseProducts).toHaveLength(15);
    await expectNoHorizontalOverflow(expect, page, "catalog");
  });

  test("featured set expands to the complete catalog with explicit control", async ({ page }) => {
    await settleMain(page, "#projects");

    await expect(page.locator(".proj-card:visible")).toHaveCount(4);
    const expand = page.getByRole("button", { name: "Показать ещё 20" });
    await expect(expand).toBeVisible();
    // The page deliberately uses scroll-linked transforms. Trigger the already
    // verified visible control directly so this state contract cannot race a
    // compositor frame while the mobile carousel settles.
    await expand.evaluate((button) => button.click());
    await expect(page.locator(".proj-card:visible")).toHaveCount(orderedProducts.length);
    await expect(page.getByRole("button", { name: "Свернуть" })).toBeVisible();
  });

  test("RU, EN and UZ keep all cards and canonical routes", async ({ page, isMobile }) => {
    await settleMain(page, "#projects");
    if (isMobile) {
      await page.locator(".nav-burger").evaluate((button) => button.click());
      await expect(page.locator(".nav-menu")).toHaveAttribute("aria-hidden", "false");
    }

    for (const language of ["EN", "UZ", "RU"]) {
      const button = isMobile
        ? page.locator(".nav-menu-lang button").filter({ hasText: new RegExp("^" + language + "$") })
        : page.locator(".nav .lang button").filter({ hasText: new RegExp("^" + language + "$") });
      await button.evaluate((node) => node.click());
      await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
      await expect(page.locator("html")).toHaveAttribute("lang", language.toLowerCase());
    }
  });

  test("case return restores the exact originating card inside the viewport", async ({ page }) => {
    const product = caseProducts.find((item) => item.slug === "chat-app");
    await page.goto("/" + product.casePage, { waitUntil: "domcontentloaded" });
    const back = page.locator(".lp-back");
    await expect(back).toHaveAttribute("href", "../../#proj-" + product.slug);
    await back.click();
    await expect(page).toHaveURL(new RegExp("#proj-" + product.slug + "$"));
    const card = page.locator("#proj-" + product.slug);
    await expect(card).toBeVisible();
    await expect(page.locator("#sm-intro")).toHaveCount(0);
    await expect(page.locator(".proj-card:visible")).toHaveCount(orderedProducts.length);
    await expect.poll(async () => card.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    })).toBe(true);

    const image = await card.locator("img").evaluate((node) => ({
      complete: node.complete,
      width: node.naturalWidth,
      height: node.naturalHeight,
    }));
    expect(image).toEqual({ complete: true, width: 1536, height: 512 });
    await expectNoHorizontalOverflow(expect, page, "case-return");
  });
});
