"use strict";

const { test, expect } = require("@playwright/test");

test("optional sound preference can be torn down without orphaned listeners", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "listener lifecycle is browser-independent");
  await page.addInitScript(() => localStorage.setItem("sm-sound", "1"));
  await page.goto("/?sound-lifecycle=1#hero", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await expect.poll(() => page.evaluate(() => Boolean(window.SMSound))).toBe(true);

  const before = await page.evaluate(() => ({
    debug: window.SMSound.__debug(),
    classOn: document.documentElement.classList.contains("sm-sound"),
  }));
  expect(before.debug.armed).toBe(true);
  expect(before.classOn).toBe(true);

  const after = await page.evaluate(() => {
    window.SMSound.destroy();
    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    const toggle = document.querySelector(".sound-toggle");
    if (toggle) toggle.click();
    return {
      debug: window.SMSound.__debug(),
      isOn: window.SMSound.isOn(),
      classOn: document.documentElement.classList.contains("sm-sound"),
      pressed: toggle && toggle.getAttribute("aria-pressed"),
    };
  });

  expect(after.debug).toEqual({ destroyed: true, armed: false, context: "none" });
  expect(after.isOn).toBe(false);
  expect(after.classOn).toBe(false);
  expect(after.pressed).toBe("false");
});
