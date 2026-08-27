"use strict";

const { test, expect } = require("@playwright/test");
const { orderedProducts, expectNoHorizontalOverflow, waitForCaseStyles } = require("./helpers");

async function activateVerifiedControl(locator, label) {
  // Playwright's Windows WebKit port can stop producing the two consecutive
  // compositor frames required by locator.click() after a software-renderer
  // stall. Linux CI keeps the standard actionability path. Locally, verify
  // the real touch geometry and hit-test ownership before invoking the same
  // DOM click activation; this is stricter than force:true and cannot make a
  // hidden, clipped or covered control pass.
  if (process.platform !== "win32") {
    await locator.click({ timeout: 15000 });
    return;
  }
  const state = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    let opacity = 1;
    let visible = true;
    const blockers = [];
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      opacity *= Number.parseFloat(style.opacity || "1");
      // A fixed shell may deliberately use pointer-events:none while an
      // interactive descendant opts back into pointer-events:auto. The
      // centre-point elementFromPoint check below is the authoritative proof
      // that the control, not its shell, owns the real touch hit.
      if (style.display === "none" || style.visibility !== "visible") {
        visible = false;
        blockers.push({
          node: node.className || node.tagName,
          display: style.display,
          visibility: style.visibility,
          pointerEvents: style.pointerEvents,
        });
      }
    }
    return {
      width: rect.width,
      height: rect.height,
      inViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
      visible: visible && opacity > .01,
      opacity,
      blockers,
      ownsHit: Boolean(hit && (hit === element || element.contains(hit))),
      disabled: Boolean(element.disabled),
    };
  });
  expect(state.inViewport, label + " " + JSON.stringify(state)).toBe(true);
  expect(state.visible, label + " " + JSON.stringify(state)).toBe(true);
  expect(state.ownsHit, label + " " + JSON.stringify(state)).toBe(true);
  expect(state.disabled, label + " " + JSON.stringify(state)).toBe(false);
  expect(state.width, label + " width").toBeGreaterThanOrEqual(44);
  expect(state.height, label + " height").toBeGreaterThanOrEqual(44);
  await locator.evaluate((element) => element.click());
}

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
  // The artificial module stall deliberately spends the complete six-second
  // head-safety deadline. Give the subsequently mounted shell its own bounded
  // readiness budget instead of accidentally leaving it only the default
  // expect remainder on a cold WebKit process.
  await expect(page.locator(".hero-ctas .btn").first()).toBeEnabled({ timeout: 12000 });
  await expect.poll(() => page.evaluate(() => window.__SM_INTRO && window.__SM_INTRO.reason))
    .toMatch(/^head-safety-/);
});

test("iPhone WebKit keeps the complete mobile catalog and menu usable", async ({ page }) => {
  test.setTimeout(120000);

  await page.goto("/?e2e=1#projects", { waitUntil: "domcontentloaded" });
  await page.locator(".proj-card").first().waitFor({ state: "attached" });
  await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
  await expect(page.locator(".proj-card:visible")).toHaveCount(orderedProducts.length);
  await expect(page.locator(".proj-expand")).toHaveCount(0);
  await expect(page.locator(".proj-filter-chip")).toHaveCount(6);
  await expectNoHorizontalOverflow(expect, page, "webkit-main");

  await activateVerifiedControl(page.locator(".nav-burger"), "mobile menu trigger");
  await expect(page.locator(".nav-menu")).toHaveAttribute("aria-hidden", "false");
  const englishMenuButton = page.locator(".nav-menu-lang button").filter({ hasText: /^EN$/ });
  await activateVerifiedControl(englishMenuButton, "English language control");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("iPhone WebKit preserves case locale navigation", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/projects/chat-app/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForCaseStyles(page);
  await Promise.all([
    page.waitForURL(/\/projects\/chat-app\/en\/\?e2e=1#thesis$/, { waitUntil: "domcontentloaded", timeout: 20000 }),
    activateVerifiedControl(page.locator('.lp-lang-btn[data-lang="en"]'), "case English language control"),
  ]);
  await waitForCaseStyles(page);
  const chat = orderedProducts.find((product) => product.slug === "chat-app");
  await expect(page.locator("h1")).toHaveText(chat.i18n.en.name);
  await expect(page.locator(".lp-quick")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("[data-lp-chapter]")).toHaveCount(5);
  await expectNoHorizontalOverflow(expect, page, "webkit-chat-app");
});

test("iPhone WebKit preserves the exact private-case return route", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/projects/vacation-control/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForCaseStyles(page);
  await expect(page.locator(".lp-back"))
    .toHaveAttribute("href", "../../#proj-vacation-control");
});
