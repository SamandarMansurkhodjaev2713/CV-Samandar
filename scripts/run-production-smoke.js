#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");

const playwrightCli = require.resolve("@playwright/test/cli");
const productionBase = process.env.PRODUCTION_BASE_URL ||
  "https://samandarmansurkhodjaev2713.github.io/CV-Samandar/";
const result = spawnSync(
  process.execPath,
  [
    playwrightCli,
    "test",
    "tests/production-smoke.spec.js",
    "--project=desktop-chromium",
    "--workers=1",
    "--retries=2",
  ],
  {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, {
      PLAYWRIGHT_SKIP_WEBSERVER: "1",
      PRODUCTION_SMOKE: "1",
      PRODUCTION_BASE_URL: productionBase,
    }),
    stdio: "inherit",
  }
);

if (result.error) {
  process.stderr.write("[production-smoke] " + result.error.message + "\n");
  process.exit(1);
}
process.exit(typeof result.status === "number" ? result.status : 1);
