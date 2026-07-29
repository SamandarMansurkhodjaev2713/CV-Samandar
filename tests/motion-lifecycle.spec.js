"use strict";

const { test, expect } = require("@playwright/test");

async function settleMotion(page, query = "motion-contract=1") {
  await page.goto(`/?${query}#hero`, { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await expect.poll(() => page.evaluate(() => Boolean(window.Motion && window.Motion.__debug().initialized))).toBe(true);
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
