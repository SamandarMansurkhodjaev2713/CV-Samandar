"use strict";

const { test, expect } = require("@playwright/test");

// Chromium on Windows can serialize GPU-process teardown when several WebGL
// contexts close at once. These lifecycle tests intentionally create and lose
// contexts, so run them in order and explicitly release the owned renderer
// before Playwright closes each isolated browser context.
test.describe.configure({ mode: "serial" });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.project.name !== "desktop-chromium") return;
  await page.evaluate(() => {
    if (window.__SM_IMGFX && typeof window.__SM_IMGFX.dispose === "function") {
      window.__SM_IMGFX.dispose();
    }
  }).catch(() => {});
});

async function settleProjects(page, options = {}) {
  await page.goto("/?imgfx-contract=1#projects", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await page.locator(".proj-card [data-imgfx]").first().waitFor({ state: "attached" });
  if (options.loadEffect === false) return;
  await page.evaluate(() => {
    window.__SM_MOTION_POLICY.__set("high");
    return window.__SM_LAZY_EFFECTS && window.__SM_LAZY_EFFECTS.ensure();
  });
  await expect.poll(() => page.evaluate(() => Boolean(window.__SM_IMGFX))).toBe(true);
}

test("image shader owns one renderer subscriber and latest host wins", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "WebGL lifecycle is engine-independent");
  await settleProjects(page);

  const result = await page.evaluate(async () => {
    const policy = window.__SM_MOTION_POLICY;
    const effect = window.__SM_IMGFX;
    policy.__set("high");
    const boxes = Array.from(document.querySelectorAll(".proj-card [data-imgfx]")).slice(0, 2);
    const first = effect.attach(boxes[0]);
    const second = effect.attach(boxes[1]);
    await Promise.all([first, second]);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const debug = effect.__debug();
    const hostIndex = boxes.indexOf(effect.hostEl());
    const runtimeIds = window.__SM_MOTION_RUNTIME.__debug().subscriberIds;
    return {
      debug,
      hostIndex,
      shaderSubscriberCount: runtimeIds.filter((id) => id === "image-shader").length,
      canvasCount: document.querySelectorAll(".imgfx-canvas").length,
      activeSurfaceCount: document.querySelectorAll(".has-imgfx").length,
    };
  });

  expect(result.debug.active).toBe(true);
  expect(result.debug.rendererReady).toBe(true);
  expect(result.debug.ownsAnimationFrame).toBe(false);
  expect(result.debug.runtimeSubscriber).toBe(true);
  expect(result.debug.buildCount).toBe(1);
  expect(result.hostIndex).toBe(1);
  expect(result.shaderSubscriberCount).toBe(1);
  expect(result.canvasCount).toBe(1);
  expect(result.activeSurfaceCount).toBe(1);
});

test("tier downgrade parks the shader without hiding the real image", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "policy lifecycle is engine-independent");
  await settleProjects(page);

  await page.evaluate(async () => {
    const policy = window.__SM_MOTION_POLICY;
    policy.__set("high");
    const box = document.querySelector(".proj-card [data-imgfx]");
    await window.__SM_IMGFX.attach(box);
    policy.__set("low");
  });

  await expect.poll(() => page.evaluate(() => window.__SM_IMGFX.active())).toBe(false);
  await expect(page.locator(".has-imgfx")).toHaveCount(0);
  await expect(page.locator(".proj-card [data-imgfx] img").first()).toBeVisible();
  const debug = await page.evaluate(() => window.__SM_IMGFX.__debug());
  expect(debug.ownsAnimationFrame).toBe(false);
});

test("context loss and restore degrade safely, rebuild once, and dispose resources", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "context lifecycle is engine-independent");
  await settleProjects(page);

  const result = await page.evaluate(async () => {
    const policy = window.__SM_MOTION_POLICY;
    const effect = window.__SM_IMGFX;
    const box = document.querySelector(".proj-card [data-imgfx]");
    policy.__set("high");
    await effect.attach(box);
    const oldCanvas = box.querySelector(".imgfx-canvas");
    const lost = new Event("webglcontextlost", { cancelable: true });
    oldCanvas.dispatchEvent(lost);
    const afterLoss = effect.__debug();
    oldCanvas.dispatchEvent(new Event("webglcontextrestored"));
    const afterRestore = effect.__debug();
    await effect.attach(box);
    const afterRebuild = effect.__debug();
    effect.dispose();
    const afterDispose = effect.__debug();
    return {
      lossPrevented: lost.defaultPrevented,
      afterLoss,
      afterRestore,
      afterRebuild,
      afterDispose,
      imageVisible: getComputedStyle(box.querySelector("img")).display !== "none",
      canvasCount: document.querySelectorAll(".imgfx-canvas").length,
      activeSurfaceCount: document.querySelectorAll(".has-imgfx").length,
    };
  });

  expect(result.lossPrevented).toBe(true);
  expect(result.afterLoss.contextLost).toBe(true);
  expect(result.afterLoss.active).toBe(false);
  expect(result.afterRestore.contextLost).toBe(false);
  expect(result.afterRestore.rendererReady).toBe(false);
  expect(result.afterRebuild.rendererReady).toBe(true);
  expect(result.afterRebuild.buildCount).toBe(2);
  expect(result.afterDispose.disposed).toBe(true);
  expect(result.afterDispose.textureCount).toBe(0);
  expect(result.afterDispose.runtimeSubscriber).toBe(false);
  expect(result.imageVisible).toBe(true);
  expect(result.canvasCount).toBe(0);
  expect(result.activeSurfaceCount).toBe(0);
});

test("reduced motion keeps project imagery static and readable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one browser covers preference behavior");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settleProjects(page, { loadEffect: false });

  const result = await page.evaluate(async () => {
    const effect = await window.__SM_LAZY_EFFECTS.ensure();
    return {
      effectLoaded: Boolean(effect || window.__SM_IMGFX),
      policy: window.__SM_MOTION_POLICY.getState(),
    };
  });

  expect(result.effectLoaded).toBe(false);
  expect(result.policy.reducedMotion).toBe(true);
  await expect(page.locator("script[src*='three.min.js']")).toHaveCount(0);
  await expect(page.locator(".proj-card [data-imgfx] img").first()).toBeVisible();
});

test("disposing during an in-flight texture load cannot resurrect WebGL state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "WebGL lifecycle is engine-independent");
  await page.route("**/assets/proj/**/klawis*.webp?slow-texture=1", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 220));
    await route.continue();
  });
  await settleProjects(page);

  const result = await page.evaluate(async () => {
    const effect = window.__SM_IMGFX;
    const policy = window.__SM_MOTION_POLICY;
    const box = document.querySelector(".proj-card [data-imgfx]");
    const image = box.querySelector("img");
    policy.__set("high");
    image.removeAttribute("srcset");
    image.src = "/assets/proj/klawis.webp?slow-texture=1";
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const pending = effect.attach(box).catch(() => false);
    effect.dispose();
    await pending;
    await new Promise((resolve) => setTimeout(resolve, 280));
    return {
      debug: effect.__debug(),
      canvasCount: document.querySelectorAll(".imgfx-canvas").length,
      activeSurfaceCount: document.querySelectorAll(".has-imgfx").length,
    };
  });

  expect(result.debug.disposed).toBe(true);
  expect(result.debug.rendererReady).toBe(false);
  expect(result.debug.textureCount).toBe(0);
  expect(result.canvasCount).toBe(0);
  expect(result.activeSurfaceCount).toBe(0);
});
