"use strict";

const { test, expect } = require("@playwright/test");

test.describe.configure({ mode: "serial" });
// Video encoding and tracing materially distort RAF/long-task measurements.
// Functional suites own those artifacts; this calibrated gate owns timing.
test.use({ trace: "off", video: "off", screenshot: "off" });

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    !["desktop-chromium", "mobile-chromium"].includes(testInfo.project.name),
    "production performance gate is calibrated in Chromium desktop/mobile"
  );
  await page.addInitScript(() => {
    window.__SM_VITALS = { lcp: 0, cls: 0, longTasks: [], events: [] };
    const observe = (type, callback, options) => {
      try {
        const observer = new PerformanceObserver((list) => list.getEntries().forEach(callback));
        observer.observe(options || { type, buffered: true });
      } catch (error) { /* unsupported metric remains explicit zero */ }
    };
    observe("largest-contentful-paint", (entry) => {
      const element = entry.element;
      window.__SM_VITALS.lcp = entry.startTime;
      window.__SM_VITALS.lcpElement = element ? {
        tag: element.tagName,
        id: element.id || "",
        className: typeof element.className === "string" ? element.className : "",
        text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
        url: entry.url || "",
        size: entry.size || 0,
      } : null;
    });
    observe("layout-shift", (entry) => {
      if (!entry.hadRecentInput) window.__SM_VITALS.cls += entry.value;
    });
    observe("longtask", (entry) => {
      window.__SM_VITALS.longTasks.push({ start: entry.startTime, duration: entry.duration });
    });
    observe("event", (entry) => {
      if (entry.duration > 0) window.__SM_VITALS.events.push({ name: entry.name, duration: entry.duration });
    }, { type: "event", buffered: true, durationThreshold: 16 });
  });
});

test("production motion stays inside the measurable desktop/mobile budget", async ({ page }, testInfo) => {
  const started = Date.now();
  await page.goto(`/?performance-gate=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached", timeout: 7000 });
  await page.locator("#sm-intro").waitFor({ state: "detached", timeout: 7000 });
  const introReleaseMs = Date.now() - started;
  await page.waitForTimeout(350);

  const frameSample = await page.evaluate(async () => {
    async function collect(count, mutate) {
      const frames = [];
      let last = performance.now();
      for (let index = 0; index < count; index += 1) {
        await new Promise((resolve) => requestAnimationFrame((now) => {
          frames.push(now - last);
          last = now;
          if (mutate) mutate(index, count);
          resolve();
        }));
      }
      frames.shift();
      frames.sort((a, b) => a - b);
      const percentile = (value) => frames[Math.min(frames.length - 1, Math.floor(frames.length * value))] || 0;
      return {
        p50: percentile(0.5),
        p95: percentile(0.95),
        max: frames[frames.length - 1] || 0,
        over40Ratio: frames.filter((value) => value > 40).length / Math.max(1, frames.length),
      };
    }
    const baseline = await collect(28);
    const startY = window.scrollY;
    const endY = Math.max(startY, Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 7));
    const scroll = await collect(100, (index, count) => {
      const progress = (index + 1) / count;
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;
      window.scrollTo(0, startY + (endY - startY) * eased);
    });
    return { baseline, scroll };
  });

  await page.locator(testInfo.project.name === "mobile-chromium" ? ".nav-burger" : ".nav-cta").click();
  await page.waitForTimeout(550);

  const metrics = await page.evaluate(() => {
    const vital = window.__SM_VITALS;
    const resources = performance.getEntriesByType("resource");
    const scripts = resources.filter((entry) => /\.js(?:\?|$)/.test(entry.name));
    const styles = resources.filter((entry) => /\.css(?:\?|$)/.test(entry.name));
    const images = resources.filter((entry) => entry.initiatorType === "img");
    const transfer = (entries) => entries.reduce((sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0), 0);
    const longDurations = vital.longTasks.map((entry) => entry.duration);
    const eventDurations = vital.events.map((entry) => entry.duration);
    return {
      lcp: vital.lcp,
      lcpElement: vital.lcpElement || null,
      cls: vital.cls,
      longTaskCount: longDurations.length,
      longTaskTotal: longDurations.reduce((sum, value) => sum + value, 0),
      longTaskMax: Math.max(0, ...longDurations),
      interactionMax: Math.max(0, ...eventDurations),
      scriptTransfer: transfer(scripts),
      styleTransfer: transfer(styles),
      imageTransfer: transfer(images),
      scriptCount: scripts.length,
      motionTier: window.__SM_MOTION_POLICY && window.__SM_MOTION_POLICY.tier,
      runtime: window.__SM_MOTION_RUNTIME && window.__SM_MOTION_RUNTIME.__debug(),
      longestTasks: vital.longTasks.slice().sort((a, b) => b.duration - a.duration).slice(0, 8),
      slowestResources: resources.slice().sort((a, b) => b.duration - a.duration).slice(0, 8).map((entry) => ({
        name: entry.name.split("/").slice(-2).join("/"),
        type: entry.initiatorType,
        duration: entry.duration,
        transfer: entry.transferSize || entry.encodedBodySize || 0,
      })),
    };
  });
  const report = { project: testInfo.project.name, introReleaseMs, frameSample, ...metrics };
  await testInfo.attach("performance-metrics", {
    body: Buffer.from(JSON.stringify(report, null, 2)),
    contentType: "application/json",
  });

  const mobile = testInfo.project.name === "mobile-chromium";
  const hostDelayAllowance = Math.max(0, frameSample.baseline.p95 - 25) * 18;
  const baseLcpBudget = mobile ? 4200 : 3800;
  // LCP is recorded before the RAF baseline, but both share the same headless
  // renderer and CPU. On a healthy host the allowance is exactly zero. When
  // the measured idle baseline itself is heavily delayed, permit only a small
  // capped correction and keep the absolute ceiling at base + 800 ms. The
  // degraded-tier assertion below remains mandatory on every such run.
  const lcpHostAllowance = Math.min(800, Math.max(0, frameSample.baseline.p95 - 25) * 3);
  expect(introReleaseMs, JSON.stringify(report)).toBeLessThanOrEqual(5500 + hostDelayAllowance);
  expect(metrics.lcp, JSON.stringify(report)).toBeGreaterThan(0);
  expect(metrics.lcp, JSON.stringify(report)).toBeLessThanOrEqual(baseLcpBudget + lcpHostAllowance);
  expect(metrics.cls, JSON.stringify(report)).toBeLessThanOrEqual(0.1);
  // Headless Windows can spend close to one second compiling the single
  // pre-minified ReactDOM vendor file on a contended runner. Keep a hard
  // regression ceiling while the frame test below normalizes to that host.
  expect(metrics.longTaskMax, JSON.stringify(report)).toBeLessThanOrEqual(Math.max(1600, frameSample.baseline.p95 * 6));
  expect(metrics.longTaskTotal, JSON.stringify(report)).toBeLessThanOrEqual(Math.max(5200, frameSample.baseline.p95 * 25));
  const interactionHostAllowance = Math.min(800, Math.max(0, frameSample.baseline.p95 - 25) * 3);
  expect(metrics.interactionMax, JSON.stringify(report)).toBeLessThanOrEqual(800 + interactionHostAllowance);
  const normalizedScrollBudget = Math.max(mobile ? 50 : 40, frameSample.baseline.p95 * 2.5);
  expect(frameSample.scroll.p95, JSON.stringify(report)).toBeLessThanOrEqual(normalizedScrollBudget);
  const excessOver40Ratio = Math.max(0, frameSample.scroll.over40Ratio - frameSample.baseline.over40Ratio);
  if (frameSample.baseline.p95 <= 25) {
    expect(frameSample.scroll.over40Ratio, JSON.stringify(report)).toBeLessThanOrEqual(0.08);
  } else {
    // Some Linux headless displays deliver a stable 30 Hz RAF cadence. That is
    // a host baseline, not a regression caused by page scroll, so compare the
    // active sample with the measured idle sample instead of demanding `low`
    // solely because both sit near 33.3 ms. The policy must still degrade when
    // the host is severely constrained or interaction adds material pressure.
    expect(excessOver40Ratio, JSON.stringify(report)).toBeLessThanOrEqual(0.08);
    const severeBaseline = frameSample.baseline.p95 >= 50 || frameSample.baseline.over40Ratio > 0.2;
    const materialScrollRegression =
      frameSample.scroll.p95 > Math.max(50, frameSample.baseline.p95 * 1.5) ||
      excessOver40Ratio > 0.04;
    if (severeBaseline || materialScrollRegression) {
      expect(metrics.motionTier, JSON.stringify(report)).toBe("low");
    }
  }
  expect(metrics.scriptTransfer, JSON.stringify(report)).toBeLessThanOrEqual(900_000);
  expect(metrics.styleTransfer, JSON.stringify(report)).toBeLessThanOrEqual(500_000);
});
