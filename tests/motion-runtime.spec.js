"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain } = require("./helpers");

test("motion runtime executes strict frame phases and releases subscribers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "scheduler semantics are engine-independent");
  await settleMain(page, "#hero");

  const result = await page.evaluate(async () => {
    const runtime = window.__SM_MOTION_RUNTIME;
    const before = runtime.__debug().subscriberCount;
    const phases = [];
    const unsubscribe = runtime.subscribe({
      id: "e2e-phase-order",
      priority: 10,
      continuous: false,
      measure: () => phases.push("measure"),
      compute: () => phases.push("compute"),
      mutate: () => phases.push("mutate"),
      render: () => phases.push("render"),
    });
    runtime.wake("e2e-phase-order");
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const during = runtime.__debug();
    unsubscribe();
    const after = runtime.__debug();
    return { before, phases, during, after };
  });

  expect(result.phases.slice(0, 4)).toEqual(["measure", "compute", "mutate", "render"]);
  expect(result.during.subscriberCount).toBe(result.before + 1);
  expect(result.during.subscriberIds).toContain("e2e-phase-order");
  expect(result.after.subscriberCount).toBe(result.before);
  expect(result.after.subscriberIds).not.toContain("e2e-phase-order");
});

test("one input stream publishes pointer and viewport state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one browser covers input aggregation");
  await settleMain(page, "#hero");

  await page.evaluate(() => {
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 321,
      clientY: 234,
      pointerType: "mouse",
    }));
  });
  await expect.poll(() => page.evaluate(() => window.__SM_MOTION_RUNTIME.input.pointerX)).toBe(321);
  const input = await page.evaluate(() => ({ ...window.__SM_MOTION_RUNTIME.input }));
  expect(input.pointerY).toBe(234);
  expect(input.pointerType).toBe("mouse");
  expect(input.pointerActive).toBe(true);
  expect(input.viewportWidth).toBe(1440);
  expect(input.viewportHeight).toBe(1000);
});

test("reduced motion permits a final frame but stops continuous scheduling", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one browser covers reduced scheduler semantics");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?runtime-reduced=1#hero", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await expect.poll(() => page.evaluate(() => Boolean(window.__SM_MOTION_RUNTIME))).toBe(true);

  const frames = await page.evaluate(async () => {
    const runtime = window.__SM_MOTION_RUNTIME;
    let count = 0;
    let settleFirstFrame;
    const firstFrame = new Promise((resolve) => { settleFirstFrame = resolve; });
    const unsubscribe = runtime.subscribe({
      id: "e2e-reduced-continuous",
      continuous: true,
      compute: () => {
        count += 1;
        if (count === 1) queueMicrotask(settleFirstFrame);
      },
    });
    runtime.wake("e2e-reduced-continuous");
    await firstFrame;
    const debug = runtime.__debug();
    unsubscribe();
    return { count, debug, reduced: runtime.policy.reducedMotion };
  });

  expect(frames.reduced).toBe(true);
  expect(frames.count, JSON.stringify(frames)).toBeGreaterThanOrEqual(1);
  expect(frames.count, JSON.stringify(frames)).toBeLessThanOrEqual(2);
  expect(frames.debug.scheduled, JSON.stringify(frames)).toBe(false);
});
