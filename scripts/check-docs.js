#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");

const ROOT = path.resolve(__dirname, "..");
const REQUIRED = [
  "README.md",
  "AGENTS.md",
  "CHANGELOG.md",
  "docs/ARCHITECTURE.md",
  "docs/DESIGN-SYSTEM.md",
  "docs/I18N.md",
  "docs/MASTER-IMPLEMENTATION-PLAN.md",
  "docs/MOTION-PERFORMANCE.md",
  "docs/PRODUCT-REGISTRY.md",
  "docs/QA-MATRIX.md",
  "docs/RELEASE-RUNBOOK.md",
  "docs/adr/0001-static-generated-portfolio.md",
  "docs/adr/0002-shared-motion-policy.md",
  "docs/adr/0003-canonical-product-registry.md",
];
const CONTRACT_DOCS = [
  "README.md",
  "docs/PRODUCT-REGISTRY.md",
  "docs/QA-MATRIX.md",
  "docs/RELEASE-RUNBOOK.md",
];
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relative) {
  const absolute = path.join(ROOT, relative);
  if (!fs.existsSync(absolute)) {
    fail("missing required document: " + relative);
    return "";
  }
  const source = fs.readFileSync(absolute, "utf8");
  if (!source.trim()) fail("empty document: " + relative);
  if (source.includes("\uFFFD")) fail("replacement character in " + relative);
  return source;
}

const sources = new Map(REQUIRED.map((relative) => [relative, read(relative)]));

for (const relative of REQUIRED) {
  const source = sources.get(relative) || "";
  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(source))) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || /^(?:https?:|mailto:|tel:|#)/i.test(rawTarget)) continue;
    const fileTarget = rawTarget.split("#")[0].split("?")[0];
    if (!fileTarget) continue;
    const resolved = path.resolve(path.dirname(path.join(ROOT, relative)), decodeURIComponent(fileTarget));
    if (!fs.existsSync(resolved)) fail(relative + " has broken local link: " + rawTarget);
  }

  const scriptPattern = /npm run ([a-zA-Z0-9:_-]+)/g;
  while ((match = scriptPattern.exec(source))) {
    if (!Object.prototype.hasOwnProperty.call(pkg.scripts || {}, match[1])) {
      fail(relative + " references missing package script: " + match[1]);
    }
  }
}

const i18n = sources.get("docs/I18N.md") || "";
if (!/\b15\b/.test(i18n) || !/\b45\b/.test(i18n) || !/\b46\b/.test(i18n)) {
  fail("docs/I18N.md does not state the 15-case / 45-page / 46-URL contract");
}
if (!/RU\s*\/\s*EN\s*\/\s*UZ|RU,\s*EN\s*(?:и|and)\s*UZ/i.test(i18n)) {
  fail("docs/I18N.md does not state RU/EN/UZ parity");
}

for (const relative of CONTRACT_DOCS) {
  const source = sources.get(relative) || "";
  if (!/\b24\b/.test(source)) fail(relative + " does not state the 24-product contract");
  if (!/\b15\b/.test(source)) fail(relative + " does not state the 15-case contract");
  if (!/\b9\b/.test(source)) fail(relative + " does not state the 9-live contract");
  if (!/RU\s*\/\s*EN\s*\/\s*UZ|RU,\s*EN\s*(?:и|and)\s*UZ/i.test(source)) {
    fail(relative + " does not state RU/EN/UZ parity");
  }
}

if (failures.length) {
  process.stderr.write("[docs] FAILED\n- " + failures.join("\n- ") + "\n");
  process.exit(1);
}

process.stdout.write(
  "[docs] OK — " + REQUIRED.length +
  " required documents, local links, package scripts and catalog contracts.\n"
);
