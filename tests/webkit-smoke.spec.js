"use strict";

const { test, expect } = require("@playwright/test");
const { orderedProducts, expectNoHorizontalOverflow } = require("./helpers");

test("iPhone WebKit releases the first-load intro into an interactive Hero", async ({ page }) => {
  test.setTimeout(60000);

  await page.addInitScript(() => {
    window.__WEBKIT_INTRO = { frame: null, done: 0 };
    const observer = new MutationObserver(() => {
      const panel = document.getElementById("sm-intro");
      if (panel && !window.__WEBKIT_INTRO.frame) {
        window.__WEBKIT_INTRO.frame = {
          mode: panel.getAttribute("data-intro-mode"),
          role: panel.getAttribute("role"),
          lock: document.documentElement.classList.contains("intro-lock"),
        };
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    window.addEventListener("sm:intro-done", () => {
      window.__WEBKIT_INTRO.done += 1;
    });
  });

  await page.goto("/?webkit-intro=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#sm-intro")).toHaveCount(0, { timeout: 6000 });
  await expect(page.locator("html")).not.toHaveClass(/intro-lock/);
  await expect(page.locator("#root")).not.toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#hero")).toHaveClass(/is-lit/);
  await expect(page.locator(".hero-ctas .btn").first()).toBeEnabled();

  const contract = await page.evaluate(() => window.__WEBKIT_INTRO);
  expect(contract.frame).toMatchObject({ mode: "full", role: "dialog", lock: true });
  expect(contract.done).toBe(1);
});

test("iPhone WebKit head safety releases a stalled authored intro module", async ({ page }) => {
  test.setTimeout(60000);

  await page.route("**/src/engine/intro.js?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript; charset=utf-8",
      body: "window.__SM_INTRO.__started = true;",
    });
  });

  // Deterministic low-tier mode isolates the safety timer from optional motion
  // work while exercising the exact production head-boot implementation.
  await page.goto("/?e2e=1&webkit-stalled-intro=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#sm-intro")).toHaveCount(0, { timeout: 6000 });
  await expect(page.locator("html")).not.toHaveClass(/intro-lock/);
  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.locator(".hero-ctas .btn").first()).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.__SM_INTRO && window.__SM_INTRO.reason))
    .toMatch(/^head-safety-/);
});

test("iPhone WebKit keeps the critical portfolio journey usable", async ({ page }) => {
  test.setTimeout(120000);

  await page.goto("/?e2e=1#projects", { waitUntil: "domcontentloaded" });
  await page.locator(".proj-card").first().waitFor({ state: "attached" });
  await expect(page.locator(".proj-card")).toHaveCount(4);
  await expect(page.locator(".proj-card:visible")).toHaveCount(4);
  await expectNoHorizontalOverflow(expect, page, "webkit-main");

  const expand = page.locator(".proj-expand");
  await expect(expand).toBeVisible();
  await expand.evaluate((button) => button.click());
  await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
  await expect(page.locator(".proj-card:visible")).toHaveCount(orderedProducts.length);

  await page.locator(".nav-burger").click();
  await expect(page.locator(".nav-menu")).toHaveAttribute("aria-hidden", "false");
  await page.locator(".nav-menu-lang button").filter({ hasText: /^EN$/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/projects/chat-app/?e2e=1", { waitUntil: "domcontentloaded" });
  await page.locator('.lp-lang-btn[data-lang="en"]').evaluate((link) => link.click());
  await expect(page).toHaveURL(/\/projects\/chat-app\/en\/\?e2e=1#thesis$/);
  const chat = orderedProducts.find((product) => product.slug === "chat-app");
  await expect(page.locator("h1")).toHaveText(chat.i18n.en.name);
  await expect(page.locator(".lp-quick")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("[data-lp-chapter]")).toHaveCount(5);
  await expectNoHorizontalOverflow(expect, page, "webkit-chat-app");

  await page.goto("/projects/vacation-control/?e2e=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".lp-back"))
    .toHaveAttribute("href", "../../#proj-vacation-control");
});
