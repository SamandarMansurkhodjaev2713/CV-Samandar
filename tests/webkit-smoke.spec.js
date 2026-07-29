"use strict";

const { test, expect } = require("@playwright/test");
const { orderedProducts, expectNoHorizontalOverflow } = require("./helpers");

test("iPhone WebKit keeps the critical portfolio journey usable", async ({ page }) => {
  test.setTimeout(120000);

  await page.goto("/?e2e=1#projects", { waitUntil: "domcontentloaded" });
  await page.locator(".proj-card").first().waitFor({ state: "attached" });
  await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
  await expect(page.locator(".proj-card:visible")).toHaveCount(4);
  await expectNoHorizontalOverflow(expect, page, "webkit-main");

  const expand = page.locator(".proj-expand");
  await expect(expand).toBeVisible();
  await expand.evaluate((button) => button.click());
  await expect(page.locator(".proj-card:visible")).toHaveCount(orderedProducts.length);

  await page.getByRole("button", { name: "Open menu" }).evaluate((button) => button.click());
  await expect(page.locator(".nav-menu")).toHaveAttribute("aria-hidden", "false");
  await page.locator(".nav-menu-lang button").filter({ hasText: /^EN$/ }).evaluate((button) => button.click());
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/projects/chat-app/?e2e=1", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "EN", exact: true }).evaluate((button) => button.click());
  const chat = orderedProducts.find((product) => product.slug === "chat-app");
  await expect(page.locator("h1")).toHaveText(chat.i18n.en.name);
  await expect(page.locator(".lp-quick")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("[data-lp-chapter]")).toHaveCount(5);
  await expectNoHorizontalOverflow(expect, page, "webkit-chat-app");

  await page.goto("/projects/vacation-control/?e2e=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".lp-back"))
    .toHaveAttribute("href", "../../#proj-vacation-control");
});
