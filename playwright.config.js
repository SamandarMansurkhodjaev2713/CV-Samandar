"use strict";

const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  outputDir: "test-results/artifacts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // The authored page deliberately combines WebGL, long scroll scenes and
  // responsive viewport sweeps. A second concurrent Chromium context can
  // exhaust Windows graphics/memory resources and hang browser teardown even
  // after every assertion has passed. CI runners keep two workers; local
  // Windows runs stay sequential so flaky infrastructure cannot impersonate a
  // product failure.
  workers: process.env.CI ? 2 : (process.platform === "win32" ? 1 : 4),
  timeout: 45000,
  expect: {
    timeout: 7000,
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    },
  },
  reporter: process.env.CI
    ? [["line"], ["html", { outputFolder: "test-results/report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "test-results/report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "ru-RU",
    timezoneId: "Asia/Tashkent",
    colorScheme: "dark",
    // The explicit visual-release job writes 70 PNG evidence files itself.
    // Retaining a second frame-by-frame trace/video copy can exhaust a small
    // Windows system drive while two long full-page case sweeps close.
    trace: process.env.VISUAL_QA === "1" ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.VISUAL_QA === "1" ? "off" : "retain-on-failure",
    serviceWorkers: "block",
  },
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER ? undefined : {
    command: "node scripts/static-server.js 4173",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
    stdout: "ignore",
    stderr: "pipe",
  },
  projects: [
    {
      name: "desktop-firefox",
      testMatch: /firefox-smoke\.spec\.js/,
      // Run the cross-engine smoke before the long Chromium/WebGL matrix so it
      // receives a clean process. The project remains serial: both tests still
      // run, with no retry locally.
      fullyParallel: false,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 1000 },
        // A real Windows window depends on the interactive desktop and can
        // stall before the page fixture exists. Headless Firefox is the stable
        // release profile; on Windows it deliberately uses the basic
        // compositor and the site's production WebGL fallback. Chromium owns
        // the separate visual/performance WebGL gates.
        headless: true,
        launchOptions: process.platform === "win32" ? {
          firefoxUserPrefs: {
            "gfx.webrender.all": false,
            "gfx.webrender.force-disabled": true,
            "gfx.webrender.software": false,
            "layers.acceleration.disabled": true,
            "webgl.disabled": true,
          },
        } : undefined,
      },
    },
    {
      name: "mobile-webkit",
      testMatch: /webkit-smoke\.spec\.js/,
      // Keep the strict 6-second first-load release budget, but give WebKit a
      // clean process before the long Chromium/WebGL sweep. This mirrors the
      // Firefox isolation above without changing coverage or timeouts.
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop-chromium",
      testIgnore: /(?:reduced-motion|webkit-smoke|firefox-smoke)\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      testIgnore: /(?:reduced-motion|webkit-smoke|firefox-smoke)\.spec\.js/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 412, height: 839 },
      },
    },
    {
      name: "reduced-motion",
      testMatch: /reduced-motion\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
        reducedMotion: "reduce",
      },
    },
  ],
});
