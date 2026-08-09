#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const BASE = new URL(
  process.env.PRODUCTION_BASE_URL ||
  "https://samandarmansurkhodjaev2713.github.io/CV-Samandar/"
);
const REPORT_PATH = process.env.PRODUCTION_MONITOR_REPORT ||
  path.join(process.cwd(), "tmp", "production-monitor", "metrics.json");

const profiles = [
  {
    name: "desktop",
    viewport: { width: 1440, height: 1000 },
    isMobile: false,
    hasTouch: false,
    limits: { mainReady: 9_000, lcp: 5_000, cls: 0.15, longTaskMax: 2_000, scrollP95: 55 },
  },
  {
    name: "mobile",
    viewport: { width: 412, height: 839 },
    isMobile: true,
    hasTouch: true,
    limits: { mainReady: 9_500, lcp: 5_500, cls: 0.15, longTaskMax: 2_000, scrollP95: 65 },
  },
];

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function isFirstParty(rawUrl) {
  try {
    const candidate = new URL(rawUrl);
    return candidate.origin === BASE.origin && candidate.pathname.startsWith(BASE.pathname);
  } catch (error) {
    return false;
  }
}

async function measure(browser, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    deviceScaleFactor: profile.isMobile ? 2 : 1,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  const failures = [];

  page.on("pageerror", (error) => failures.push("pageerror: " + error.message));
  page.on("requestfailed", (request) => {
    if (isFirstParty(request.url())) {
      failures.push("requestfailed: " + request.url() + " — " +
        ((request.failure() && request.failure().errorText) || "unknown"));
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && isFirstParty(response.url())) {
      failures.push("HTTP " + response.status() + ": " + response.url());
    }
  });

  await page.addInitScript(() => {
    window.__SM_PRODUCTION_VITALS = { lcp: 0, cls: 0, longTasks: [], events: [] };
    const observe = (type, callback, options) => {
      try {
        const observer = new PerformanceObserver((list) => list.getEntries().forEach(callback));
        observer.observe(options || { type, buffered: true });
      } catch (error) { /* unsupported metrics remain explicit in the report */ }
    };
    observe("largest-contentful-paint", (entry) => {
      window.__SM_PRODUCTION_VITALS.lcp = entry.startTime;
    });
    observe("layout-shift", (entry) => {
      if (!entry.hadRecentInput) window.__SM_PRODUCTION_VITALS.cls += entry.value;
    });
    observe("longtask", (entry) => {
      window.__SM_PRODUCTION_VITALS.longTasks.push({
        start: entry.startTime,
        duration: entry.duration,
      });
    });
    observe("event", (entry) => {
      if (entry.duration > 0) {
        window.__SM_PRODUCTION_VITALS.events.push({ name: entry.name, duration: entry.duration });
      }
    }, { type: "event", buffered: true, durationThreshold: 16 });
  });

  const startedAt = Date.now();
  const target = new URL("./?production-monitor=" + Date.now(), BASE).toString();
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("#main").waitFor({ state: "attached", timeout: 10_000 });
  await page.locator("#sm-intro").waitFor({ state: "detached", timeout: 10_000 });
  const mainReadyMs = Date.now() - startedAt;
  await page.waitForTimeout(500);

  const frameSamples = await page.evaluate(async () => {
    async function collect(count, mutate) {
      const values = [];
      let previous = performance.now();
      for (let index = 0; index < count; index += 1) {
        await new Promise((resolve) => requestAnimationFrame((now) => {
          if (index > 0) values.push(now - previous);
          previous = now;
          if (mutate) mutate(index, count);
          resolve();
        }));
      }
      return values;
    }
    const baseline = await collect(30);
    const maxY = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, innerHeight * 7));
    const scroll = await collect(90, (index, count) => {
      const progress = (index + 1) / count;
      window.scrollTo(0, maxY * (0.5 - Math.cos(progress * Math.PI) / 2));
    });
    return { baseline, scroll };
  });

  const navigationControl = profile.isMobile ? page.locator(".nav-burger") : page.locator(".nav-cta");
  if (await navigationControl.count()) {
    await navigationControl.first().click();
    await page.waitForTimeout(350);
  }

  const metrics = await page.evaluate(() => {
    const vitals = window.__SM_PRODUCTION_VITALS;
    const navigation = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint");
    const resources = performance.getEntriesByType("resource");
    const transfer = (entries) => entries.reduce(
      (sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0),
      0
    );
    const longDurations = vitals.longTasks.map((entry) => entry.duration);
    const eventDurations = vitals.events.map((entry) => entry.duration);
    return {
      ttfb: navigation ? navigation.responseStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd : 0,
      fcp: fcp ? fcp.startTime : 0,
      lcp: vitals.lcp,
      cls: vitals.cls,
      longTaskCount: longDurations.length,
      longTaskTotal: longDurations.reduce((sum, value) => sum + value, 0),
      longTaskMax: Math.max(0, ...longDurations),
      interactionMax: Math.max(0, ...eventDurations),
      transferBytes: transfer(resources),
      resourceCount: resources.length,
      motionTier: window.__SM_MOTION_POLICY && window.__SM_MOTION_POLICY.tier,
    };
  });

  const result = {
    profile: profile.name,
    viewport: profile.viewport,
    url: target,
    measuredAt: new Date().toISOString(),
    mainReadyMs,
    baselineFrameP95: percentile(frameSamples.baseline, 0.95),
    frameP50: percentile(frameSamples.scroll, 0.5),
    frameP95: percentile(frameSamples.scroll, 0.95),
    frameMax: percentile(frameSamples.scroll, 1),
    failures: Array.from(new Set(failures)),
    limits: profile.limits,
    ...metrics,
  };

  result.violations = [];
  if (result.failures.length) result.violations.push("first-party runtime/network failure");
  if (!result.lcp) result.violations.push("LCP was not observed");
  if (result.mainReadyMs > profile.limits.mainReady) result.violations.push("mainReady budget exceeded");
  if (result.lcp > profile.limits.lcp) result.violations.push("LCP budget exceeded");
  if (result.cls > profile.limits.cls) result.violations.push("CLS budget exceeded");
  if (result.longTaskMax > profile.limits.longTaskMax) result.violations.push("long-task budget exceeded");
  result.normalizedScrollLimit = Math.max(
    profile.limits.scrollP95,
    result.baselineFrameP95 * 2.5
  );
  if (result.frameP95 > result.normalizedScrollLimit) {
    result.violations.push("scroll frame budget exceeded");
  }

  await context.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const profile of profiles) results.push(await measure(browser, profile));
  } finally {
    await browser.close();
  }

  const report = {
    schema: 1,
    productionBaseUrl: BASE.toString(),
    sourceSha: process.env.GITHUB_SHA || null,
    runId: process.env.GITHUB_RUN_ID || null,
    generatedAt: new Date().toISOString(),
    scope: "synthetic Chromium production monitoring; not field RUM or physical-device evidence",
    results,
  };
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");

  for (const result of results) {
    const status = result.violations.length ? "FAIL" : "OK";
    process.stdout.write(
      `[production-monitor] ${status} ${result.profile}: ` +
      `ready=${Math.round(result.mainReadyMs)}ms ` +
      `LCP=${Math.round(result.lcp)}ms CLS=${result.cls.toFixed(4)} ` +
      `frame-p95=${result.frameP95.toFixed(1)}ms ` +
      `long-max=${Math.round(result.longTaskMax)}ms\n`
    );
    for (const violation of result.violations) {
      process.stderr.write(`[production-monitor] ${result.profile}: ${violation}\n`);
    }
  }
  process.stdout.write(`[production-monitor] report: ${REPORT_PATH}\n`);
  process.exit(results.some((result) => result.violations.length) ? 1 : 0);
})().catch((error) => {
  process.stderr.write("[production-monitor] " + (error.stack || error.message) + "\n");
  process.exit(1);
});
