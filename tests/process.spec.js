"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow } = require("./helpers");

test("Method is a four-phase evidence ledger, not simulated terminal activity", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one engine covers the semantic contract");
  await settleMain(page, "#process");

  await expect(page.locator("#process .proc-ledger-row")).toHaveCount(4);
  await expect(page.locator("#process .proc-ledger-proof-row--artifact")).toHaveCount(4);
  await expect(page.locator("#process .proc-ledger-proof-row--gate")).toHaveCount(4);
  await expect(page.locator("#process .proc-terminal")).toHaveCount(0);
  await expect(page.locator("#process")).not.toContainText(/saturday-night-prod|listening on|184 passed|queued/i);

  const semantics = await page.locator("#process .proc-ledger-row").evaluateAll((rows) => rows.map((row) => ({
    heading: row.querySelector("h3")?.textContent.trim(),
    artifact: row.querySelector(".proc-ledger-proof-row--artifact dd")?.textContent.trim(),
    gate: row.querySelector(".proc-ledger-proof-row--gate dd")?.textContent.trim(),
  })));
  semantics.forEach((phase) => {
    expect(phase.heading.length).toBeGreaterThan(2);
    expect(phase.artifact.length).toBeGreaterThan(8);
    expect(phase.gate.length).toBeGreaterThan(12);
  });
});

test("Method keeps its complete information architecture in RU, EN and UZ", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "language contract is engine-independent");
  await settleMain(page, "#process");

  for (const language of ["RU", "EN", "UZ"]) {
    await page.locator(".nav .lang button").filter({ hasText: new RegExp(`^${language}$`) }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", language.toLowerCase());
    await expect(page.locator("#process .proc-ledger-row")).toHaveCount(4);
    await expect(page.locator("#process .proc-ledger-proof dt")).toHaveCount(8);
    await expect(page.locator("#process .proc-boundary p")).not.toBeEmpty();
    await expect(page.locator("#process .proc-principle p")).not.toBeEmpty();
  }
});

test("Method remains readable across phone and compact-landscape widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "explicit viewport matrix is covered once");
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 568, height: 320 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await settleMain(page, "#process");
    const geometry = await page.evaluate(() => ({
      rows: Array.from(document.querySelectorAll("#process .proc-ledger-row")).map((row) => {
        const rect = row.getBoundingClientRect();
        const heading = row.querySelector("h3");
        const proof = row.querySelector(".proc-ledger-proof");
        return {
          heading: heading.textContent.trim(),
          headingClientWidth: heading.clientWidth,
          headingScrollWidth: heading.scrollWidth,
          left: rect.left,
          right: rect.right,
          headingFits: heading.scrollWidth <= heading.clientWidth + 1,
          proofFits: proof.scrollWidth <= proof.clientWidth + 1,
        };
      }),
      boundaryWidth: document.querySelector(".proc-boundary").getBoundingClientRect().width,
    }));
    const caseId = `${viewport.width}x${viewport.height}`;
    geometry.rows.forEach((row) => {
      expect(row.left, `row left at ${caseId}`).toBeGreaterThanOrEqual(-1);
      expect(row.right, `row right at ${caseId}`).toBeLessThanOrEqual(viewport.width + 1);
      expect(
        row.headingFits,
        `phase "${row.heading}" at ${caseId}: ${row.headingScrollWidth}px content / ${row.headingClientWidth}px box`
      ).toBe(true);
      expect(row.proofFits, `phase proof at ${caseId}`).toBe(true);
    });
    expect(geometry.boundaryWidth, `boundary width at ${caseId}`).toBeGreaterThan(240);
    await expectNoHorizontalOverflow(expect, page, `Method ${caseId}`);
  }
});
