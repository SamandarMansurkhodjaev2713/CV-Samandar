"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow } = require("./helpers");

test("Contact has no placeholder endpoint or simulated delivery state", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "source and semantic contract are engine-independent");
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "components", "components-2.jsx"), "utf8");
  expect(source).not.toContain("YOUR_FORM_ID");
  expect(source).not.toContain("FORM_ENDPOINT_CONFIGURED");
  expect(source).not.toContain("finishSent");

  await settleMain(page, "#contact");
  await expect(page.locator('#contact input[type="checkbox"]')).toHaveCount(6);
  await expect(page.locator('#contact input[type="radio"][name="timeline-ui"]')).toHaveCount(4);
  await expect(page.locator('#contact input[type="radio"][name="timeline-ui"]:checked')).toHaveCount(1);
  await expect(page.locator("#contact .contact-brief")).toHaveCount(0);
  await expect(page.locator("#contact")).not.toContainText(/deploy\.endpoint|request received|запрос принят/i);
});

test("Contact builds the exact visible brief and opens an honest Telegram hand-off", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "handoff semantics are engine-independent");
  await page.addInitScript(() => {
    Object.defineProperty(window, "open", {
      configurable: true,
      value(url) {
        document.documentElement.setAttribute("data-contact-open", String(url));
        return {};
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text) {
          document.documentElement.setAttribute("data-contact-copy", String(text));
          return Promise.resolve();
        },
      },
    });
  });
  await settleMain(page, "#contact");

  const form = page.locator("#contact form");
  await form.locator('input[name="name"]').fill("Samandar test client");
  await form.locator('input[name="contact"]').fill("@client");
  await form.locator('.ff-choice:has(input[type="checkbox"])').first().click();
  const timeline = form.locator('input[type="radio"][name="timeline-ui"]:checked');
  await timeline.focus();
  await timeline.press("ArrowLeft");
  await form.locator('textarea[name="message"]').fill("Need a reliable product with a QA release gate.");
  await form.locator(".contact-submit").click();

  await expect(page.locator(".contact-brief")).toBeVisible();
  const brief = await page.locator(".contact-brief-text").inputValue();
  expect(brief).toContain("Samandar test client");
  expect(brief).toContain("@client");
  expect(brief).toContain("QA release gate");
  await expect(page.locator("html")).toHaveAttribute("data-contact-copy", brief);
  await expect(page.locator("html")).toHaveAttribute("data-contact-open", /t\.me\/killallofthem13/);
  await expect(page.locator(".contact-brief-status")).toContainText("скопирован");
  await expect(page).toHaveURL(/#contact$/);
});

test("Contact native validation blocks an empty hand-off", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "validation contract is engine-independent");
  await page.addInitScript(() => {
    Object.defineProperty(window, "open", {
      configurable: true,
      value(url) { document.documentElement.setAttribute("data-contact-open", String(url)); },
    });
  });
  await settleMain(page, "#contact");
  await page.locator("#contact .contact-submit").click();
  await expect(page.locator("#contact .contact-brief")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-contact-open");
  expect(await page.locator('#contact input[name="name"]').evaluate((input) => input.validity.valueMissing)).toBe(true);
});

test("Contact actions and native choices remain reachable on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "explicit viewport matrix is covered once");
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await settleMain(page, "#contact");
    await page.locator("#contact .contact-actions").scrollIntoViewIfNeeded();
    const geometry = await page.evaluate(() => {
      const dock = document.querySelector(".mobile-dock")?.getBoundingClientRect();
      const actions = document.querySelector(".contact-actions").getBoundingClientRect();
      return {
        actionsBottom: actions.bottom,
        dockTop: dock && dock.width > 0 ? dock.top : innerHeight,
        buttons: Array.from(document.querySelectorAll(".contact-actions .btn")).map((button) => {
          const rect = button.getBoundingClientRect();
          return { height: rect.height, fits: button.scrollWidth <= button.clientWidth + 1 };
        }),
        choices: Array.from(document.querySelectorAll(".ff-choice")).map((choice) => choice.getBoundingClientRect().height),
      };
    });
    const caseId = `${viewport.width}x${viewport.height}`;
    geometry.buttons.forEach((button) => {
      expect(button.height, `action target at ${caseId}`).toBeGreaterThanOrEqual(48);
      expect(button.fits, `action copy at ${caseId}`).toBe(true);
    });
    expect(Math.min(...geometry.choices), `choice target at ${caseId}`).toBeGreaterThanOrEqual(44);
    expect(geometry.actionsBottom, `dock collision at ${caseId}`).toBeLessThanOrEqual(geometry.dockTop - 6);
    await expectNoHorizontalOverflow(expect, page, `Contact ${caseId}`);
  }
});
