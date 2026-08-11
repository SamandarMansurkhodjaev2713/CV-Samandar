"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow } = require("./helpers");

const VIEWPORTS = [
  { width: 320, height: 568, label: "320x568 portrait" },
  { width: 360, height: 800, label: "360x800 portrait" },
  { width: 375, height: 812, label: "375x812 portrait" },
  { width: 390, height: 844, label: "390x844 portrait" },
  { width: 430, height: 932, label: "430x932 portrait" },
  { width: 768, height: 1024, label: "768x1024 tablet" },
  { width: 844, height: 390, label: "844x390 phone landscape" },
  { width: 1024, height: 768, label: "1024x768 landscape" },
  { width: 1280, height: 800, label: "1280x800 desktop" },
  { width: 1440, height: 1000, label: "1440x1000 desktop" },
  { width: 1920, height: 1080, label: "1920x1080 desktop" },
];

async function afterResponsiveLayout(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function expectMainIsRendered(page, label) {
  const state = await page.locator("#main").evaluate((main) => {
    const rect = main.getBoundingClientRect();
    const style = getComputedStyle(main);
    return {
      width: rect.width,
      height: rect.height,
      display: style.display,
      visibility: style.visibility,
      opacity: Number.parseFloat(style.opacity),
    };
  });

  expect.soft(state.width, `${label}: #main has no width`).toBeGreaterThan(0);
  expect.soft(state.height, `${label}: #main has no height`).toBeGreaterThan(0);
  expect.soft(state.display, `${label}: #main is display:none`).not.toBe("none");
  expect.soft(state.visibility, `${label}: #main is hidden`).not.toBe("hidden");
  expect.soft(state.opacity, `${label}: #main is transparent`).toBeGreaterThan(0);
}

async function expectFocusIsUnobscured(page, locator, label) {
  await locator.focus();
  await locator.evaluate((element) => {
    try {
      element.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
    } catch (error) {
      element.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
    }
  });
  await afterResponsiveLayout(page);

  const state = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const inset = Math.min(4, rect.width / 4, rect.height / 4);
    const points = [
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [rect.left + inset, rect.top + inset],
      [rect.right - inset, rect.top + inset],
      [rect.left + inset, rect.bottom - inset],
      [rect.right - inset, rect.bottom - inset],
    ].filter(([x, y]) => x >= 0 && x < innerWidth && y >= 0 && y < innerHeight);

    const blockers = points.map(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      const related = !hit || element === hit || element.contains(hit) || hit.contains(element);
      return related ? null : {
        point: [Math.round(x), Math.round(y)],
        element: hit.id ? `#${hit.id}` : hit.className || hit.tagName,
        position: getComputedStyle(hit).position,
      };
    }).filter(Boolean);

    return {
      focused: document.activeElement === element,
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      },
      viewport: { width: innerWidth, height: innerHeight },
      blockers,
    };
  });

  expect.soft(state.focused, `${label}: focus did not reach the intended control`).toBe(true);
  expect.soft(state.rect.left, `${label}: focus is clipped on the left`).toBeGreaterThanOrEqual(-1);
  expect.soft(state.rect.right, `${label}: focus is clipped on the right`).toBeLessThanOrEqual(state.viewport.width + 1);
  expect.soft(state.rect.top, `${label}: fixed/sticky UI clipped focus above the viewport`).toBeGreaterThanOrEqual(-1);
  expect.soft(state.rect.bottom, `${label}: fixed/sticky UI clipped focus below the viewport`).toBeLessThanOrEqual(state.viewport.height + 1);
  expect.soft(state.blockers, `${label}: focus is covered at hit-test points`).toEqual([]);
}

async function expectProjectGalleryLayout(page, viewport) {
  await page.locator(".proj-grid").evaluate((grid) => {
    grid.scrollLeft = 0;
  });
  await afterResponsiveLayout(page);

  const geometry = await page.locator(".proj-grid").evaluate((grid) => {
    const style = getComputedStyle(grid);
    const cards = Array.from(grid.querySelectorAll(".proj-card")).filter((card) => {
      const cardStyle = getComputedStyle(card);
      const rect = card.getBoundingClientRect();
      return cardStyle.display !== "none" && rect.width > 0 && rect.height > 0;
    });
    const first = cards[0] && cards[0].getBoundingClientRect();
    const second = cards[1] && cards[1].getBoundingClientRect();
    const pager = document.querySelector(".proj-chapters");
    const pagerStyle = pager && getComputedStyle(pager);
    const secondPeek = second
      ? Math.max(0, Math.min(second.right, innerWidth) - Math.max(second.left, 0))
      : 0;

    return {
      display: style.display,
      overflowX: style.overflowX,
      scrollSnapType: style.scrollSnapType,
      columns: style.gridTemplateColumns,
      clientWidth: grid.clientWidth,
      scrollWidth: grid.scrollWidth,
      visibleCards: cards.length,
      firstWidth: first ? first.width : 0,
      secondPeek,
      pagerVisible: Boolean(pager && pagerStyle.display !== "none" && pager.getBoundingClientRect().height > 0),
    };
  });

  const mobileGallery = viewport.width <= 900;
  expect.soft(geometry.visibleCards, `${viewport.label}: gallery has fewer than two usable cards`).toBeGreaterThanOrEqual(2);

  if (mobileGallery) {
    expect.soft(geometry.display, `${viewport.label}: mobile gallery is not a flex track`).toBe("flex");
    expect.soft(geometry.overflowX, `${viewport.label}: mobile gallery cannot scroll horizontally`).toBe("auto");
    expect.soft(geometry.scrollSnapType, `${viewport.label}: mobile gallery lost scroll snap`).toContain("x");
    expect.soft(geometry.scrollWidth, `${viewport.label}: mobile gallery has no horizontal range`).toBeGreaterThan(geometry.clientWidth + 1);
    expect.soft(geometry.firstWidth / geometry.clientWidth, `${viewport.label}: project card lost its intentional next-card peek`).toBeGreaterThan(0.75);
    expect.soft(geometry.firstWidth / geometry.clientWidth, `${viewport.label}: project card fills the whole carousel`).toBeLessThan(0.95);
    expect.soft(geometry.secondPeek, `${viewport.label}: next project is not visibly discoverable`).toBeGreaterThan(0);
    expect.soft(geometry.pagerVisible, `${viewport.label}: mobile project pager is hidden`).toBe(true);
  } else {
    expect.soft(geometry.display, `${viewport.label}: desktop gallery is not a grid`).toBe("grid");
    // Featured projects are intentionally full-width editorial records on a
    // twelve-column system; archive cards become two span-6 columns only after
    // expansion. The old two-track assertion described the superseded card
    // grid and incorrectly rejected the approved composition.
    expect.soft(geometry.columns.split(" ").filter(Boolean), `${viewport.label}: desktop gallery lost its twelve-column editorial grid`).toHaveLength(12);
    expect.soft(geometry.firstWidth / geometry.clientWidth, `${viewport.label}: featured project no longer owns the editorial row`).toBeGreaterThan(0.98);
    expect.soft(geometry.scrollWidth, `${viewport.label}: desktop gallery retained horizontal carousel overflow`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect.soft(geometry.pagerVisible, `${viewport.label}: mobile pager leaked into desktop layout`).toBe(false);
  }
}

test.describe("stage 9 responsive regression matrix", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The responsive matrix deliberately executes once in the controlled desktop-chromium project."
    );
  });

  test("main shell, project gallery and unobscured focus survive the canonical viewport sweep", async ({ page }) => {
    // Eleven real reflows plus focus hit-testing are intentionally serialized
    // in one browser page. The larger ceiling is for that matrix, not a wait.
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await settleMain(page, "#projects");
    await expect(page.locator("html")).toHaveAttribute("data-deep-link-settled", "projects");

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await afterResponsiveLayout(page);

      await expectMainIsRendered(page, viewport.label);
      await expectNoHorizontalOverflow(expect, page, viewport.label);
      await expectProjectGalleryLayout(page, viewport);
      await expectFocusIsUnobscured(
        page,
        page.locator(".proj-card:visible .proj-cta").first(),
        `${viewport.label}: primary project action`
      );
    }
  });

  test("200% text zoom and active menu/gallery survive orientation and breakpoint changes", async ({ page }) => {
    // This scenario performs three live breakpoint transitions while preserving
    // UI state; it contains no sleeps and uses assertion-driven readiness only.
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await settleMain(page, "#projects");
    await expect(page.locator("html")).toHaveAttribute("data-deep-link-settled", "projects");

    // A doubled root font is the deterministic text-only zoom analogue: it
    // exercises rem-based typography/reflow without conflating the assertion
    // with device-pixel scaling or a visual screenshot zoom.
    await page.locator("html").evaluate((html) => html.style.setProperty("font-size", "200%", "important"));
    await afterResponsiveLayout(page);
    const rootFontSize = await page.locator("html").evaluate((html) => Number.parseFloat(getComputedStyle(html).fontSize));
    expect(rootFontSize).toBeGreaterThanOrEqual(31.5);
    await expectMainIsRendered(page, "200% text zoom");
    await expectNoHorizontalOverflow(expect, page, "200% text zoom");
    await expectFocusIsUnobscured(
      page,
      page.locator(".proj-card:visible .proj-cta").first(),
      "200% text zoom: primary project action"
    );
    await page.locator("html").evaluate((html) => html.style.removeProperty("font-size"));
    await afterResponsiveLayout(page);

    // Keep the fullscreen menu genuinely open while the viewport rotates.
    await page.locator(".nav-burger").click();
    await expect(page.locator("#site-menu")).toHaveClass(/is-open/);
    await expect(page.locator("#main")).toHaveAttribute("aria-hidden", "true");
    await page.setViewportSize({ width: 844, height: 390 });
    await afterResponsiveLayout(page);
    await expect(page.locator("#site-menu")).toHaveClass(/is-open/);
    await expect(page.locator("#main")).toHaveAttribute("aria-hidden", "true");
    await expectNoHorizontalOverflow(expect, page, "open menu after 844x390 orientation change");
    await expectFocusIsUnobscured(
      page,
      page.locator(".nav-menu-close"),
      "open menu after 844x390 orientation change"
    );
    await page.keyboard.press("Escape");
    await expect(page.locator("#site-menu")).not.toHaveClass(/is-open/);
    await expect(page.locator("#main")).not.toHaveAttribute("aria-hidden", "true");

    // Expand and move the carousel before rotating it, then cross the 900px
    // breakpoint. Expansion is user state and must survive both transitions.
    await page.setViewportSize({ width: 390, height: 844 });
    await afterResponsiveLayout(page);
    const expand = page.locator(".proj-expand");
    await expand.evaluate((button) => button.click());
    await expect(expand).toHaveAttribute("aria-expanded", "true");
    await page.locator(".proj-chapters-controls button").last().click();
    await expect.poll(() => page.locator(".proj-grid").evaluate((grid) => grid.scrollLeft)).toBeGreaterThan(0);

    await page.setViewportSize({ width: 844, height: 390 });
    await afterResponsiveLayout(page);
    await expect(expand).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".mobile-dock")).toBeHidden();
    await expect(page.locator(".nav-counter")).toBeVisible();
    await expectNoHorizontalOverflow(expect, page, "expanded gallery after 844x390 orientation change");
    const landscapeGallery = await page.locator(".proj-grid").evaluate((grid) => ({
      display: getComputedStyle(grid).display,
      scrollLeft: grid.scrollLeft,
      scrollWidth: grid.scrollWidth,
      clientWidth: grid.clientWidth,
    }));
    expect(landscapeGallery.display).toBe("flex");
    expect(landscapeGallery.scrollLeft).toBeGreaterThan(0);
    expect(landscapeGallery.scrollWidth).toBeGreaterThan(landscapeGallery.clientWidth);
    await expectFocusIsUnobscured(
      page,
      page.locator(".proj-card:visible .proj-cta").nth(1),
      "expanded gallery after 844x390 orientation change"
    );

    await page.setViewportSize({ width: 1024, height: 768 });
    await afterResponsiveLayout(page);
    await expect(expand).toHaveAttribute("aria-expanded", "true");
    await expectNoHorizontalOverflow(expect, page, "expanded gallery after desktop breakpoint");
    const desktopGallery = await page.locator(".proj-grid").evaluate((grid) => ({
      display: getComputedStyle(grid).display,
      scrollWidth: grid.scrollWidth,
      clientWidth: grid.clientWidth,
    }));
    expect(desktopGallery.display).toBe("grid");
    expect(desktopGallery.scrollWidth).toBeLessThanOrEqual(desktopGallery.clientWidth + 1);
    await expect(page.locator(".proj-chapters")).toBeHidden();
    await expectFocusIsUnobscured(
      page,
      page.locator(".proj-card:visible .proj-cta").nth(1),
      "expanded gallery after desktop breakpoint"
    );
  });
});
