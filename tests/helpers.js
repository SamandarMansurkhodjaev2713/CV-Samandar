"use strict";

const path = require("path");

const registry = require(path.join(__dirname, "..", "src", "content", "product-registry.js"));
const orderedProducts = registry.slice().sort((a, b) => a.featuredRank - b.featuredRank);
const caseProducts = orderedProducts.filter((product) => product.presentation === "case");
const liveProducts = orderedProducts.filter((product) => product.presentation === "live");

async function settleMain(page, hash) {
  await page.goto("/?e2e=1" + (hash || "#hero"), { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await page.locator(".proj-card").first().waitFor({ state: "attached" });
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

module.exports = {
  registry,
  orderedProducts,
  caseProducts,
  liveProducts,
  settleMain,
  expectNoHorizontalOverflow,
};
