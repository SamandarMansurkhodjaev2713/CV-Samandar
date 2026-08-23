"use strict";

const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const { settleMain, switchMainLanguage, expectNoHorizontalOverflow } = require("./helpers");

const PDF_ROUTE = "/assets/docs/Samandar_Mansurkhodjaev_CV_QA.pdf";

test("CV exposes one valid document landmark, complete APG tabs and honest actions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Semantic structure is engine-independent");
  await settleMain(page, "#cv");

  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("#cv main")).toHaveCount(0);

  const cvTab = page.locator("#cv-tab-cv");
  const readmeTab = page.locator("#cv-tab-readme");
  await expect(cvTab).toHaveAttribute("aria-controls", "cv-panel-cv");
  await expect(readmeTab).toHaveAttribute("aria-controls", "cv-panel-readme");
  await expect(page.locator("#cv-panel-cv")).toHaveAttribute("aria-labelledby", "cv-tab-cv");
  await expect(page.locator("#cv-panel-readme")).toHaveAttribute("aria-labelledby", "cv-tab-readme");
  await expect(cvTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#cv-panel-cv")).toBeVisible();
  await expect(page.locator("#cv-panel-readme")).toBeHidden();

  await cvTab.focus();
  await cvTab.press("ArrowRight");
  await expect(readmeTab).toBeFocused();
  await expect(readmeTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#cv-panel-readme")).toBeVisible();
  await expect(page.locator("#cv-panel-cv")).toBeHidden();

  await readmeTab.press("Home");
  await expect(cvTab).toBeFocused();
  await expect(cvTab).toHaveAttribute("aria-selected", "true");
  await cvTab.press("End");
  await expect(readmeTab).toBeFocused();
  await readmeTab.press("ArrowLeft");
  await expect(cvTab).toBeFocused();

  const download = page.locator('.cv-action[download="Samandar_Mansurkhodjaev_CV_QA.pdf"]');
  await expect(download).toHaveAttribute("href", "assets/docs/Samandar_Mansurkhodjaev_CV_QA.pdf");
  await expect(page.locator(".cv-doc-actions button")).toContainText("Печать");
  await expect(page.locator("#cv")).not.toContainText("< 24h");
  await expect(page.locator("#cv")).not.toContainText("C1");
  await expect(page.locator("#cv .cv-role-title")).toContainText([/QA Engineer/, /Независимые/, /Специалист по работе с клиентами/]);
  const documentInk = await page.locator(".cv-doc").evaluate((node) => {
    const root = getComputedStyle(node);
    return {
      token: root.getPropertyValue("--text").trim().toUpperCase(),
      name: getComputedStyle(node.querySelector(".cv-id-name")).color,
      role: getComputedStyle(node.querySelector(".cv-id-role")).color,
    };
  });
  expect(documentInk.token).toBe("#F4F1EA");
  expect(documentInk.name).toContain("244, 241, 234");
  expect(documentInk.role).toContain("244, 241, 234");
});

test("canonical QA PDF is a real local two-page download", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The binary is shared by all viewports");
  const localPath = path.join(__dirname, "..", "assets", "docs", "Samandar_Mansurkhodjaev_CV_QA.pdf");
  const bytes = fs.readFileSync(localPath);
  expect(bytes.byteLength).toBeGreaterThan(100000);
  expect(bytes.subarray(0, 5).toString("ascii")).toBe("%PDF-");

  const response = await page.request.get(PDF_ROUTE);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("application/pdf");
  expect((await response.body()).byteLength).toBe(bytes.byteLength);
});

test("CV document controls and facts localize in RU, EN and UZ", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Locale content is viewport-independent");
  await settleMain(page, "#cv");
  const cases = [
    { button: "RU", lang: "ru", download: "Скачать PDF", role: "Специалист по работе с клиентами" },
    { button: "EN", lang: "en", download: "Download PDF", role: "Customer Support Specialist" },
    { button: "UZ", lang: "uz", download: "PDF yuklash", role: "Mijozlar bilan ishlash bo'yicha mutaxassis" },
  ];

  for (const item of cases) {
    await switchMainLanguage(page, item.button);
    await expect(page.locator("html")).toHaveAttribute("lang", item.lang);
    await expect(page.locator(".cv-action--primary")).toContainText(item.download);
    await expect(page.locator("#cv .cv-role-title", { hasText: item.role })).toHaveCount(1);
    await expect(page.locator("#cv .cv-lang-bar")).toHaveCount(0);
  }
});

test("CV stays operable and unclipped across narrow portrait and landscape", async ({ page }) => {
  const viewports = [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await settleMain(page, "#cv");
    await expect(page.locator("html")).toHaveAttribute("data-deep-link-settled", "cv");
    await expect(page.locator("#cv")).toBeVisible();
    const geometry = await page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const dock = document.querySelector(".mobile-dock");
      const dockRect = dock && getComputedStyle(dock).display !== "none" ? dock.getBoundingClientRect() : null;
      const measure = (selector) => Array.from(document.querySelectorAll(selector)).map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          intersectsDock: Boolean(dockRect && rect.bottom > dockRect.top && rect.top < dockRect.bottom),
        };
      });
      const doc = document.querySelector(".cv-doc").getBoundingClientRect();
      return {
        doc: { left: doc.left, right: doc.right, width: doc.width },
        tabs: measure(".cv-doc-tab"),
        actions: measure(".cv-action"),
        roleButtons: measure(".cv-role-head"),
        viewportWidth,
      };
    });

    expect(geometry.doc.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.doc.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    for (const target of [...geometry.tabs, ...geometry.actions, ...geometry.roleButtons]) {
      expect(target.height, `target height at ${viewport.width}x${viewport.height}`).toBeGreaterThanOrEqual(43);
      expect(target.left).toBeGreaterThanOrEqual(-1);
      expect(target.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    }
    for (const target of [...geometry.tabs, ...geometry.actions]) expect(target.intersectsDock).toBeFalsy();

    const roleButtons = page.locator(".cv-role-head");
    for (let index = 0; index < await roleButtons.count(); index += 1) {
      await roleButtons.nth(index).focus();
      await expect(roleButtons.nth(index)).toBeFocused();
      await expect.poll(() => roleButtons.nth(index).evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const dock = document.querySelector(".mobile-dock");
        const dockRect = dock && getComputedStyle(dock).display !== "none" ? dock.getBoundingClientRect() : null;
        const state = {
          visible: rect.top >= -1 && rect.bottom <= (dockRect ? dockRect.top : window.innerHeight) + 1,
          top: Math.round(rect.top),
          bottom: Math.round(rect.bottom),
          dockTop: dockRect ? Math.round(dockRect.top) : null,
          dockOffsetTop: dock ? Math.round(dock.offsetTop) : null,
          dockClass: dock ? dock.className : null,
          viewportHeight: window.innerHeight,
          scrollY: Math.round(window.scrollY),
          focused: document.activeElement === node,
        };
        return state.visible && state.focused ? "ok" : JSON.stringify(state);
      }), {
        message: `focused CV role ${index} at ${viewport.width}x${viewport.height} must remain between nav and dock`,
      }).toBe("ok");
    }
    await expectNoHorizontalOverflow(expect, page, `CV ${viewport.width}x${viewport.height}`);
  }
});
