"use strict";

const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const PRODUCTS = require("../src/content/product-registry.js");

const ENABLED = process.env.VISUAL_QA === "1";
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "tmp", "release-qa");
const CASE_CAPTURE_REVISION = "revealed-v2";
const MAIN_SECTIONS = [
  "hero",
  "signal",
  "about",
  "projects",
  "builder",
  "skills",
  "services",
  "cv",
  "process",
  "faq",
  "trust",
  "contact",
];
const CASES = PRODUCTS
  .filter((product) => product.presentation === "case")
  .sort((a, b) => a.featuredRank - b.featuredRank);
const VIEWPORTS = {
  desktop: { width: 1440, height: 1000, isMobile: false },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
};

function embeddedPng(filePath) {
  return "data:image/png;base64," + fs.readFileSync(filePath).toString("base64");
}

async function waitForVisualReadiness(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    // Waiting for every document image deadlocks on native loading="lazy": an
    // offscreen asset is intentionally not requested until the visual sweep
    // reaches it. Only nearby images can affect the current screenshot.
    const images = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= -innerHeight && rect.top <= innerHeight * 2;
    });
    await Promise.race([
      Promise.all(images.map((image) => {
        const loaded = image.complete ? Promise.resolve() : new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
        // `complete` only means that bytes arrived. Chromium can still defer
        // decoding/painting a large offscreen image after the case sweep has
        // returned to the Hero. Await the real decode contract so the visual
        // evidence cannot record a black placeholder for a healthy asset.
        return loaded.then(() => (
          typeof image.decode === "function" ? image.decode().catch(() => undefined) : undefined
        ));
      })),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  });
}

async function captureMain(page, label) {
  await page.goto("/?release-visual=1#hero", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await waitForVisualReadiness(page);
  await page.evaluate(() => {
    if (window.__SM_MOTION_POLICY && window.__SM_MOTION_POLICY.__set) {
      window.__SM_MOTION_POLICY.__set("high");
    }
    document.documentElement.style.scrollBehavior = "auto";
    // The page starts at #hero to skip the authored Intro. Yield the first-load
    // deep-link stabilizer before the matrix starts moving through chapters;
    // otherwise its final #hero correction can race the first #signal capture
    // and silently save Hero twice. Real menu navigation publishes this same
    // ownership event through SceneCinema.
    window.dispatchEvent(new CustomEvent("sm:navigation-intent", {
      detail: { id: "visual-qa", source: "visual-qa" },
    }));
  });
  await page.waitForTimeout(80);

  const captures = [];
  for (const section of MAIN_SECTIONS) {
    await page.evaluate((id) => {
      const target = document.getElementById(id);
      if (!target) throw new Error("Missing main section #" + id);
      history.replaceState(null, "", "#" + id);
      target.scrollIntoView({ behavior: "auto", block: "start" });
    }, section);
    await waitForVisualReadiness(page);
    await page.waitForTimeout(420);
    const file = path.join(OUTPUT, "main-" + label + "-" + section + ".png");
    // Visual QA is evidence for the CURRENT candidate, never a cache. Keeping
    // an older non-empty screenshot made a successful run silently assemble a
    // contact sheet from the previous release after visual source changed.
    await page.screenshot({ path: file, animations: "disabled" });
    captures.push({ label: section, file });
  }
  // The fullscreen index is a primary authored scene, not merely a hidden
  // control. Capture it at both release viewports so localized label wrapping,
  // preview composition and footer telemetry cannot regress outside the
  // section-only contact sheet.
  await page.locator(".nav-burger").click();
  await expect(page.locator(".nav-menu")).toHaveClass(/is-open/);
  await page.waitForTimeout(900);
  const menuFile = path.join(OUTPUT, "main-" + label + "-menu.png");
  await page.screenshot({ path: menuFile, animations: "disabled" });
  captures.push({ label: "menu", file: menuFile });
  await page.locator(".nav-menu-close").click();
  await expect(page.locator(".nav-menu")).not.toHaveClass(/is-open/);
  return captures;
}

async function captureCases(page, label) {
  const captures = [];
  for (const product of CASES) {
    await page.goto("/" + product.casePage + "?release-visual=1", { waitUntil: "domcontentloaded" });
    await page.locator("#lp-root .lp-page").waitFor({ state: "visible", timeout: 10000 });
    await waitForVisualReadiness(page);
    // A fullPage screenshot expands the compositor without performing a real
    // scroll, so IntersectionObserver chapters would remain correctly hidden.
    // Sweep the actual scrollport first to exercise lazy assets and authored
    // reveals exactly as a reader does, then capture the settled whole page.
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const viewportHeight = await page.evaluate(() => innerHeight);
    for (let y = 0; y <= scrollHeight; y += Math.max(320, Math.floor(viewportHeight * 0.72))) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "auto" }), y);
      await page.waitForTimeout(70);
    }
    // Every reveal is now either intersected or has been passed. Keep the
    // visual evidence honest: a skipped transparent heading is a product
    // regression, not a contact-sheet detail to ignore.
    await expect.poll(() => page.locator("[data-lp-reveal]:not(.is-in)").count()).toBe(0);
    await page.waitForTimeout(1150);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
    await page.waitForTimeout(240);
    await waitForVisualReadiness(page);
    const file = path.join(
      OUTPUT,
      "case-" + CASE_CAPTURE_REVISION + "-" + label + "-" + product.slug + ".png"
    );
    await page.screenshot({ path: file, fullPage: true, animations: "disabled" });
    captures.push({
      label: (product.i18n && product.i18n.ru && product.i18n.ru.name) || product.slug,
      file,
    });
  }
  return captures;
}

async function contactSheet(page, title, captures, fileName, portrait) {
  const cards = captures.map((capture) => (
    '<figure><div class="shot"><img src="' + embeddedPng(capture.file) + '" alt=""></div>' +
    "<figcaption>" + capture.label.replace(/[&<>\"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
    }[char])) + "</figcaption></figure>"
  )).join("");
  await page.setViewportSize({ width: 1600, height: 1000 });
  // A case page's meta CSP remains active for document.write/setContent in
  // Chromium. Reset the browsing context so the QA-only inline grid CSS is not
  // rejected by the production policy we just finished validating.
  await page.goto("about:blank");
  await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
    '*{box-sizing:border-box}body{margin:0;background:#141310;color:#f5f0e6;font:15px Arial;padding:36px}' +
    'h1{font-size:28px;margin:0 0 28px}.grid{display:grid;grid-template-columns:repeat(' + (portrait ? 5 : 3) + ',1fr);gap:20px}' +
    'figure{margin:0;background:#1f1e1b;border:1px solid #423d34;border-radius:12px;overflow:hidden}' +
    '.shot{height:' + (portrait ? 360 : 210) + 'px;background:#090908;overflow:hidden}' +
    'img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}' +
    'figcaption{padding:10px 12px;color:#d8cdbc;font:600 12px/1.3 monospace}' +
    '</style></head><body><h1>' + title + '</h1><main class="grid">' + cards + "</main></body></html>",
    { waitUntil: "load" }
  );
  await expect(page.locator("img")).toHaveCount(captures.length);
  // `load` only guarantees that the data-URL bytes arrived; sixteen large
  // desktop full-page PNGs can still be waiting in Chromium's decode queue.
  // Waiting a fixed/polled seven seconds made the evidence harness race the
  // image decoder on slower machines. `decode()` is the actual readiness
  // contract and still rejects immediately for a corrupt capture.
  const decoded = await page.locator("img").evaluateAll(async (images) => {
    await Promise.all(images.map((image) => image.decode()));
    return images.map((image) => ({
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));
  });
  expect(decoded.every((image) => (
    image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
  ))).toBe(true);
  await page.screenshot({ path: path.join(OUTPUT, fileName), fullPage: true });
}

test.describe.configure({ mode: "parallel" });

for (const [label, viewport] of Object.entries(VIEWPORTS)) {
  test("capture " + label + " main scenes", async ({ browser }) => {
    test.skip(!ENABLED, "Run explicitly with npm run qa:visual");
    // Desktop PNGs contain the full-resolution Hero instrument and product
    // still lifes; on constrained CI workers their lossless encoding is
    // materially slower than the mobile matrix. A shared 240s limit killed a
    // healthy run during teardown and left Playwright's attachment ZIP
    // truncated. Keep both bounded, but budget them according to real work.
    test.setTimeout(label === "desktop" ? 420000 : 300000);
    fs.mkdirSync(OUTPUT, { recursive: true });
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      locale: "ru-RU",
      timezoneId: "Asia/Tashkent",
      colorScheme: "dark",
      serviceWorkers: "block",
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });
    const page = await context.newPage();
    const main = await captureMain(page, label);
    await contactSheet(
      page,
      "Main scenes — " + label,
      main,
      "contact-main-" + label + ".png",
      label === "mobile"
    );
    await context.close();
  });

  test("capture " + label + " product cases", async ({ browser }) => {
    test.skip(!ENABLED, "Run explicitly with npm run qa:visual");
    test.setTimeout(label === "desktop" ? 600000 : 480000);
    fs.mkdirSync(OUTPUT, { recursive: true });
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      locale: "ru-RU",
      timezoneId: "Asia/Tashkent",
      colorScheme: "dark",
      serviceWorkers: "block",
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });
    const page = await context.newPage();
    const cases = await captureCases(page, label);
    await contactSheet(
      page,
      "Product cases — " + label,
      cases,
      "contact-cases-" + label + ".png",
      label === "mobile"
    );
    await context.close();
  });
}
