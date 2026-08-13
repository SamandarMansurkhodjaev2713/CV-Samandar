#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const pkg = require("../package.json");
const productRegistry = require("../src/content/product-registry.js");

const ROOT = path.resolve(__dirname, "..");
const REQUIRED = [
  "README.md",
  "AGENTS.md",
  "CHANGELOG.md",
  "docs/ARCHITECTURE.md",
  "docs/AWWWARDS-SUBMISSION.md",
  "docs/DESIGN-SYSTEM.md",
  "docs/I18N.md",
  "docs/MASTER-IMPLEMENTATION-PLAN.md",
  "docs/MOTION-PERFORMANCE.md",
  "docs/PHYSICAL-AT-QA-PROTOCOL.md",
  "docs/PRODUCT-REGISTRY.md",
  "docs/PRODUCTION-MONITORING.md",
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
const CURRENT_CATALOG_DOCS = [
  "README.md",
  "docs/ARCHITECTURE.md",
  "docs/AWWWARDS-SUBMISSION.md",
  "docs/DESIGN-SYSTEM.md",
  "docs/I18N.md",
  "docs/MOTION-PERFORMANCE.md",
  "docs/PRODUCTION-MONITORING.md",
  "docs/QA-MATRIX.md",
];
const CATALOG = {
  products: productRegistry.length,
  live: productRegistry.filter((product) => product.presentation === "live").length,
  cases: productRegistry.filter((product) => product.presentation === "case").length,
  locales: 3,
};
CATALOG.casePages = CATALOG.cases * CATALOG.locales;
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
if (
  !new RegExp("\\b" + CATALOG.cases + "\\b").test(i18n) ||
  !new RegExp("\\b" + CATALOG.casePages + "\\b").test(i18n) ||
  !new RegExp("\\b" + (CATALOG.casePages + 1) + "\\b").test(i18n)
) {
  fail(
    "docs/I18N.md does not state the " + CATALOG.cases + "-case / " +
    CATALOG.casePages + "-page / " + (CATALOG.casePages + 1) + "-URL contract"
  );
}
if (!/RU\s*\/\s*EN\s*\/\s*UZ|RU,\s*EN\s*(?:и|and)\s*UZ/i.test(i18n)) {
  fail("docs/I18N.md does not state RU/EN/UZ parity");
}

for (const relative of CONTRACT_DOCS) {
  const source = sources.get(relative) || "";
  if (!new RegExp("\\b" + CATALOG.products + "\\b").test(source)) {
    fail(relative + " does not state the " + CATALOG.products + "-product contract");
  }
  if (!new RegExp("\\b" + CATALOG.cases + "\\b").test(source)) {
    fail(relative + " does not state the " + CATALOG.cases + "-case contract");
  }
  if (!new RegExp("\\b" + CATALOG.live + "\\b").test(source)) {
    fail(relative + " does not state the " + CATALOG.live + "-live contract");
  }
  if (!/RU\s*\/\s*EN\s*\/\s*UZ|RU,\s*EN\s*(?:и|and)\s*UZ/i.test(source)) {
    fail(relative + " does not state RU/EN/UZ parity");
  }
}

const staleCatalogClaims = [
  { pattern: /\b24\s+(?:canonical|каноническ|карточ|project|продукт)/iu, label: "24-product" },
  { pattern: /\b15\s+(?:case|кейс|маршрут|route|product|продукт)/iu, label: "15-case" },
  { pattern: /\b45\s+(?:localized|локализ|static|статич|HTML|case|RU)/iu, label: "45-page" },
];
for (const relative of CURRENT_CATALOG_DOCS) {
  const source = sources.get(relative) || "";
  for (const stale of staleCatalogClaims) {
    if (stale.pattern.test(source)) {
      fail(relative + " contains stale current catalog claim: " + stale.label);
    }
  }
}

const physicalProtocol = sources.get("docs/PHYSICAL-AT-QA-PROTOCOL.md") || "";
for (const requiredState of ["PASS", "FAIL", "BLOCKED", "NOT RUN"]) {
  if (!physicalProtocol.includes(requiredState)) {
    fail("docs/PHYSICAL-AT-QA-PROTOCOL.md omits result state: " + requiredState);
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
