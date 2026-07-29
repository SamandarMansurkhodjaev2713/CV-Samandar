"use strict";

const { test, expect } = require("@playwright/test");

test("pre-React script failure resolves to a useful recovery surface", async ({ page, isMobile }) => {
  test.skip(isMobile, "The recovery contract is viewport-independent and covered once.");
  test.setTimeout(20000);
  await page.route("**/src/components/app.js*", (route) => route.abort("failed"));
  await page.goto("/#hero", { waitUntil: "domcontentloaded" });
  const recovery = page.getByRole("alert");
  await expect(recovery).toBeVisible({ timeout: 12000 });
  await expect(recovery.getByRole("heading")).toContainText("Сайт не загрузился");
  await expect(recovery.getByRole("link", { name: "Написать в Telegram" }))
    .toHaveAttribute("href", "https://t.me/killallofthem13");
});
