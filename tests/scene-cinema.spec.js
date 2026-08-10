"use strict";

const { test, expect } = require("@playwright/test");

async function settleCinema(page) {
  await page.goto("/?cinema-contract=1#hero", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await expect.poll(() => page.evaluate(() => !!(window.SceneCinema && window.SceneCinema.__debug().bound))).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-deep-link-settled", "hero", { timeout: 9000 });
}

test("latest navigation intent wins and every cinema event is balanced", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "transaction semantics are engine-independent");
  await page.addInitScript(() => {
    window.__cinemaUnhandled = [];
    window.addEventListener("unhandledrejection", (event) => {
      window.__cinemaUnhandled.push(String(event.reason && (event.reason.message || event.reason)));
    });
    document.startViewTransition = (mutation) => {
      mutation();
      let resolve;
      let rejectReady;
      const finished = new Promise((done) => { resolve = done; });
      const ready = new Promise((done, reject) => { rejectReady = reject; });
      const timer = setTimeout(resolve, 240);
      return {
        finished,
        ready,
        skipTransition() {
          clearTimeout(timer);
          rejectReady(new DOMException("Transition was skipped", "AbortError"));
          resolve();
        },
      };
    };
  });
  await settleCinema(page);
  await page.evaluate(() => window.__SM_MOTION_POLICY.__set("high"));

  const result = await page.evaluate(async () => {
    const events = [];
    const record = (event) => events.push({ type: event.type, ...event.detail });
    window.addEventListener("sm:cinema-start", record);
    window.addEventListener("sm:cinema-done", record);
    const first = window.SceneCinema.navigate("about", { source: "e2e-first" });
    const second = window.SceneCinema.navigate("projects", { source: "e2e-latest" });
    await Promise.all([first, second]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    window.removeEventListener("sm:cinema-start", record);
    window.removeEventListener("sm:cinema-done", record);
    return {
      events,
      hash: location.hash,
      activeSection: document.body.getAttribute("data-active-section"),
      debug: window.SceneCinema.__debug(),
      runtime: window.__SM_MOTION_RUNTIME.__debug(),
      unhandled: window.__cinemaUnhandled.slice(),
    };
  });

  const starts = result.events.filter((event) => event.type === "sm:cinema-start");
  const dones = result.events.filter((event) => event.type === "sm:cinema-done");
  expect(starts).toHaveLength(2);
  expect(dones).toHaveLength(2);
  expect(dones.map((event) => event.token).sort()).toEqual(starts.map((event) => event.token).sort());
  expect(dones[0].reason).toBe("superseded");
  expect(result.hash).toBe("#projects");
  expect(result.activeSection).toBe("projects");
  expect(result.debug.active).toBeNull();
  expect(result.debug.transitioning).toBe(false);
  expect(result.runtime.suspended).not.toContain("cinema");
  expect(result.unhandled).toEqual([]);
});

test("hard timeout restores the requested final pose and releases the shell", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "timeout contract is engine-independent");
  await page.addInitScript(() => {
    document.startViewTransition = () => ({
      finished: new Promise(() => {}),
      skipTransition() {},
    });
  });
  await settleCinema(page);
  // Isolate the watchdog contract from the separate low-tier fast path. Under
  // CI load the real governor may legitimately downgrade before navigation;
  // this test must still exercise an accepted native transition that never
  // resolves, not the already-covered performance cut.
  await page.evaluate(() => window.__SM_MOTION_POLICY.__set("high"));

  const timeoutMs = await page.evaluate(() => window.SceneCinema.__debug().timeoutMs);
  const resultPromise = page.evaluate(async () => {
    let doneReason = null;
    const onDone = (event) => { doneReason = event.detail.reason; };
    window.addEventListener("sm:cinema-done", onDone);
    const result = await window.SceneCinema.navigate("services", { source: "e2e-timeout" });
    window.removeEventListener("sm:cinema-done", onDone);
    return {
      result,
      doneReason,
      hash: location.hash,
      activeSection: document.body.getAttribute("data-active-section"),
      debug: window.SceneCinema.__debug(),
    };
  });
  await page.waitForTimeout(timeoutMs + 180);
  const result = await resultPromise;

  expect(result.result.reason).toBe("timeout");
  expect(result.doneReason).toBe("timeout");
  expect(result.hash).toBe("#services");
  expect(result.activeSection).toBe("services");
  expect(result.debug.active).toBeNull();
  expect(result.debug.transitioning).toBe(false);
});

test("low performance tier cuts directly to the requested readable pose", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "performance cut contract is engine-independent");
  await settleCinema(page);

  const result = await page.evaluate(async () => {
    window.__SM_MOTION_POLICY.__set("low");
    let starts = 0;
    const onStart = () => { starts += 1; };
    window.addEventListener("sm:cinema-start", onStart);
    const navigation = await window.SceneCinema.navigate("services", { source: "e2e-performance-cut" });
    window.removeEventListener("sm:cinema-start", onStart);
    return {
      navigation,
      starts,
      hash: location.hash,
      activeSection: document.body.getAttribute("data-active-section"),
      debug: window.SceneCinema.__debug(),
    };
  });

  expect(result.navigation.reason).toBe("performance-cut");
  expect(result.starts).toBe(0);
  expect(result.hash).toBe("#services");
  expect(result.activeSection).toBe("services");
  expect(result.debug.active).toBeNull();
  expect(result.debug.transitioning).toBe(false);
});

test("reduced motion and browser back use instant accessible navigation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "history contract is engine-independent");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settleCinema(page);

  const initial = await page.evaluate(async () => {
    let starts = 0;
    const onStart = () => { starts += 1; };
    window.addEventListener("sm:cinema-start", onStart);
    await window.SceneCinema.navigate("about", { source: "e2e-reduced" });
    await window.SceneCinema.navigate("projects", { source: "e2e-reduced" });
    window.removeEventListener("sm:cinema-start", onStart);
    return { starts, hash: location.hash, section: document.body.getAttribute("data-active-section") };
  });
  expect(initial.starts).toBe(0);
  expect(initial.hash).toBe("#projects");
  expect(initial.section).toBe("projects");

  await page.goBack({ waitUntil: "commit" }).catch(() => null);
  await expect.poll(() => page.evaluate(() => document.body.getAttribute("data-active-section"))).toBe("about");
  await expect(page).toHaveURL(/#about$/);
  await expect(page.locator("html")).not.toHaveClass(/is-cinema-transitioning/);
});
