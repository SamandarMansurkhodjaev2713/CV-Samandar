"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, switchMainLanguage, expectNoHorizontalOverflow } = require("./helpers");

test("Project Sketch exposes native choices and an honest immediate result", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one engine covers the deterministic UI contract");
  await settleMain(page, "#builder");

  await expect(page.locator("#builder fieldset")).toHaveCount(4);
  await expect(page.locator('#builder input[type="radio"]')).toHaveCount(7);
  await expect(page.locator('#builder input[type="checkbox"]')).toHaveCount(12);
  await expect(page.locator(".builder-notice")).toContainText("\u041d\u0435 \u043e\u0444\u0435\u0440\u0442\u0430");
  await expect(page.locator("#builder")).not.toContainText("\u0421\u0438\u0441\u0442\u0435\u043c\u0430 \u0441\u043e\u0431\u0440\u0430\u043d\u0430");
  await expect(page.locator("#builder")).not.toContainText(/listening on|READY/);

  const before = await page.locator(".builder-readout-row dd").allTextContents();
  await page.locator('.builder-opt:has(input[name="builder-type"][value="ai"])').click();
  await page.locator('.builder-opt:has(.builder-control[type="checkbox"][value="load"])').click();
  await page.locator('.builder-opt:has(.builder-control[type="checkbox"][value="integrations"])').click();
  const after = await page.locator(".builder-readout-row dd").allTextContents();
  expect(after[0]).not.toBe(before[0]);
  expect(after[1]).not.toBe(before[1]);
  const architectureToggle = page.locator(".builder-architecture-toggle");
  await expect(architectureToggle).toBeVisible();
  await expect(architectureToggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".builder-layer--ai")).not.toBeVisible();
  await architectureToggle.click();
  await expect(architectureToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".builder-layer--ai")).toBeVisible();
  await expect(page.locator(".builder-layer--qa")).toBeVisible();
});

for (const language of ["RU", "EN", "UZ"]) {
  test(`Builder handoff keeps scope, exact range and focus in ${language}`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "handoff semantics are engine-independent");
    await settleMain(page, "#builder");
    if (language !== "RU") {
      await switchMainLanguage(page, language);
      await expect(page.locator("html")).toHaveAttribute("lang", language.toLowerCase());
    }

    await page.locator('.builder-opt:has(input[name="builder-type"][value="ai"])').click();
    await page.locator('.builder-opt:has(.builder-control[type="checkbox"][value="ai"])').click();
    await page.locator('.builder-opt:has(.builder-control[type="checkbox"][value="load"])').click();
    const budget = (await page.locator(".builder-readout-row dd").nth(1).textContent()).trim();
    await page.locator(".builder-cta-tg").click();

    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator("#contact .ff-textarea")).toBeFocused();
    expect(await page.locator("#contact .ff-textarea").inputValue()).toContain(budget);
    await expect(page.locator("#contact .ff-k-val")).toHaveText(budget);
    await expect(page.locator('#contact .ff-choice-control[type="checkbox"]:checked')).toHaveCount(1);
  });
}

test("mobile Builder yields the dock and keeps result controls reachable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "explicit viewport matrix is covered once");
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await settleMain(page, "#builder");
    await expect.poll(() => page.evaluate(() => document.body.getAttribute("data-active-section"))).toBe("builder");
    const geometry = await page.evaluate(() => {
      const dock = document.querySelector(".mobile-dock");
      const result = document.querySelector(".builder-readout-block").getBoundingClientRect();
      const lastChoice = Array.from(document.querySelectorAll(".builder-ready")).at(-1).getBoundingClientRect();
      const primary = document.querySelector(".builder-cta-tg").getBoundingClientRect();
      const optionHeights = Array.from(document.querySelectorAll(".builder-opt")).map((node) => node.getBoundingClientRect().height);
      const dockStyle = getComputedStyle(dock);
      return {
        dockOpacity: Number(dockStyle.opacity),
        dockPointer: dockStyle.pointerEvents,
        resultGap: result.top - lastChoice.bottom,
        primaryHeight: primary.height,
        optionMin: Math.min(...optionHeights),
      };
    });
    expect(geometry.dockOpacity, JSON.stringify(viewport)).toBe(0);
    expect(geometry.dockPointer).toBe("none");
    expect(geometry.resultGap).toBeLessThan(viewport.height);
    expect(geometry.primaryHeight).toBeGreaterThanOrEqual(48);
    expect(geometry.optionMin).toBeGreaterThanOrEqual(56);
    await expect(page.locator(".builder-architecture-toggle")).toBeVisible();
    await expectNoHorizontalOverflow(expect, page, `builder ${viewport.width}x${viewport.height}`);
  }
});
