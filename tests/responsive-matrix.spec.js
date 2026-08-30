"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow, orderedProducts, featuredProductCount } = require("./helpers");

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
      secondWidth: second ? second.width : 0,
      secondPeek,
      pagerVisible: Boolean(pager && pagerStyle.display !== "none" && pager.getBoundingClientRect().height > 0),
    };
  });

  const mobileGallery = viewport.width <= 900;
  expect.soft(geometry.visibleCards, `${viewport.label}: gallery has fewer than two usable cards`).toBeGreaterThanOrEqual(2);

  if (mobileGallery) {
    expect.soft(geometry.visibleCards, `${viewport.label}: mobile catalogue does not expose all canonical products`).toBe(orderedProducts.length);
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
    // The approved museum rhythm is deliberately asymmetric: the first row is
    // a complementary 7/5 split and the second reverses it. Archive cards use
    // three span-4 columns after expansion. Protect the editorial relationship
    // instead of the superseded full-width feature-record layout.
    expect.soft(geometry.columns.split(" ").filter(Boolean), `${viewport.label}: desktop gallery lost its twelve-column editorial grid`).toHaveLength(12);
    expect.soft(geometry.firstWidth / geometry.clientWidth, `${viewport.label}: lead project lost its seven-column weight`).toBeGreaterThan(0.55);
    expect.soft(geometry.firstWidth / geometry.clientWidth, `${viewport.label}: lead project overwhelms the editorial pair`).toBeLessThan(0.61);
    expect.soft(geometry.secondWidth / geometry.clientWidth, `${viewport.label}: supporting project lost its five-column weight`).toBeGreaterThan(0.37);
    expect.soft(geometry.secondWidth / geometry.clientWidth, `${viewport.label}: supporting project overwhelms the lead`).toBeLessThan(0.43);
    expect.soft(geometry.scrollWidth, `${viewport.label}: desktop gallery retained horizontal carousel overflow`).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect.soft(geometry.pagerVisible, `${viewport.label}: mobile pager leaked into desktop layout`).toBe(false);
  }
}

async function expectAboutProofLayout(page, viewport) {
  const proof = page.locator("#about .about-proof");
  await proof.scrollIntoViewIfNeeded();
  await afterResponsiveLayout(page);

  const geometry = await proof.evaluate((element) => {
    const section = element.closest("section");
    const shell = section.querySelector(":scope > .shell");
    const heading = section.querySelector(".sec-head h2");
    const shellRect = shell.getBoundingClientRect();
    const proofRect = element.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    const lines = Array.from(heading.querySelectorAll(".sec-title-line"));
    const rows = Array.from(element.querySelectorAll(".about-proof-route li"));
    const textTargets = Array.from(element.querySelectorAll([
      ".about-proof-lead",
      ".about-proof-note",
      ".about-proof-paragraph",
      ".about-proof-route li > span:last-child",
      ".about-stat-v",
      ".about-stat-k",
      ".about-proof-focus li > span:last-child",
    ].join(",")));

    return {
      viewportWidth: innerWidth,
      shell: { left: shellRect.left, right: shellRect.right },
      proof: {
        left: proofRect.left,
        right: proofRect.right,
        width: proofRect.width,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      },
      heading: {
        left: headingRect.left,
        right: headingRect.right,
        scrollWidth: heading.scrollWidth,
        clientWidth: heading.clientWidth,
      },
      lines: lines.map((line) => {
        const rect = line.getBoundingClientRect();
        return { text: line.textContent, left: rect.left, right: rect.right, width: rect.width };
      }),
      rowCount: rows.length,
      rowColumns: rows[0] ? getComputedStyle(rows[0]).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
      statCount: element.querySelectorAll(".about-stat").length,
      leadSize: Number.parseFloat(getComputedStyle(element.querySelector(".about-proof-lead")).fontSize),
      textOverflows: textTargets.filter((target) => target.scrollWidth > target.clientWidth + 1).map((target) => ({
        className: target.className,
        text: target.textContent.trim().slice(0, 80),
        scrollWidth: target.scrollWidth,
        clientWidth: target.clientWidth,
      })),
    };
  });

  expect.soft(geometry.proof.left, `${viewport.label}: About proof escapes the shell on the left`).toBeGreaterThanOrEqual(geometry.shell.left - 1);
  expect.soft(geometry.proof.right, `${viewport.label}: About proof escapes the shell on the right`).toBeLessThanOrEqual(geometry.shell.right + 1);
  expect.soft(geometry.proof.scrollWidth, `${viewport.label}: About proof has internal horizontal overflow`).toBeLessThanOrEqual(geometry.proof.clientWidth + 1);
  expect.soft(geometry.heading.scrollWidth, `${viewport.label}: About heading overflows its box`).toBeLessThanOrEqual(geometry.heading.clientWidth + 1);
  expect.soft(geometry.lines).toHaveLength(3);
  for (const line of geometry.lines) {
    expect.soft(line.left, `${viewport.label}: About title line starts outside shell: ${line.text}`).toBeGreaterThanOrEqual(geometry.shell.left - 1);
    expect.soft(line.right, `${viewport.label}: About title line ends outside shell: ${line.text}`).toBeLessThanOrEqual(geometry.shell.right + 1);
  }
  expect.soft(geometry.rowCount, `${viewport.label}: ownership route is incomplete`).toBe(4);
  expect.soft(geometry.rowColumns, `${viewport.label}: ownership route lost its three-part reading order`).toBe(3);
  expect.soft(geometry.statCount, `${viewport.label}: About facts are incomplete`).toBe(4);
  expect.soft(geometry.leadSize, `${viewport.label}: About lead is too small to read`).toBeGreaterThanOrEqual(viewport.width <= 900 ? 23 : 27);
  expect.soft(geometry.textOverflows, `${viewport.label}: About text clips: ${JSON.stringify(geometry.textOverflows)}`).toEqual([]);
}

test.describe("stage 9 responsive regression matrix", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The responsive matrix deliberately executes once in the controlled desktop-chromium project."
    );
  });

  test.afterEach(async ({ page }) => {
    // Release WebGL and the shared motion runtime before trace/video teardown.
    // This keeps Windows GPU-process cleanup outside the assertion timeout;
    // the full matrix above still runs against the real document.
    if (!page.isClosed()) {
      await page.goto("about:blank", { waitUntil: "commit", timeout: 5000 }).catch(() => {});
    }
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

  test("About proof typography and reading order survive the canonical viewport sweep", async ({ page }) => {
    // Keep the new proof-note contract independent from the project carousel.
    // This makes a regression point to one layout owner and prevents two full
    // sweeps from sharing one timeout while preserving all eleven viewports.
    test.setTimeout(90000);
    await page.setViewportSize({ width: 390, height: 844 });
    await settleMain(page, "#about");
    await expect(page.locator("html")).toHaveAttribute("data-deep-link-settled", "about");

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await afterResponsiveLayout(page);
      await expectMainIsRendered(page, `${viewport.label}: About`);
      await expectNoHorizontalOverflow(expect, page, `${viewport.label}: About`);
      await expectAboutProofLayout(page, viewport);
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
    await expectAboutProofLayout(page, { width: 390, height: 844, label: "200% text zoom" });
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

    // Mobile is the complete catalogue by contract: there is no ambiguous
    // expansion command. Move the filmstrip, rotate it, then cross the 900px
    // breakpoint where the curated desktop opening deliberately returns.
    await page.setViewportSize({ width: 390, height: 844 });
    await afterResponsiveLayout(page);
    const expand = page.locator(".proj-expand");
    await expect(expand).toHaveCount(0);
    await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
    await expect(page.locator(".proj-filter-chip")).toHaveCount(6);
    await page.locator(".proj-chapters-controls button").last().click();
    await expect.poll(() => page.locator(".proj-grid").evaluate((grid) => grid.scrollLeft)).toBeGreaterThan(0);

    await page.setViewportSize({ width: 844, height: 390 });
    await afterResponsiveLayout(page);
    await expect(expand).toHaveCount(0);
    await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
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
    await expect(page.locator(".proj-card")).toHaveCount(featuredProductCount);
    const desktopExpand = page.locator(".proj-expand");
    await expect(desktopExpand).toBeVisible();
    await desktopExpand.evaluate((button) => button.click());
    await expect(desktopExpand).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".proj-card")).toHaveCount(orderedProducts.length);
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
