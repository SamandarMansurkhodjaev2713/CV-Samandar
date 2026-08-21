"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow } = require("./helpers");

test("320px project chapter stays readable and the global dock yields to it", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await settleMain(page, "#projects");

  const geometry = await page.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { top: value.top, right: value.right, bottom: value.bottom, left: value.left, width: value.width, height: value.height };
    };
    const section = document.querySelector("#projects");
    const heading = section.querySelector(".sec-head h2");
    const headingInk = heading.querySelector(".lm-i");
    const pager = section.querySelector(".proj-chapters");
    const card = section.querySelector(".proj-card");
    const title = card.querySelector(".proj-name");
    const dock = document.querySelector(".mobile-dock");
    const dockStyle = getComputedStyle(dock);
    const titleStyle = getComputedStyle(title);
    return {
      heading: rect(heading),
      headingInkTransform: getComputedStyle(headingInk).transform,
      headingInkOpacity: getComputedStyle(headingInk).opacity,
      pager: rect(pager),
      card: rect(card),
      title: rect(title),
      titleScrollHeight: title.scrollHeight,
      titleClientHeight: title.clientHeight,
      titleOverflow: titleStyle.overflow,
      dockOpacity: Number.parseFloat(dockStyle.opacity),
      dockPointerEvents: dockStyle.pointerEvents,
      sectionClasses: section.className,
    };
  });

  expect(geometry.sectionClasses).toContain("sec-nav-landed");
  expect(geometry.heading.left).toBeGreaterThanOrEqual(15);
  expect(geometry.heading.right).toBeLessThanOrEqual(305);
  expect(geometry.headingInkTransform).toBe("none");
  expect(geometry.headingInkOpacity).toBe("1");
  expect(geometry.pager.height).toBeLessThanOrEqual(72);
  expect(geometry.card.top).toBeLessThan(568);
  expect(geometry.titleOverflow).toBe("visible");
  expect(geometry.titleClientHeight + 6).toBeGreaterThanOrEqual(geometry.titleScrollHeight);
  expect(geometry.dockOpacity).toBe(0);
  expect(geometry.dockPointerEvents).toBe("none");
  await expectNoHorizontalOverflow(expect, page, "projects 320px");
});

test("mobile navigation remains light on both document chapters", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const hash of ["#cv", "#trust"]) {
    await settleMain(page, hash);
    const bars = await page.locator(".nav-burger span").evaluateAll((elements) => elements.map((element) => ({
      background: getComputedStyle(element).backgroundColor,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    })));
    expect(bars).toHaveLength(3);
    for (const bar of bars) {
      expect(bar.background, hash + " burger bar inherited document ink").toMatch(/rgb\(242, 234, 220\)/);
      expect(bar.width).toBeGreaterThanOrEqual(16);
      expect(bar.height).toBeGreaterThanOrEqual(1);
    }
  }
});

test("explicit section navigation has one motion owner and lands readable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  // SceneCinema is deliberately disabled by ?e2e=1, so exercise this engine
  // contract in its dedicated non-test-mode bootstrap just like the focused
  // scene-cinema suite does.
  await page.goto("/?cinema-contract=layout-regression#hero", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await page.waitForFunction(
    () => Boolean(window.SceneCinema && window.SceneCinema.__debug().bound),
    undefined,
    { timeout: 15000 }
  );
  const state = await page.evaluate(async () => {
    document.documentElement.classList.remove("e2e-stable");
    const result = await window.SceneCinema.navigate("about", { source: "layout-regression", instant: true });
    const target = document.getElementById("about");
    const style = getComputedStyle(target);
    return {
      result,
      hash: location.hash,
      landed: target.classList.contains("sec-nav-landed"),
      opacity: style.opacity,
      filter: style.filter,
      animationName: style.animationName,
    };
  });

  expect(state.hash).toBe("#about");
  expect(state.landed).toBe(true);
  expect(state.opacity).toBe("1");
  expect(state.filter).toBe("none");
  expect(state.animationName).toBe("none");

  const destinationHeading = page.locator("#about .sec-head h2");
  const destinationHeadingInk = destinationHeading.locator(".lm-i");
  await expect(destinationHeading).toBeVisible();
  await expect(destinationHeading).toHaveCSS("opacity", "1");
  await expect(destinationHeading).toHaveCSS("filter", "none");
  await expect(destinationHeadingInk).toHaveCSS("transform", "none");
  await expect(destinationHeadingInk).toHaveCSS("opacity", "1");
});
