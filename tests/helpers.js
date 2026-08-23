"use strict";

const path = require("path");

const registry = require(path.join(__dirname, "..", "src", "content", "product-registry.js"));
const orderedProducts = registry.slice().sort((a, b) => a.featuredRank - b.featuredRank);
const caseProducts = orderedProducts.filter((product) => product.presentation === "case");
const liveProducts = orderedProducts.filter((product) => product.presentation === "live");
let settleSequence = 0;

async function settleMain(page, hash) {
  const destination = (hash || "#hero").replace(/^#/, "");
  // A hash-only goto can stay in the same document, while the deep-link
  // settling effect is intentionally mounted once. Give every requested
  // destination its own navigation so repeated checks cannot wait on stale
  // state from the previous hash.
  settleSequence += 1;
  await page.goto("/?e2e=1&settle=" + settleSequence + "#" + destination, { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await page.locator(".proj-card").first().waitFor({ state: "attached" });
  await page.locator("html").waitFor({ state: "attached" });
  await page.waitForFunction(
    (id) => document.documentElement.getAttribute("data-deep-link-settled") === id,
    destination,
    { timeout: 9000 }
  );
  await page.evaluate(function makeStable() {
    document.documentElement.classList.add("e2e-stable");
  });
}

async function expectNoHorizontalOverflow(expect, page, label) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect.soft(
    geometry.scrollWidth,
    (label || "page") + " horizontal overflow: " + JSON.stringify(geometry)
  ).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect.soft(geometry.bodyWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

async function switchMainLanguage(page, language, options) {
  const target = String(language || "ru").toLowerCase();
  const keepMenuOpen = Boolean(options && options.keepMenuOpen);
  if ((await page.locator("html").getAttribute("lang")) === target) return;

  const menu = page.locator("#site-menu");
  if ((await menu.getAttribute("aria-hidden")) !== "false") {
    await page.locator(".nav-burger").click();
    await page.waitForFunction(() => {
      const element = document.getElementById("site-menu");
      return element && element.getAttribute("aria-hidden") === "false";
    });
  }

  await page.locator(".nav-menu-lang button")
    .filter({ hasText: new RegExp("^" + target.toUpperCase() + "$") })
    .click();
  await page.waitForFunction((lang) => document.documentElement.lang === lang, target);

  if (!keepMenuOpen) {
    await page.locator(".nav-menu-close").click();
    await page.waitForFunction(() => {
      const element = document.getElementById("site-menu");
      return element && element.getAttribute("aria-hidden") === "true";
    });
  }
}

function expectResponsiveProjectImage(expect, image, label) {
  const name = label || "project image";
  expect(image.complete, name + " did not finish loading").toBe(true);
  expect(image.width, name + " has no intrinsic width").toBeGreaterThan(0);
  expect(image.height, name + " has no intrinsic height").toBeGreaterThan(0);
  // With width descriptors Chromium may expose a density-corrected
  // naturalWidth (the computed slot width), not the source file's pixel width.
  // Physical dimensions are covered by validate-site; the browser check owns
  // candidate selection and preservation of the 3:1 visual contract.
  expect(image.currentSrc, name + " has no selected responsive source").toMatch(
    /\/assets\/proj\/(?:responsive\/[^/?]+-(?:768|1152)|[^/?]+)\.webp(?:\?.*)?$/
  );
  expect(Math.abs(image.width / image.height - 3), name + " lost its 3:1 ratio").toBeLessThan(0.02);
}

module.exports = {
  registry,
  orderedProducts,
  caseProducts,
  liveProducts,
  settleMain,
  switchMainLanguage,
  expectNoHorizontalOverflow,
  expectResponsiveProjectImage,
};
