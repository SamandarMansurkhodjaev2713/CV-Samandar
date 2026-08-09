"use strict";

const { test, expect } = require("@playwright/test");

async function settleMotion(page, query = "motion-contract=1") {
  await page.goto(`/?${query}#hero`, { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await expect.poll(() => page.evaluate(() => Boolean(window.Motion && window.Motion.__debug().initialized))).toBe(true);
  // A hashed first load intentionally owns scroll until late font/pin layout
  // settles. Do not make a second programmatic scroll race that transaction.
  await expect(page.locator("html")).toHaveAttribute("data-deep-link-settled", "hero", { timeout: 9000 });
}

test("authored motion uses two shared runtime subscribers and individual magnetic translate", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop fine pointer owns the magnetic interaction");
  await settleMotion(page);

  const before = await page.evaluate(() => window.Motion.__debug());
  expect(before.runtimeSubscribers.sort()).toEqual(["authored-cursor", "scroll-composition"]);
  expect(before.cursor).toBe(true);

  const button = page.locator(".hero-ctas [data-magnetic]").first();
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box.x + box.width / 2 + Math.min(12, box.width / 5), box.y + box.height / 2);
  await expect.poll(() => button.evaluate((element) => element.style.getPropertyValue("--mag-x"))).not.toBe("0.00px");

  const transformOwnership = await button.evaluate((element) => ({
    inlineTransform: element.style.transform,
    magneticX: element.style.getPropertyValue("--mag-x"),
    magneticY: element.style.getPropertyValue("--mag-y"),
    computedTranslate: getComputedStyle(element).translate,
  }));
  expect(transformOwnership.inlineTransform).toBe("");
  expect(transformOwnership.magneticX).toMatch(/px$/);
  expect(transformOwnership.magneticY).toMatch(/px$/);
  expect(transformOwnership.computedTranslate).not.toBe("none");

  await expect.poll(() => page.evaluate(() => window.Motion.__debug().cursorMoving)).toBe(false);
  const settledCursor = await page.locator(".sc-ring").evaluate((element) => ({
    inlineTransform: element.style.transform,
    x: element.style.getPropertyValue("--sc-ring-x"),
    y: element.style.getPropertyValue("--sc-ring-y"),
    computedTransform: getComputedStyle(element).transform,
  }));
  expect(settledCursor.inlineTransform).toBe("");
  expect(settledCursor.x).toMatch(/px$/);
  expect(settledCursor.y).toMatch(/px$/);
  expect(settledCursor.computedTransform).not.toBe("none");
});

test("parallax measures only elements near the viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop owns authored parallax");
  await settleMotion(page);

  await expect.poll(() => page.evaluate(() => window.Motion.__debug().activeParallax)).toBeGreaterThan(0);
  const debug = await page.evaluate(() => window.Motion.__debug());
  expect(debug.parallax).toBeGreaterThan(debug.activeParallax);
  expect(debug.measuredMagnets).toBe(debug.magnets);
});

test("offscreen sections pause decorative timelines and resume before entry", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one browser owns observer scheduling semantics");
  await settleMotion(page);

  const candidate = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll("section[data-section]:not(.is-motion-near)"));
    for (const section of sections.reverse()) {
      const animated = Array.from(section.querySelectorAll("*")).find((element) => {
        const style = getComputedStyle(element);
        return style.animationName !== "none" && style.animationDuration !== "0s";
      });
      if (animated) {
        animated.setAttribute("data-e2e-offscreen-animation", "true");
        return { id: section.id, playState: getComputedStyle(animated).animationPlayState };
      }
    }
    return null;
  });

  expect(candidate).not.toBeNull();
  expect(candidate.playState).toBe("paused");
  const section = page.locator("#" + candidate.id);
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveClass(/is-motion-near/);
  await expect.poll(() => page.locator('[data-e2e-offscreen-animation="true"]').evaluate((element) => getComputedStyle(element).animationPlayState)).toBe("running");
});

test("Motion dispose and re-init leave no orphaned subscribers or hidden content", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "lifecycle semantics are engine-independent");
  await settleMotion(page);

  const result = await page.evaluate(() => {
    const runtime = window.__SM_MOTION_RUNTIME;
    window.Motion.dispose();
    const afterDispose = {
      motion: window.Motion.__debug(),
      runtime: runtime.__debug(),
      cursorCount: document.querySelectorAll(".sc-cursor").length,
      hiddenRevealCount: document.querySelectorAll(".rv-bound:not(.rv-in)").length,
      hiddenSectionCount: document.querySelectorAll("section.sec-bound:not(.sec-in)").length,
    };
    window.Motion.init();
    const afterInit = {
      motion: window.Motion.__debug(),
      runtime: runtime.__debug(),
      cursorCount: document.querySelectorAll(".sc-cursor").length,
    };
    return { afterDispose, afterInit };
  });

  expect(result.afterDispose.motion.initialized).toBe(false);
  expect(result.afterDispose.runtime.subscriberIds).not.toContain("authored-cursor");
  expect(result.afterDispose.runtime.subscriberIds).not.toContain("scroll-composition");
  expect(result.afterDispose.cursorCount).toBe(0);
  expect(result.afterDispose.hiddenRevealCount).toBe(0);
  expect(result.afterDispose.hiddenSectionCount).toBe(0);

  expect(result.afterInit.motion.initialized).toBe(true);
  expect(result.afterInit.motion.runtimeSubscribers.sort()).toEqual(["authored-cursor", "scroll-composition"]);
  expect(result.afterInit.cursorCount).toBe(1);
  expect(result.afterInit.runtime.subscriberIds.filter((id) => id === "authored-cursor")).toHaveLength(1);
  expect(result.afterInit.runtime.subscriberIds.filter((id) => id === "scroll-composition")).toHaveLength(1);
});

test("reduced motion and mobile keep content visible without a cursor imitation", async ({ page }, testInfo) => {
  if (testInfo.project.name === "desktop-chromium") {
    await page.emulateMedia({ reducedMotion: "reduce" });
  }
  await settleMotion(page, "motion-accessible=1");

  const state = await page.evaluate(() => ({
    policy: window.__SM_MOTION_POLICY.getState(),
    motion: window.Motion.__debug(),
    cursorCount: document.querySelectorAll(".sc-cursor").length,
    hiddenRevealCount: document.querySelectorAll(".rv-bound:not(.rv-in)").length,
    hiddenSectionCount: document.querySelectorAll("section.sec-bound:not(.sec-in)").length,
    hiddenVisibleRevealCount: Array.from(document.querySelectorAll(".rv-bound:not(.rv-in)")).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= window.innerHeight;
    }).length,
    hiddenVisibleSectionCount: Array.from(document.querySelectorAll("section.sec-bound:not(.sec-in)")).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom >= 0 && rect.top <= window.innerHeight;
    }).length,
  }));

  if (testInfo.project.name === "desktop-chromium") expect(state.policy.reducedMotion).toBe(true);
  if (testInfo.project.name === "mobile-chromium") expect(state.policy.pointerClass).toBe("coarse");
  expect(state.motion.cursor).toBe(false);
  expect(state.cursorCount).toBe(0);
  expect(state.hiddenVisibleRevealCount).toBe(0);
  expect(state.hiddenVisibleSectionCount).toBe(0);
  if (state.policy.reducedMotion) {
    expect(state.hiddenRevealCount).toBe(0);
    expect(state.hiddenSectionCount).toBe(0);
  }
});
