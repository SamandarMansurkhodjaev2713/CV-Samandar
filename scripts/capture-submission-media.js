#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_BASE = "https://samandarmansurkhodjaev2713.github.io/CV-Samandar/";
const BASE_URL = new URL(process.env.SUBMISSION_BASE_URL || DEFAULT_BASE).href;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const OUTPUT = path.join(ROOT, "tmp", "submission-media", stamp);
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
const captures = [];
const runtimeIssues = [];

function guardPage(page, label) {
  page.on("pageerror", (error) => {
    runtimeIssues.push(label + " pageerror: " + error.message);
  });
  page.on("console", (message) => {
    if (message.type() === "error") runtimeIssues.push(label + " console: " + message.text());
  });
}

function pngDimensions(file) {
  const header = fs.readFileSync(file).subarray(0, 24);
  if (header.length < 24 || header.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("Invalid PNG: " + file);
  }
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function gitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (_) {
    return "unknown";
  }
}

function captureUrl(hash, label) {
  const url = new URL(BASE_URL);
  url.searchParams.set("submission-capture", label + "-" + Date.now());
  url.hash = hash || "";
  return url.href;
}

async function waitForMain(page, introExpected) {
  await page.locator("#main").waitFor({ state: "attached", timeout: 20000 });
  if (introExpected) {
    await page.waitForFunction(() => !document.getElementById("sm-intro"), null, {
      timeout: 20000,
    });
  }
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    document.documentElement.style.scrollBehavior = "auto";
    // A hash used to skip Intro also starts the app's first-load deep-link
    // stabilizer. Publish a newer navigation owner before the capture moves to
    // another chapter, otherwise the final #hero correction can win after our
    // scroll and silently save Hero twice.
    window.dispatchEvent(new CustomEvent("sm:navigation-intent", {
      detail: { id: "submission-capture", source: "submission-capture" },
    }));
  });
  await page.waitForTimeout(900);
}

async function settleVisibleImages(page) {
  await page.evaluate(async () => {
    const nearby = Array.from(document.images).filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= -innerHeight && rect.top <= innerHeight * 2;
    });
    await Promise.race([
      Promise.all(nearby.map((image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      })),
      new Promise((resolve) => setTimeout(resolve, 4000)),
    ]);
  });
}

async function goToSection(page, id, dwell = 900) {
  await page.evaluate((sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) throw new Error("Missing section #" + sectionId);
    window.dispatchEvent(new CustomEvent("sm:navigation-intent", {
      detail: { id: sectionId, source: "submission-capture" },
    }));
    target.scrollIntoView({ behavior: "auto", block: "start" });
    history.replaceState(null, "", "#" + sectionId);
  }, id);
  await settleVisibleImages(page);
  await page.waitForTimeout(dwell);
}

async function screenshot(page, name, profile, note) {
  const file = path.join(OUTPUT, name + ".png");
  await page.screenshot({ path: file, animations: "disabled" });
  captures.push({ name, profile, note, file });
}

async function captureDesktopStillSet(browser) {
  const context = await browser.newContext({
    viewport: DESKTOP,
    screen: DESKTOP,
    locale: "ru-RU",
    timezoneId: "Asia/Tashkent",
    colorScheme: "dark",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  guardPage(page, "desktop-stills");
  await page.goto(captureUrl("hero", "desktop-stills"), { waitUntil: "domcontentloaded" });
  await waitForMain(page, false);
  await settleVisibleImages(page);
  await screenshot(page, "cover-desktop", "desktop", "Hero final pose");

  await goToSection(page, "projects", 1200);
  const expand = page.locator(".proj-expand");
  if (await expand.getAttribute("aria-expanded") !== "true") await expand.click();
  await page.waitForTimeout(1000);
  await goToSection(page, "projects", 700);
  await screenshot(page, "projects-desktop", "desktop", "Featured and archive entry");

  await goToSection(page, "builder", 1200);
  await page.locator("label.builder-opt").nth(1).click();
  await page.locator("label.builder-opt--pill").nth(1).click();
  await page.locator("label.builder-opt--compact").first().click();
  await page.waitForTimeout(800);
  await screenshot(page, "builder-desktop", "desktop", "Configured scope preview");

  await goToSection(page, "trust", 1300);
  await screenshot(page, "quality-desktop", "desktop", "Quality protocol on paper act");

  await page.goto(new URL("projects/ttyl/?submission-capture=case-desktop", BASE_URL).href, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#lp-root .lp-page").waitFor({ state: "visible", timeout: 15000 });
  await settleVisibleImages(page);
  await page.waitForTimeout(900);
  await screenshot(page, "case-desktop", "desktop", "TTYL privacy-safe case thesis");
  await context.close();
}

async function captureMobileStillSet(browser) {
  const context = await browser.newContext({
    viewport: MOBILE,
    screen: MOBILE,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    locale: "ru-RU",
    timezoneId: "Asia/Tashkent",
    colorScheme: "dark",
    serviceWorkers: "block",
  });
  const page = await context.newPage();
  guardPage(page, "mobile-stills");
  await page.goto(captureUrl("hero", "mobile-stills"), { waitUntil: "domcontentloaded" });
  await waitForMain(page, false);
  await settleVisibleImages(page);
  await screenshot(page, "hero-mobile", "mobile", "Independent mobile Hero");

  await goToSection(page, "projects", 1100);
  await screenshot(page, "projects-mobile", "mobile", "Touch gallery with next-card peek");

  await page.goto(new URL("projects/ttyl/?submission-capture=case-mobile", BASE_URL).href, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#lp-root .lp-page").waitFor({ state: "visible", timeout: 15000 });
  await settleVisibleImages(page);
  await page.waitForTimeout(900);
  await screenshot(page, "case-mobile", "mobile", "Mobile case reading order");
  await context.close();
}

async function smoothChapter(page, id, dwell = 3200) {
  await page.evaluate((sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) throw new Error("Missing section #" + sectionId);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, id);
  await page.waitForTimeout(dwell);
}

async function captureDesktopTour(browser) {
  const rawVideoDir = path.join(OUTPUT, "raw-video");
  fs.mkdirSync(rawVideoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: DESKTOP,
    screen: DESKTOP,
    locale: "ru-RU",
    timezoneId: "Asia/Tashkent",
    colorScheme: "dark",
    serviceWorkers: "block",
    recordVideo: { dir: rawVideoDir, size: DESKTOP },
  });
  const page = await context.newPage();
  guardPage(page, "desktop-tour");
  const video = page.video();
  const startedAt = Date.now();
  await page.goto(captureUrl("", "desktop-tour"), { waitUntil: "domcontentloaded" });
  await waitForMain(page, true);
  await settleVisibleImages(page);
  await page.waitForTimeout(2800);

  await page.locator(".nav-burger").click();
  await page.waitForTimeout(1700);
  await page.locator(".nav-menu-links a").nth(3).hover();
  await page.waitForTimeout(1500);
  await page.locator(".nav-menu-close").click();
  await page.waitForTimeout(1300);

  await smoothChapter(page, "signal", 3000);
  await smoothChapter(page, "about", 3300);
  await smoothChapter(page, "projects", 3300);
  const expand = page.locator(".proj-expand");
  if (await expand.getAttribute("aria-expanded") !== "true") await expand.click();
  await page.waitForTimeout(2200);

  await page.locator("#proj-ttyl .proj-cta").click();
  await page.waitForURL(/\/projects\/ttyl\//, { timeout: 15000 });
  await page.locator("#lp-root .lp-page").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(2200);
  await page.locator("#system").scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  await page.locator(".lp-back").click();
  await page.waitForURL(/#proj-ttyl$/, { timeout: 15000 });
  await page.locator("#proj-ttyl").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(2800);

  await smoothChapter(page, "builder", 3000);
  await page.locator("label.builder-opt").nth(1).click();
  await page.waitForTimeout(600);
  await page.locator("label.builder-opt--pill").nth(1).click();
  await page.waitForTimeout(600);
  await page.locator("label.builder-opt--compact").first().click();
  await page.waitForTimeout(2200);

  for (const id of ["skills", "services", "cv", "process", "faq", "trust", "contact"]) {
    await smoothChapter(page, id, id === "contact" ? 4200 : 3100);
  }

  const durationMs = Date.now() - startedAt;
  await context.close();
  const outputVideo = path.join(OUTPUT, "site-tour-desktop.webm");
  await video.saveAs(outputVideo);
  return { file: outputVideo, durationMs };
}

function imageData(file) {
  return "data:image/png;base64," + fs.readFileSync(file).toString("base64");
}

async function buildContactSheet(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  guardPage(page, "contact-sheet");
  const cards = captures.map((item) => (
    '<figure class="' + item.profile + '"><div class="frame"><img src="' + imageData(item.file) +
    '" alt=""></div><figcaption><b>' + item.name + '</b><span>' + item.note + "</span></figcaption></figure>"
  )).join("");
  await page.setContent(
    '<!doctype html><html><head><meta charset="utf-8"><style>' +
    '*{box-sizing:border-box}body{margin:0;padding:34px;background:#141310;color:#f5f0e6;font-family:Arial,sans-serif}' +
    'h1{margin:0 0 26px;font:700 28px/1.1 Arial}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}' +
    'figure{margin:0;border:1px solid #494238;border-radius:12px;overflow:hidden;background:#1f1e1b}' +
    '.frame{height:260px;background:#090908;overflow:hidden}.mobile .frame{height:360px}' +
    'img{width:100%;height:100%;display:block;object-fit:cover;object-position:top}' +
    'figcaption{display:grid;gap:4px;padding:11px 13px}b{font:600 12px/1.2 monospace;color:#d97757}' +
    'span{font-size:12px;color:#b8ac97}</style></head><body><h1>Awwwards submission media · review sheet</h1>' +
    '<main class="grid">' + cards + "</main></body></html>",
    { waitUntil: "load" }
  );
  await page.screenshot({ path: path.join(OUTPUT, "contact-sheet.png"), fullPage: true });
  await page.close();
}

async function run() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  let tour;
  try {
    await captureDesktopStillSet(browser);
    await captureMobileStillSet(browser);
    tour = await captureDesktopTour(browser);
    await buildContactSheet(browser);
  } finally {
    await browser.close();
  }

  for (const item of captures) {
    const expected = item.profile === "mobile" ? MOBILE : DESKTOP;
    const actual = pngDimensions(item.file);
    if (actual.width !== expected.width || actual.height !== expected.height) {
      throw new Error(
        item.name + " dimensions " + actual.width + "x" + actual.height +
        " do not match " + expected.width + "x" + expected.height
      );
    }
  }
  if (tour.durationMs < 60000 || tour.durationMs > 90000) {
    throw new Error("Review tour must be 60–90 seconds; got " + tour.durationMs + " ms");
  }
  if (fs.statSync(tour.file).size < 1024 * 1024) {
    throw new Error("Review tour is unexpectedly small: " + fs.statSync(tour.file).size + " bytes");
  }
  if (runtimeIssues.length) {
    throw new Error("Capture runtime issues:\n- " + runtimeIssues.join("\n- "));
  }

  const manifest = {
    schema: 1,
    generatedAt: new Date().toISOString(),
    sourceCommit: gitHead(),
    productionBaseUrl: BASE_URL,
    truthBoundary: "Automated Chromium capture; mobile stills are viewport evidence, not physical-device evidence.",
    screenshots: captures.map((item) => ({
      name: item.name,
      profile: item.profile,
      note: item.note,
      file: path.basename(item.file),
      dimensions: item.profile === "mobile" ? MOBILE : DESKTOP,
    })),
    video: {
      file: path.basename(tour.file),
      dimensions: DESKTOP,
      frameRate: 25,
      durationMs: tour.durationMs,
      capture: "Playwright real-time WebM review capture; no speed ramp or simulated mobile input",
    },
    nativeMobileInsert: "NOT RUN",
  };
  fs.writeFileSync(path.join(OUTPUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  process.stdout.write("[submission-media] OK — " + captures.length + " stills, 1 review video\n");
  process.stdout.write("[submission-media] " + OUTPUT + "\n");
}

run().catch((error) => {
  process.stderr.write("[submission-media] FAILED\n" + (error && error.stack ? error.stack : String(error)) + "\n");
  process.exit(1);
});
