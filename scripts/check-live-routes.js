"use strict";

const registry = require("../src/content/product-registry.js");

const REQUEST_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 700;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function inspectHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Samandar-Portfolio-Release-Check/1.0",
      },
    });
    const contentType = response.headers.get("content-type") || "";
    const body = (await response.text()).slice(0, 4096);
    const isHtml = /text\/html|application\/xhtml\+xml/i.test(contentType) || /<!doctype\s+html|<html[\s>]/i.test(body);
    return {
      ok: response.ok && isHtml && body.trim().length > 0,
      status: response.status,
      finalUrl: response.url,
      elapsedMs: Date.now() - startedAt,
      contentType,
      reason: !response.ok ? "HTTP " + response.status : !isHtml ? "response is not HTML" : !body.trim() ? "empty response" : "",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function inspectWithRetry(product) {
  let lastFailure = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await inspectHtml(product.liveUrl);
      if (result.ok) return { product, result, attempt };
      lastFailure = result;
      if (result.status >= 400 && result.status < 500) break;
    } catch (error) {
      lastFailure = {
        ok: false,
        status: 0,
        finalUrl: product.liveUrl,
        elapsedMs: REQUEST_TIMEOUT_MS,
        reason: error && error.name === "AbortError" ? "timeout" : String(error && error.message ? error.message : error),
      };
    }
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
  }
  return { product, result: lastFailure, attempt: MAX_ATTEMPTS };
}

async function main() {
  const liveProducts = registry
    .filter((product) => product.presentation === "live")
    .sort((a, b) => a.featuredRank - b.featuredRank);

  if (!liveProducts.length) throw new Error("No live products found in product registry");

  const failures = [];
  for (const product of liveProducts) {
    const checked = await inspectWithRetry(product);
    const result = checked.result;
    if (result.ok) {
      console.log(`[live] OK   ${product.slug.padEnd(20)} ${result.status} ${String(result.elapsedMs).padStart(5)}ms ${result.finalUrl}`);
    } else {
      failures.push(checked);
      console.error(`[live] FAIL ${product.slug.padEnd(20)} ${result.reason || "unknown failure"} ${product.liveUrl}`);
    }
  }

  if (failures.length) {
    throw new Error(`${failures.length}/${liveProducts.length} live routes failed release verification`);
  }
  console.log(`[live] OK — ${liveProducts.length} live routes returned usable HTML`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("[live] " + error.message);
    process.exitCode = 1;
  });
}

module.exports = { inspectHtml, inspectWithRetry };
