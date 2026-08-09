"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain } = require("./helpers");

test("motion policy is the only tier source and subscriptions can be released", async ({ page }) => {
  await settleMain(page, "#hero");

  const result = await page.evaluate(() => {
    const policy = window.__SM_MOTION_POLICY;
    const sameApi = policy === window.__SM_PERF;
    const before = policy.__debug().subscriberCount;
    let calls = 0;
    const unsubscribe = policy.on(() => { calls += 1; });
    const afterSubscribe = policy.__debug().subscriberCount;
    policy.__set("mid");
    const mid = {
      tier: policy.tier,
      compatibilityTier: window.getDeviceTier(),
      attribute: document.documentElement.getAttribute("data-perf"),
      motionLite: document.documentElement.hasAttribute("data-motion-lite"),
      calls,
    };
    unsubscribe();
    const afterUnsubscribe = policy.__debug().subscriberCount;
    const callsBeforeFinalSet = calls;
    policy.__set("high");
    const callsAfterFinalSet = calls;
    policy.__set("low");
    return {
      sameApi,
      before,
      afterSubscribe,
      afterUnsubscribe,
      callsBeforeFinalSet,
      callsAfterFinalSet,
      mid,
      stateKeys: Object.keys(policy.getState()).sort(),
    };
  });

  expect(result.sameApi).toBe(true);
  expect(result.afterSubscribe).toBe(result.before + 1);
  expect(result.afterUnsubscribe).toBe(result.before);
  expect(result.callsBeforeFinalSet).toBeGreaterThanOrEqual(2);
  expect(result.callsAfterFinalSet).toBe(result.callsBeforeFinalSet);
  expect(result.mid).toMatchObject({
    tier: "mid",
    compatibilityTier: "mid",
    attribute: "mid",
    motionLite: false,
  });
  expect(result.stateKeys).toEqual([
    "documentVisible",
    "longTaskPressure",
    "measuredFps",
    "pointerClass",
    "reducedMotion",
    "saveData",
    "tier",
    "viewportClass",
  ]);
});

test("reduced motion is reactive policy state without removing readable content", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one engine is enough for media-query policy semantics");
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/?policy-contract=1#hero", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });

    const policy = await page.evaluate(() => ({
    state: window.__SM_MOTION_POLICY.getState(),
    allowsMotion: window.__SM_MOTION_POLICY.allows("motion"),
    allowsShader: window.__SM_MOTION_POLICY.allows("shader"),
    perf: document.documentElement.getAttribute("data-perf"),
    motion: document.documentElement.getAttribute("data-motion-policy"),
    motionLite: document.documentElement.hasAttribute("data-motion-lite"),
  }));

  expect(policy.state.reducedMotion).toBe(true);
  expect(policy.state.tier).toBe("low");
  expect(policy.allowsMotion).toBe(false);
  expect(policy.allowsShader).toBe(false);
  expect(policy.perf).toBe("low");
  expect(policy.motion).toBe("reduced");
  expect(policy.motionLite).toBe(true);
  await expect(page.locator(".hero-proof")).toBeVisible();
  await expect(page.locator(".hero-roles")).toContainText("QA");
});

test("motion-lite follows the centralized tier contract", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one engine covers policy attributes");
  await settleMain(page, "#hero");

  const matrix = await page.evaluate(() => {
    const policy = window.__SM_MOTION_POLICY;
    return ["high", "mid", "low"].map((tier) => {
      policy.__set(tier);
      return {
        tier,
        attribute: document.documentElement.getAttribute("data-perf"),
        lite: document.documentElement.hasAttribute("data-motion-lite"),
        motion: policy.allows("motion"),
        shader: policy.allows("shader"),
        heavy: policy.allows("heavy"),
      };
    });
  });

  expect(matrix).toEqual([
    { tier: "high", attribute: "high", lite: false, motion: true, shader: true, heavy: true },
    { tier: "mid", attribute: "mid", lite: false, motion: true, shader: true, heavy: false },
    { tier: "low", attribute: "low", lite: true, motion: false, shader: false, heavy: false },
  ]);
});

test("viewport class follows responsive changes without creating a second tier", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one engine is enough for resize policy semantics");
  await settleMain(page, "#hero");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => window.__SM_MOTION_POLICY.state.viewportClass)).toBe("phone");
  await expect(page.locator("html")).toHaveAttribute("data-viewport", "phone");

  await page.setViewportSize({ width: 1180, height: 800 });
  await expect.poll(() => page.evaluate(() => window.__SM_MOTION_POLICY.state.viewportClass)).toBe("desktop");
  await expect(page.locator("html")).toHaveAttribute("data-viewport", "desktop");
});
