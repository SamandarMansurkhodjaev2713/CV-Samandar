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
    // The visual suite already writes its complete evidence as authored PNGs
    // and contact sheets. Playwright trace/video duplicates every long scroll
    // frame and can require several gigabytes while two case contexts close on
    // Windows. Keep the product assertions and all 68 captures, but run the
    // evidence contexts sequentially and do not create redundant diagnostics.
    "--workers=1",
    "--trace=off",
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
