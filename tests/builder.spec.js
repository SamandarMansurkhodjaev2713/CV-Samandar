"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, switchMainLanguage, expectNoHorizontalOverflow } = require("./helpers");

test.setTimeout(120_000);

const SPECIFICATION_KEYS = ["complexity", "layers", "nextStepId", "proofScope", "riskIds", "stagePlanIds"];
const DECISION_ROW_SELECTORS = {
  composition: ".builder-readout-row--composition",
  complexity: ".builder-readout-row--complexity",
  stages: ".builder-readout-row--stages",
  risks: ".builder-readout-row--risks",
  next: ".builder-readout-row--next",
};
const FORBIDDEN_HANDOFF = /(?:\$|€|£|₽|\b(?:USD|EUR|RUB|UZS)\b|\b(?:budget|byudjet)\b|бюджет|\bweeks?\b|недел|hafta|timelineBandId|estimateBandId)/i;
const PROMISED_DURATION = /\b\d+\s*(?:[–—-]\s*\d+\s*)?(?:days?|weeks?|months?|дн(?:я|ей)?|недел(?:я|и|ь)|месяц(?:а|ев)?|kun|hafta|oy)\b/i;

async function configureComplexScope(page) {
  await page.locator('.builder-opt:has(input[name="builder-type"][value="ai"])').click();
  await page.locator('.builder-opt:has(input[name="builder-stage"][value="production"])').click();
  await page.locator('.builder-opt:has(.builder-control[type="checkbox"][value="load"])').click();
  await page.locator('.builder-opt:has(.builder-control[type="checkbox"][value="integrations"])').click();
  const readiness = page.locator(".builder-ready input[type=checkbox]");
  for (let index = 0; index < await readiness.count(); index += 1) {
    await readiness.nth(index).check();
  }
}

async function readDecision(page) {
  return page.locator("#builder").evaluate((root, selectors) => {
    const text = (node) => (node && node.textContent ? node.textContent.replace(/\s+/g, " ").trim() : "");
    const row = (name) => root.querySelector(selectors[name]);
    return {
      composition: Array.from(row("composition").querySelectorAll("dd span")).map(text).filter(Boolean),
      complexity: text(row("complexity").querySelector("dd")),
      complexityClass: row("complexity").querySelector("dd").className,
      stages: Array.from(row("stages").querySelectorAll("li")).map((item) => text(item).replace(/^\d{2}\s*/, "")).filter(Boolean),
      risks: Array.from(row("risks").querySelectorAll("li, .builder-ready-state")).map(text).filter(Boolean),
      next: text(row("next").querySelector("dd")),
      combined: Object.values(selectors).map((selector) => text(root.querySelector(selector))).join("\n"),
    };
  }, DECISION_ROW_SELECTORS);
}

function expectCompleteDecision(decision, label) {
  expect(decision.composition.length, `${label}: composition`).toBeGreaterThan(0);
  expect(decision.complexity, `${label}: complexity`).not.toBe("");
  expect(decision.complexityClass, `${label}: complexity band class`).toMatch(/builder-complexity--(?:low|moderate|high|critical)/);
  expect(decision.stages.length, `${label}: stages`).toBeGreaterThanOrEqual(4);
  expect(decision.risks.length, `${label}: risks`).toBeGreaterThan(0);
  expect(decision.next, `${label}: next step`).not.toBe("");
  expect(decision.combined, `${label}: no quote or promised duration`).not.toMatch(FORBIDDEN_HANDOFF);
  expect(decision.combined, `${label}: no numeric duration promise`).not.toMatch(PROMISED_DURATION);
}

test("Scope Preview exposes five decisions and a deliberate proof disclosure", async ({ page }) => {
  await settleMain(page, "#builder");

  await expect(page.locator("#builder fieldset")).toHaveCount(4);
  await expect(page.locator('#builder input[type="radio"]')).toHaveCount(7);
  await expect(page.locator('#builder input[type="checkbox"]')).toHaveCount(12);
  await expect(page.locator(".builder-readout-row")).toHaveCount(5);
  for (const selector of Object.values(DECISION_ROW_SELECTORS)) {
    await expect(page.locator(selector)).toBeVisible();
  }

  const initial = await readDecision(page);
  expectCompleteDecision(initial, "initial preview");

  await configureComplexScope(page);
  const configured = await readDecision(page);
  expectCompleteDecision(configured, "configured preview");
  expect(configured.composition.length).toBeGreaterThan(initial.composition.length);
  expect(configured.complexityClass).not.toBe(initial.complexityClass);
  expect(configured.stages).not.toEqual(initial.stages);
  expect(configured.risks).not.toEqual(initial.risks);
  expect(configured.next).not.toBe(initial.next);

  const disclosure = page.locator(".builder-architecture-toggle");
  const proof = page.locator("#builder-architecture");
  await expect(disclosure).toBeVisible();
  await expect(disclosure).toHaveAttribute("aria-controls", "builder-architecture");
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(proof).toBeHidden();

  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(proof).toBeVisible();
  await expect(proof.locator(".builder-proof-mini > li")).toHaveCount(3);
  const proofRows = await proof.locator(".builder-proof-mini > li").evaluateAll((rows) => rows.map((row) => ({
    label: (row.querySelector("strong")?.textContent || "").trim(),
    detail: (row.querySelector("small")?.textContent || "").trim(),
  })));
  proofRows.forEach((row, index) => {
    expect(row.label, `proof ${index + 1}: label`).not.toBe("");
    expect(row.detail, `proof ${index + 1}: detail`).not.toBe("");
  });
  await expect(proof.locator(".builder-layer")).toHaveCount(configured.composition.length);
  expect(await proof.innerText()).not.toMatch(FORBIDDEN_HANDOFF);
  expect(await proof.innerText()).not.toMatch(PROMISED_DURATION);

  await disclosure.click();
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(proof).toBeHidden();
});

for (const language of ["RU", "EN", "UZ"]) {
  test(`Builder handoff carries the five-part scope without a quote in ${language}`, async ({ page }) => {
    await settleMain(page, "#builder");
    if (language !== "RU") {
      await switchMainLanguage(page, language);
      await expect(page.locator("html")).toHaveAttribute("lang", language.toLowerCase());
    }

    await configureComplexScope(page);
    const decision = await readDecision(page);
    expectCompleteDecision(decision, `${language} handoff source`);
    await page.evaluate(() => {
      window.__builderHandoffForTest = null;
      window.addEventListener("sm:builder-config", (event) => {
        window.__builderHandoffForTest = event.detail;
      }, { once: true });
    });

    await page.locator(".builder-cta-tg").click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator("#contact .ff-textarea")).toBeFocused();

    const handoff = await page.evaluate(() => window.__builderHandoffForTest);
    expect(handoff).toBeTruthy();
    expect(Object.keys(handoff.specification).sort()).toEqual(SPECIFICATION_KEYS);
    expect(Object.keys(handoff.specification.proofScope).sort()).toEqual(["build", "ship", "verify"]);
    expect(JSON.stringify(handoff)).not.toMatch(FORBIDDEN_HANDOFF);
    expect(JSON.stringify(handoff)).not.toMatch(PROMISED_DURATION);

    const summary = await page.locator("#contact .ff-textarea").inputValue();
    for (const value of [
      ...decision.composition,
      decision.complexity,
      ...decision.stages,
      ...decision.risks,
      decision.next,
    ]) {
      expect(summary, `${language}: handoff keeps ${value}`).toContain(value);
    }
    expect(summary).not.toMatch(FORBIDDEN_HANDOFF);
    expect(summary).not.toMatch(PROMISED_DURATION);
    await expect(page.locator('#contact [name="budget"], #contact .ff-k-val')).toHaveCount(0);
    await expect(page.locator('#contact .ff-choice-control[type="checkbox"]:checked')).toHaveCount(1);
  });
}

test("Scope Preview geometry stays readable and reachable across its responsive matrix", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile-chromium";
  const viewports = mobile
    ? [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 844, height: 390 },
    ]
    : [
      { width: 1280, height: 720 },
      { width: 1440, height: 900 },
    ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await settleMain(page, "#builder");
    await configureComplexScope(page);
    await page.locator(".builder-architecture-toggle").click();
    await expect(page.locator("#builder-architecture")).toBeVisible();

    const geometry = await page.locator("#builder").evaluate((root) => {
      const rect = (selector) => root.querySelector(selector).getBoundingClientRect();
      const form = rect(".builder");
      const choices = rect(".builder-choices");
      const readout = rect(".builder-readout-block");
      const proof = rect("#builder-architecture");
      const rows = Array.from(root.querySelectorAll(".builder-readout-row")).map((node) => node.getBoundingClientRect());
      const targets = Array.from(root.querySelectorAll(".builder-opt, .builder-ready, .builder-cta-tg, .builder-cta-alt, .builder-architecture-toggle"))
        .filter((node) => getComputedStyle(node).display !== "none")
        .map((node) => node.getBoundingClientRect());
      const textNodes = Array.from(root.querySelectorAll(".builder-readout-k, .builder-readout-v, .builder-stage-plan li, .builder-risk-list li, .builder-proof-mini strong, .builder-proof-mini small, .builder-chip"));
      const clipped = textNodes.filter((node) => node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1).length;
      const within = (child, parent) => child.left >= parent.left - 1 && child.right <= parent.right + 1;
      const dock = document.querySelector(".mobile-dock");
      const dockStyle = dock ? getComputedStyle(dock) : null;
      const lastReady = Array.from(root.querySelectorAll(".builder-ready")).at(-1).getBoundingClientRect();
      return {
        formWithinViewport: form.left >= -1 && form.right <= document.documentElement.clientWidth + 1,
        choicesWithinForm: within(choices, form),
        readoutWithinForm: within(readout, form),
        proofWithinForm: within(proof, form),
        rowsWithinReadout: rows.every((row) => within(row, readout)),
        rowsOrdered: rows.every((row, index) => index === 0 || row.top >= rows[index - 1].bottom - 1),
        minTargetHeight: Math.min(...targets.map((target) => target.height)),
        clipped,
        mobileResultGap: readout.top - lastReady.bottom,
        dockDisplayed: Boolean(dockStyle && dockStyle.display !== "none"),
        dockOpacity: dockStyle ? Number(dockStyle.opacity) : 0,
        dockPointer: dockStyle ? dockStyle.pointerEvents : "none",
      };
    });

    const label = `${testInfo.project.name} ${viewport.width}x${viewport.height}`;
    expect(geometry.formWithinViewport, `${label}: form`).toBe(true);
    expect(geometry.choicesWithinForm, `${label}: choices`).toBe(true);
    expect(geometry.readoutWithinForm, `${label}: readout`).toBe(true);
    expect(geometry.proofWithinForm, `${label}: proof`).toBe(true);
    expect(geometry.rowsWithinReadout, `${label}: rows`).toBe(true);
    expect(geometry.rowsOrdered, `${label}: row overlap`).toBe(true);
    expect(geometry.minTargetHeight, `${label}: touch target`).toBeGreaterThanOrEqual(44);
    expect(geometry.clipped, `${label}: clipped decision text`).toBe(0);
    if (viewport.width <= 900) {
      expect(geometry.mobileResultGap, `${label}: choices/readout order`).toBeGreaterThanOrEqual(-1);
      expect(geometry.mobileResultGap, `${label}: choices/readout distance`).toBeLessThan(viewport.height);
      if (geometry.dockDisplayed) {
        expect(geometry.dockOpacity, `${label}: dock opacity`).toBe(0);
        expect(geometry.dockPointer, `${label}: dock pointer`).toBe("none");
      }
    }
    await expectNoHorizontalOverflow(expect, page, label);
  }
});
