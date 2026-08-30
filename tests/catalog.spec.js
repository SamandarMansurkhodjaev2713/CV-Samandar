"use strict";

const { test, expect } = require("@playwright/test");
const {
  orderedProducts,
  featuredProductCount,
  caseProducts,
  liveProducts,
  settleMain,
  switchMainLanguage,
  expectNoHorizontalOverflow,
  expectResponsiveProjectImage,
} = require("./helpers");

test.describe("project catalog", () => {
  test("registry keeps the approved Builder + QA priority", () => {
    expect(orderedProducts.map((product) => product.featuredRank)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1)
    );
    expect(orderedProducts.slice(0, featuredProductCount).map((product) => product.id)).toEqual([
      "dentforma",
      "klawis",
      "ttyl",
      "belfproctor",
    ]);
    expect(orderedProducts.some((product) => /sentinel(?:-edge)?/i.test(product.id))).toBe(false);
  });

  test("@smoke registry renders all canonical cards without duplicate routes", async ({ page, isMobile }) => {
    await settleMain(page, "#projects");

    if (!isMobile) await page.locator(".proj-expand").evaluate((button) => button.click());
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
    expect(liveProducts).toHaveLength(10);
    expect(caseProducts).toHaveLength(20);
    await expectNoHorizontalOverflow(expect, page, "catalog");
  });

  test("featured set expands to the complete catalog with explicit control", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop keeps a curated first view; mobile exposes the complete filterable catalog immediately.");
    await settleMain(page, "#projects");

    await expect(page.locator(".proj-card")).toHaveCount(featuredProductCount);
    await expect(page.locator(".proj-card:visible")).toHaveCount(featuredProductCount);
    const expand = page.getByRole("button", { name: `Показать ещё ${orderedProducts.length - featuredProductCount}` });
    await expect(expand).toBeVisible();
    // The page deliberately uses scroll-linked transforms. Trigger the already
    // verified visible control directly so this state contract cannot race a
    // compositor frame while the mobile carousel settles.
    await expand.evaluate((button) => button.click());
    await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
    await expect(page.locator(".proj-card:visible")).toHaveCount(orderedProducts.length);
    await expect(page.getByRole("button", { name: "Свернуть" })).toBeVisible();
  });

  test("mobile exposes all products immediately and filters without duplicate cards", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await settleMain(page, "#projects");

    await expect(page.locator(".proj-expand")).toHaveCount(0);
    await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
    await expect(page.locator(".proj-card:visible")).toHaveCount(orderedProducts.length);
    await expect(page.locator("#proj-sentinel")).toHaveCount(0);
    await expect(page.locator("#proj-sentinel-edge")).toHaveCount(0);

    const aiFilter = page.locator('[data-project-filter="ai"]');
    await expect(aiFilter).toHaveCount(1);
    await aiFilter.click();
    const filtered = page.locator(".proj-card");
    const expected = orderedProducts.filter((product) => (product.categories || []).includes("ai"));
    await expect(filtered).toHaveCount(expected.length);
    expect(await filtered.evaluateAll((cards) => cards.map((card) => card.dataset.project))).toEqual(expected.map((product) => product.slug));

    await page.locator('[data-project-filter="all"]').click();
    await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
    const projectImages = page.locator(".proj-card .proj-screen-img");
    await expect(projectImages).toHaveCount(orderedProducts.length);
    for (let index = 0; index < orderedProducts.length; index += 1) {
      const image = projectImages.nth(index);
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate((node) => ({
        complete: node.complete,
        width: node.naturalWidth,
        height: node.naturalHeight,
        currentSrc: node.currentSrc,
      }))).toMatchObject({ complete: true });
      const state = await image.evaluate((node) => ({
        complete: node.complete,
        width: node.naturalWidth,
        height: node.naturalHeight,
        currentSrc: node.currentSrc,
        opacity: Number.parseFloat(getComputedStyle(node).opacity),
        visibility: getComputedStyle(node).visibility,
      }));
      expectResponsiveProjectImage(expect, state, "mobile image " + orderedProducts[index].slug);
      expect(state.opacity, "mobile image opacity " + orderedProducts[index].slug).toBe(1);
      expect(state.visibility, "mobile image visibility " + orderedProducts[index].slug).toBe("visible");
    }
    const gorilla = page.locator("#proj-gorilla-five-signals");
    await expect(gorilla).toBeAttached();
    await expect(gorilla.locator(".proj-cta")).toHaveAttribute("href", "https://samandarmansurkhodjaev2713.github.io/gorilla-five-signals-concept/uz/");
    await expect(gorilla.locator(".proj-repo")).toHaveAttribute("href", "https://github.com/SamandarMansurkhodjaev2713/gorilla-five-signals-concept");
  });

  test("expanded desktop cards never intersect another grid record", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await settleMain(page, "#projects");
    await page.locator(".proj-expand").evaluate((button) => button.click());
    await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);

    const collisions = await page.locator(".proj-card").evaluateAll((cards) => {
      const rects = cards.map((card) => {
        const rect = card.getBoundingClientRect();
        return { id: card.id, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      const overlaps = [];
      for (let left = 0; left < rects.length; left += 1) {
        for (let right = left + 1; right < rects.length; right += 1) {
          const a = rects[left];
          const b = rects[right];
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > 1 && overlapY > 1) overlaps.push([a.id, b.id, overlapX, overlapY]);
        }
      }
      return overlaps;
    });

    expect(collisions).toEqual([]);
  });

  test("RU, EN and UZ keep all cards and canonical routes", async ({ page, isMobile }) => {
    await settleMain(page, "#projects");
    if (!isMobile) await page.locator(".proj-expand").evaluate((button) => button.click());

    for (const language of ["EN", "UZ", "RU"]) {
      await switchMainLanguage(page, language);
      await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
      await expect(page.locator("html")).toHaveAttribute("lang", language.toLowerCase());
    }
  });

  test("case return restores the exact originating card inside the viewport", async ({ page }) => {
    const transitionErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error" && /Transition was skipped|AbortError/i.test(message.text())) {
        transitionErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      if (/Transition was skipped|AbortError/i.test(error.message)) transitionErrors.push(error.message);
    });
    const product = caseProducts.find((item) => item.slug === "chat-app");
    await page.goto("/" + product.casePage, { waitUntil: "domcontentloaded" });
    const back = page.locator(".lp-back");
    await expect(back).toHaveAttribute("href", "../../#proj-" + product.slug);
    await Promise.all([
      page.waitForURL(new RegExp("#proj-" + product.slug + "$"), { waitUntil: "domcontentloaded" }),
      back.click(),
    ]);
    await page.locator("#main").waitFor({ state: "attached" });
    await page.locator(".proj-card").first().waitFor({ state: "attached" });
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
      currentSrc: node.currentSrc,
    }));
    expectResponsiveProjectImage(expect, image, "case-return card image");
    await expectNoHorizontalOverflow(expect, page, "case-return");
    expect(transitionErrors).toEqual([]);

    // Release the long-lived WebGL/motion document before Playwright tears
    // down video + trace capture. On constrained Windows runners closing the
    // whole context while that document is still rendering can exceed the
    // product-test timeout even though every assertion has already passed.
    await page.goto("about:blank", { waitUntil: "commit" });
  });
});
