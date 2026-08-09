#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");

const executable = process.execPath;
const playwrightCli = require.resolve("@playwright/test/cli");
const result = spawnSync(
  executable,
  [
    playwrightCli,
    "test",
    "tests/visual-release.spec.js",
    "--project=desktop-chromium",
    "--workers=2",
  ],
  {
    cwd: process.cwd(),
    env: Object.assign({}, process.env, { VISUAL_QA: "1" }),
    stdio: "inherit",
  }
);

if (result.error) {
  process.stderr.write("[visual-qa] " + result.error.message + "\n");
  process.exit(1);
}
process.exit(typeof result.status === "number" ? result.status : 1);
