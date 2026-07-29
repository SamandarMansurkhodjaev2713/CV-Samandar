"use strict";

const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  outputDir: "test-results/artifacts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
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
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  webServer: {
    command: "node scripts/static-server.js 4173",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
    stdout: "ignore",
    stderr: "pipe",
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: /(?:reduced-motion|webkit-smoke)\.spec\.js/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      testIgnore: /(?:reduced-motion|webkit-smoke)\.spec\.js/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 412, height: 839 },
      },
    },
    {
      name: "mobile-webkit",
      testMatch: /webkit-smoke\.spec\.js/,
      use: {
        ...devices["iPhone 13"],
        viewport: { width: 390, height: 844 },
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
