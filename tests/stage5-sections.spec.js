"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow } = require("./helpers");

test("Stack presents QA as a cross-cutting layer and lists the verified toolset", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Content structure is engine-independent");
  await settleMain(page, "#skills");

  await expect(page.locator("#skills .skx-qa")).toHaveCount(1);
  await expect(page.locator("#skills .skx-row")).toHaveCount(5);
  await expect(page.locator("#skills .skx-qa")).toContainText("Playwright");
  await expect(page.locator("#skills .skx-qa")).toContainText("Postman / Newman");
  await expect(page.locator("#skills .skx-qa")).toContainText("Swagger / OpenAPI");
  await expect(page.locator("#skills .skx-qa")).toContainText("REST / GraphQL");
  await expect(page.locator("#skills canvas, #skills svg, #skills [role=tablist]")).toHaveCount(0);

  const order = await page.locator("#skills .skx").evaluate((root) => ({
    qa: Array.from(root.children).indexOf(root.querySelector(".skx-qa")),
    rows: Array.from(root.children).indexOf(root.querySelector(".skx-rows")),
  }));
  expect(order.qa).toBeLessThan(order.rows);
});

test("Services keeps every APG target stable and opens the actual related product", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop tab semantics are shared by engines");
  await settleMain(page, "#services");

  const tabs = page.locator("#services .svc-tab");
  const panels = page.locator("#services .svc-panel");
  await expect(tabs).toHaveCount(8);
  await expect(panels).toHaveCount(8);
  await expect(page.locator("#services .svc-panel:visible")).toHaveCount(1);

  for (let index = 0; index < 8; index += 1) {
    await expect(tabs.nth(index)).toHaveAttribute("aria-controls", `svc-panel-${index}`);
    await expect(page.locator(`#svc-panel-${index}`)).toHaveAttribute("aria-labelledby", `svc-tab-${index}`);
  }

  await expect(page.locator("#svc-panel-0 .svc-related")).toHaveAttribute("href", "projects/ttyl/");
  await expect(page.locator("#svc-panel-0 .svc-related")).not.toHaveAttribute("target", "_blank");

  await tabs.first().focus();
  await tabs.first().press("End");
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
  await tabs.nth(1).click();
  await expect(page.locator("#svc-panel-1 .svc-related")).toHaveAttribute("href", "https://samandarmansurkhodjaev2713.github.io/3d-landing/");
  await expect(page.locator("#svc-panel-1 .svc-related")).toHaveAttribute("target", "_blank");
  await expect(page.locator("#svc-panel-1 .svc-related")).toHaveAttribute("rel", "noopener noreferrer");
});

test("Services names, metadata and related-case language are complete in RU, EN and UZ", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Locale content is viewport-independent");
  await settleMain(page, "#services");
  const cases = [
    { button: "RU", lang: "ru", first: "Веб-продукты", meta: "8 · услуг", related: "Связанный кейс" },
    { button: "EN", lang: "en", first: "Web Apps", meta: "8 · services", related: "Related case" },
    { button: "UZ", lang: "uz", first: "Veb-mahsulotlar", meta: "8 · xizmat", related: "Bog'liq keys" },
  ];
  for (const item of cases) {
    await page.locator(".nav .lang button", { hasText: item.button }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", item.lang);
    await expect(page.locator("#services .svc-tab").first()).toContainText(item.first);
    await expect(page.locator("#services .sec-meta")).toContainText(item.meta);
    await expect(page.locator("#svc-panel-0 .svc-related-eyebrow")).toContainText(item.related);
  }
});

test("mobile Services is a real accordion with reachable controls", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await settleMain(page, "#services");
    const heads = page.locator("#services .svc-acc-head");
    await expect(heads).toHaveCount(8);
    if ((await heads.first().getAttribute("aria-expanded")) !== "true") await heads.first().click();
    await expect(heads.first()).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#svc-acc-body-0")).toBeVisible();
    await heads.nth(1).click();
    await expect(heads.first()).toHaveAttribute("aria-expanded", "false");
    await expect(heads.nth(1)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#svc-acc-body-1")).toBeVisible();

    const targets = await heads.evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { height: rect.height, left: rect.left, right: rect.right };
    }));
    for (const target of targets) {
      expect(target.height).toBeGreaterThanOrEqual(43);
      expect(target.left).toBeGreaterThanOrEqual(-1);
      expect(target.right).toBeLessThanOrEqual(viewport.width + 1);
    }
    await expectNoHorizontalOverflow(expect, page, `Services ${viewport.width}x${viewport.height}`);
  }
});

test("FAQ remains a readable transcript and Quality makes risk-proportional promises", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Copy and structure are engine-independent");
  await settleMain(page, "#faq");
  await expect(page.locator("#faq .dlg-turn")).toHaveCount(7);
  await expect(page.locator("#faq button, #faq details")).toHaveCount(0);
  await expect(page.locator("#faq")).not.toContainText(/1[–-]2 недели|1\.5 месяца|за несколько дней/i);
  await expect(page.locator("#faq")).toContainText(/проектный эскиз/i);

  await expect(page.locator("#trust .proto-clause")).toHaveCount(6);
  await expect(page.locator("#trust")).not.toContainText(/CI\/CD на каждый пуш|красный билд не уезжает/i);
  await expect(page.locator("#trust")).toContainText("Автопроверки до релиза");
  await expect(page.locator("#trust")).toContainText("Наблюдаемость по риску");
  await expect(page.locator("#trust .proto-head-id")).toHaveText("QA / ПРОТОКОЛ");
});

test("Stack, FAQ and Quality remain readable at phone and compact-landscape sizes", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await settleMain(page, "#skills");
    const typography = await page.evaluate(() => ({
      skill: Number.parseFloat(getComputedStyle(document.querySelector(".skx-item")).fontSize),
      question: Number.parseFloat(getComputedStyle(document.querySelector(".dlg-line--q .dlg-text")).fontSize),
      answer: Number.parseFloat(getComputedStyle(document.querySelector(".dlg-line--a .dlg-text")).fontSize),
      protocol: Number.parseFloat(getComputedStyle(document.querySelector(".proto-v")).fontSize),
    }));
    expect(typography.skill).toBeGreaterThanOrEqual(12);
    expect(typography.question).toBeGreaterThanOrEqual(17);
    expect(typography.answer).toBeGreaterThanOrEqual(14);
    expect(typography.protocol).toBeGreaterThanOrEqual(13);
    await expectNoHorizontalOverflow(expect, page, `Stage 5 ${viewport.width}x${viewport.height}`);
  }
});
