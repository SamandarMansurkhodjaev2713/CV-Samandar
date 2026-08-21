"use strict";

const { test, expect } = require("@playwright/test");
const { settleMain, expectNoHorizontalOverflow } = require("./helpers");

test("Builder + QA proof rail and authored type hierarchy survive every viewport", async ({ page }) => {
  const remoteFontRequests = [];
  const retiredHeroMediaRequests = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname;
    if (host === "fonts.googleapis.com" || host === "fonts.gstatic.com") {
      remoteFontRequests.push(request.url());
    }
    if (/hero-cockpit|orbital-station|proof-instrument|release-gate/.test(request.url())) {
      retiredHeroMediaRequests.push(request.url());
    }
  });

  await settleMain(page, "#hero");
  await expect(page.locator("#sm-hero-media .hero-compiler--static")).toBeVisible();
  await expect(page.locator("#hero .hero-compiler")).toBeVisible();
  await expect(page.locator("#hero .hero-compiler-map li")).toHaveCount(3);
  await expect(page.locator("#hero .hero-input-cluster > i")).toHaveCount(5);
  await expect(page.locator(".hero-instrument-orbit")).toHaveCount(0);
  await expect(page.locator(".hero-proof-step")).toHaveCount(3);
  await expect(page.locator(".hero-roles")).toContainText(/Builder/i);
  await expect(page.locator(".hero-roles")).toContainText("QA");

  const type = await page.evaluate(() => {
    const letters = Array.from(document.querySelectorAll(".hero-name .hn-i"));
    return {
      headingPrimary: getComputedStyle(document.querySelector(".hero-statement-line--1")).fontFamily,
      headingAccent: getComputedStyle(document.querySelector(".hero-statement-line--2")).fontFamily,
      body: getComputedStyle(document.body).fontFamily,
      mono: getComputedStyle(document.querySelector(".hero-proof-label")).fontFamily,
      headlineSettled: letters.length > 0 && letters.every((letter) =>
        Number.parseFloat(getComputedStyle(letter).opacity) >= 0.99 &&
        letter.getBoundingClientRect().height > 0
      ),
    };
  });
  expect(type.headingPrimary).toContain("Inter");
  expect(type.headingAccent).toContain("Cormorant Garamond");
  expect(type.body).toContain("Inter");
  expect(type.mono).toContain("JetBrains Mono");
  expect(type.headlineSettled).toBe(true);
  expect(remoteFontRequests).toEqual([]);
  expect(retiredHeroMediaRequests).toEqual([]);
  await expectNoHorizontalOverflow(expect, page, "design-system hero");
});

test("Signal remains reader-controlled instead of auto-changing disclosure state", async ({ page }) => {
  await settleMain(page, "#signal");
  const rows = page.locator(".signal-row");
  await expect(rows).toHaveCount(6);
  await expect(page.locator('.signal-row[aria-expanded="true"]')).toHaveCount(0);
  await page.waitForTimeout(1200);
  const expanded = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-expanded")));
  expect(expanded).toEqual(["false", "false", "false", "false", "false", "false"]);
});

test("the twelve chapters keep one canonical order and truthful numbering", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "DOM order is engine-independent");
  await settleMain(page, "#hero");
  const chapters = await page.locator("section[data-section]").evaluateAll((sections) => sections.map((section) => ({
    id: section.getAttribute("data-section"),
    number: section.querySelector(".sec-head .num")?.textContent.trim().slice(0, 2) || "01",
  })));
  expect(chapters).toEqual([
    { id: "hero", number: "01" },
    { id: "signal", number: "02" },
    { id: "about", number: "03" },
    { id: "projects", number: "04" },
    { id: "builder", number: "05" },
    { id: "skills", number: "06" },
    { id: "services", number: "07" },
    { id: "cv", number: "08" },
    { id: "process", number: "09" },
    { id: "faq", number: "10" },
    { id: "trust", number: "11" },
    { id: "contact", number: "12" },
  ]);
});

test("fullscreen menu owns the interaction layer and its language controls receive real pointer input", async ({ page }) => {
  await settleMain(page, "#hero");
  await page.locator(".nav-burger").click();
  await expect(page.locator(".nav-menu")).toHaveClass(/is-open/);

  const layers = await page.evaluate(() => ({
    menu: Number.parseInt(getComputedStyle(document.querySelector(".nav-menu")).zIndex, 10),
    nav: Number.parseInt(getComputedStyle(document.querySelector(".nav")).zIndex, 10),
    highestSection: Math.max(
      ...Array.from(document.querySelectorAll("main section")).map((section) => {
        const value = Number.parseInt(getComputedStyle(section).zIndex, 10);
        return Number.isFinite(value) ? value : 0;
      })
    ),
  }));
  expect(layers.menu).toBeGreaterThan(layers.highestSection);
  expect(layers.menu).toBeGreaterThan(layers.nav);

  await page.locator(".nav-menu-lang button").filter({ hasText: /^UZ$/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await page.locator(".nav-menu-close").click();
  await expect(page.locator(".nav-menu")).not.toHaveClass(/is-open/);
  await expect(page.locator(".nav-burger")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".hero-roles")).toContainText("Builder");
  await expectNoHorizontalOverflow(expect, page, "menu language switch");
});

test("fullscreen menu traps focus, hides the page shell, and restores its trigger", async ({ page }) => {
  await settleMain(page, "#hero");
  const trigger = page.locator(".nav-burger");
  await trigger.focus();
  await trigger.press("Enter");

  await expect(page.locator("#site-menu")).toHaveAttribute("role", "dialog");
  await expect(page.locator("#site-menu")).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#main")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".nav-menu-close")).toBeFocused();
  expect(await page.evaluate(() => ({
    main: document.getElementById("main").inert,
    footer: document.querySelector("footer").inert,
    skip: document.querySelector(".skip-link").inert,
    trigger: document.querySelector(".nav-burger").inert,
  }))).toEqual({ main: true, footer: true, skip: true, trigger: true });

  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => Boolean(document.activeElement && document.activeElement.closest("#site-menu")))).toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.locator(".nav-menu-close")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.locator(".nav-menu")).not.toHaveClass(/is-open/);
  await expect(page.locator("#main")).not.toHaveAttribute("aria-hidden", "true");
  await expect(trigger).toBeFocused();
});

test("production skip link bypasses cinema and moves focus to main", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "keyboard contract is engine-independent");
  await page.goto("/?skip-link-production=1#hero", { waitUntil: "domcontentloaded" });
  await page.locator(".skip-link").focus();
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await expect(page).toHaveURL(/#main$/);
  expect(await page.evaluate(() => document.body.getAttribute("data-active-section"))).not.toBe("main");
});

test("menu chapter navigation focuses the selected destination", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "keyboard contract is engine-independent");
  await settleMain(page, "#hero");
  await page.locator(".nav-burger").focus();
  await page.keyboard.press("Enter");
  const projectsLink = page.locator('.nav-menu-links a[href="#projects"]');
  await projectsLink.focus();
  await projectsLink.press("Enter");
  await expect(page.locator(".nav-menu")).not.toHaveClass(/is-open/);
  await expect(page.locator("#projects h2")).toBeFocused({ timeout: 3000 });
  await expect(page).toHaveURL(/#projects$/);
});

test("instrument-rail navigation stays unclipped at intermediate desktop widths", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop breakpoint contract");
  await settleMain(page, "#hero");
  for (const width of [920, 1024, 1160, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const state = await page.evaluate(() => {
      const nav = document.querySelector(".nav-inner").getBoundingClientRect();
      const links = Array.from(document.querySelectorAll(".nav-links a")).filter((link) => {
        const rect = link.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const counter = document.querySelector(".nav-counter").getBoundingClientRect();
      return {
        visibleLinks: links.length,
        linksInside: links.every((link) => {
          const rect = link.getBoundingClientRect();
          return rect.left >= nav.left && rect.right <= nav.right;
        }),
        counterVisible: counter.width > 0 && counter.height > 0,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(state.linksInside, `link clipping at ${width}px`).toBe(true);
    expect(state.overflow, `page overflow at ${width}px`).toBeLessThanOrEqual(1);
    // Primary destinations live in the fullscreen Index at every desktop
    // width. The top rail owns identity, chapter orientation, language and a
    // single contact action instead of reintroducing a second navigation.
    expect(state.visibleLinks, `instrument rail at ${width}px`).toBe(0);
    expect(state.counterVisible, `chapter counter at ${width}px`).toBe(true);
  }
});

test("short desktop menu keeps all twelve localized chapters separated", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop visual geometry contract");
  await settleMain(page, "#hero");
  for (const viewport of [
    { width: 920, height: 720 },
    { width: 1024, height: 768 },
    { width: 1230, height: 768 },
    { width: 1440, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    const menu = page.locator(".nav-menu");
    if (!await menu.evaluate((node) => node.classList.contains("is-open"))) {
      await page.locator(".nav-burger").click();
    }
    await expect(menu).toHaveClass(/is-open/);
    await page.waitForTimeout(900);
    const geometry = await page.locator(".nav-menu-links a").evaluateAll((links) => {
      const rects = links.map((link) => {
        const rect = link.getBoundingClientRect();
        const word = link.querySelector(".nav-menu-word");
        const range = document.createRange();
        if (word) range.selectNodeContents(word);
        const lines = word
          ? Array.from(range.getClientRects()).filter((line) => line.width > 1 && line.height > 1).map((line) => ({
              top: line.top,
              bottom: line.bottom,
              left: line.left,
              right: line.right,
            }))
          : [];
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          lines,
          wordWraps: lines.length !== 1,
        };
      });
      const lineBoxes = rects.flatMap((rect) => rect.lines);
      const labelsSeparate = lineBoxes.every((line, index) => lineBoxes.every((other, otherIndex) => {
        if (index === otherIndex) return true;
        return line.right <= other.left || other.right <= line.left || line.bottom <= other.top || other.bottom <= line.top;
      }));
      return {
        count: rects.length,
        inside: rects.every((rect) => rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth),
        separate: labelsSeparate,
        singleLine: rects.every((rect) => !rect.wordWraps),
      };
    });
    expect(geometry.count, JSON.stringify(viewport)).toBe(12);
    expect(geometry.inside, `menu clipping at ${viewport.width}x${viewport.height}: ${JSON.stringify(geometry)}`).toBe(true);
    expect(geometry.separate, `menu overlap at ${viewport.width}x${viewport.height}: ${JSON.stringify(geometry)}`).toBe(true);
    expect(geometry.singleLine, `menu label wrap at ${viewport.width}x${viewport.height}: ${JSON.stringify(geometry)}`).toBe(true);
    await page.locator(".nav-menu-close").click();
    await expect(menu).not.toHaveClass(/is-open/);
  }
});

test("mobile command dock reports the exact chapter with a truthful twelve-part rail", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile shell contract");
  await settleMain(page, "#process");
  await expect(page.locator(".mobile-dock-dot")).toHaveCount(12);
  await expect(page.locator(".mobile-dock-dot.is-active")).toHaveCount(1);
  await expect(page.locator(".mobile-dock-label-num")).toHaveText("/09");
  await expect(page.locator(".mobile-dock-label")).toContainText("Метод");
  await expectNoHorizontalOverflow(expect, page, "mobile command dock");
});

test("mobile Hero keeps its CTA, proof rail and Signal handoff collision-free", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile geometry contract");
  /* This is one deterministic 27-state matrix (3 locales × 9 viewports), not
     a single interaction. A clean serial run takes ~49s on the Windows visual
     runner before any assertion fails, so give the matrix its own bounded
     budget while keeping the default timeout for every user journey. */
  test.setTimeout(70_000);
  await settleMain(page, "#hero");
  const viewports = [
    { width: 320, height: 568 },
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 568, height: 320 },
    { width: 844, height: 390 },
    { width: 920, height: 720 },
    { width: 1024, height: 768 },
    { width: 1440, height: 1000 },
  ];
  for (const language of ["RU", "EN", "UZ"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    if ((await page.locator("html").getAttribute("lang")) !== language.toLowerCase()) {
      /* This test owns Hero geometry, not menu actionability. The dedicated
         fullscreen-menu test above exercises real pointer input, focus trap
         and close restoration. Dispatch the same DOM events synchronously
         here so 27 viewport measurements do not spend most of the 45-second
         contract waiting for the menu's authored transition to stabilize. */
      await page.evaluate((nextLanguage) => {
        document.querySelector(".nav-burger")?.click();
        const button = Array.from(document.querySelectorAll(".nav-menu-lang button"))
          .find((node) => node.textContent.trim() === nextLanguage);
        button?.click();
      }, language);
      await expect(page.locator("html")).toHaveAttribute("lang", language.toLowerCase());
      await page.evaluate(() => document.querySelector(".nav-menu-close")?.click());
      await expect(page.locator(".nav-menu")).not.toHaveClass(/is-open/);
    }

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(60);
      const geometry = await page.evaluate(() => {
        const hero = document.getElementById("hero").getBoundingClientRect();
        const signal = document.getElementById("signal").getBoundingClientRect();
        const proof = document.querySelector(".hero-proof").getBoundingClientRect();
        const name = document.querySelector(".hero-name");
        const ink = Array.from(document.querySelectorAll(".hero-name .hn-i"))
          .map((node) => node.getBoundingClientRect());
        const buttons = Array.from(document.querySelectorAll(".hero-ctas .btn")).map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            bottom: rect.bottom,
            height: rect.height,
            fontSize: Number.parseFloat(getComputedStyle(button).fontSize),
            textFits: button.scrollWidth <= button.clientWidth + 1,
          };
        });
        return {
          heroHeight: hero.height,
          signalPeek: innerHeight - signal.top,
          proofTop: proof.top,
          proofBottom: proof.bottom,
          nameOverflow: name.scrollWidth - name.clientWidth,
          inkLeft: Math.min(...ink.map((rect) => rect.left)),
          inkRight: Math.max(...ink.map((rect) => rect.right)),
          buttons,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      const caseId = `${language} ${viewport.width}x${viewport.height}`;
      expect(geometry.overflow, `page overflow at ${caseId}`).toBeLessThanOrEqual(1);
      expect(geometry.nameOverflow, `masthead overflow at ${caseId}`).toBeLessThanOrEqual(1);
      expect(geometry.inkLeft, `left masthead ink at ${caseId}`).toBeGreaterThanOrEqual(-1);
      expect(geometry.inkRight, `right masthead ink at ${caseId}`).toBeLessThanOrEqual(viewport.width + 1);
      expect(geometry.proofBottom, `proof below viewport at ${caseId}`).toBeLessThanOrEqual(viewport.height + 1);
      expect(geometry.buttons).toHaveLength(2);
      geometry.buttons.forEach((button) => {
        expect(button.height, `touch target at ${caseId}`).toBeGreaterThanOrEqual(44);
        expect(button.textFits, `CTA clipping at ${caseId}`).toBe(true);
        expect(button.bottom + 7, `CTA/proof overlap at ${caseId}`).toBeLessThanOrEqual(geometry.proofTop);
        if (language === "UZ" && viewport.width <= 430) {
          expect(button.fontSize, `readable UZ CTA at ${caseId}`).toBeGreaterThanOrEqual(10.5);
        }
      });
      if (viewport.height > viewport.width && viewport.width <= 430) {
        expect(geometry.signalPeek, `Signal cue at ${caseId}`).toBeGreaterThanOrEqual(64);
        expect(geometry.heroHeight, `curtain distance at ${caseId}`).toBeLessThanOrEqual(viewport.height * 0.9);
      }
    }
  }
});

test("mobile dock waits until the reader clears Signal", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile overlay contract");
  await settleMain(page, "#signal");
  await expect(page.locator(".mobile-dock")).not.toHaveClass(/is-visible/);
  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect(page.locator(".mobile-dock")).toHaveClass(/is-visible/);
  await expect(page.locator(".mobile-dock-label > span").last()).toBeVisible();
});

test("fullscreen menu order matches the real DOM chapter order", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one structural assertion is enough");
  await settleMain(page, "#hero");
  await page.locator(".nav-burger").click();
  const order = await page.evaluate(() => ({
    dom: Array.from(document.querySelectorAll("section[data-section]")).map((section) => section.getAttribute("data-section")),
    menu: Array.from(document.querySelectorAll(".nav-menu-links a")).map((link) => link.getAttribute("href").replace(/^#/, "")),
  }));
  expect(order.menu).toEqual(order.dom);
});

test("a production deep link settles on the requested chapter after layout and fonts stabilize", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "mobile pinned-layout regression");
  await page.goto("/?deep-link-shell=1#process", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await expect(page.locator("html")).toHaveAttribute("data-deep-link-settled", "process", { timeout: 9000 });
  await expect.poll(
    () => page.locator("#process").evaluate((element) => {
      const top = Math.round(element.getBoundingClientRect().top);
      return top >= 60 && top <= 92;
    }),
    { timeout: 7000 }
  ).toBe(true);
  const top = await page.locator("#process").evaluate((element) => Math.round(element.getBoundingClientRect().top));
  expect(top).toBeGreaterThanOrEqual(60);
  expect(top).toBeLessThanOrEqual(92);
  await expect(page.locator(".mobile-dock-label-num")).toHaveText("/09");
  await expect(page.locator(".mobile-dock-label")).toContainText("Метод");
});

test("global shell consumes the shared runtime instead of creating competing motion streams", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "runtime ownership is engine-independent");
  await settleMain(page, "#hero");
  const subscribers = await page.evaluate(() => window.__SM_MOTION_RUNTIME.__debug().subscriberIds);
  expect(subscribers).toContain("app-scroll-state");
  expect(subscribers).toContain("nav-capsule");
  expect(subscribers).toContain("act-pointer-light");
  expect(subscribers.filter((id) => id === "app-scroll-state")).toHaveLength(1);
  expect(subscribers.filter((id) => id === "nav-capsule")).toHaveLength(1);
  expect(subscribers.filter((id) => id === "act-pointer-light")).toHaveLength(1);
});

test("intro owns the scroll lock and always releases into a readable hero", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "timing contract is engine-independent");

  await page.addInitScript(() => {
    window.__INTRO_CONTRACT = { frames: [], readiness: [], shellBlocked: false, done: 0 };
    const observer = new MutationObserver(() => {
      const panel = document.getElementById("sm-intro");
      const root = document.getElementById("root");
      if (panel && root && root.getAttribute("aria-hidden") === "true" && root.inert) {
        window.__INTRO_CONTRACT.shellBlocked = true;
      }
      if (panel && !window.__INTRO_CONTRACT.frames.length) {
        window.__INTRO_CONTRACT.frames.push({
          text: panel.textContent,
          role: panel.getAttribute("role"),
          busy: panel.getAttribute("aria-busy"),
          lock: document.documentElement.classList.contains("intro-lock"),
        });
      }
    });
    observer.observe(document, { childList: true, subtree: true });
    window.addEventListener("sm:intro-readiness", (event) => {
      const root = document.getElementById("root");
      window.__INTRO_CONTRACT.readiness.push({
        ready: event.detail,
        rootAriaHidden: root && root.getAttribute("aria-hidden"),
        rootInert: root && root.inert,
      });
    });
    window.addEventListener("sm:intro-done", () => {
      window.__INTRO_CONTRACT.done += 1;
    });
  });

  await page.goto("/?intro-contract=1", { waitUntil: "domcontentloaded" });
  // The visual ceiling is ~3s. Keep a small runner/compositor allowance for
  // the final DOM removal after the curtain has already collapsed to zero.
  await expect(page.locator("#sm-intro")).toHaveCount(0, { timeout: 5000 });
  await expect(page.locator("html")).not.toHaveClass(/intro-lock/);
  await expect(page.locator("#root")).not.toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#hero")).toHaveClass(/is-lit/);
  await expect(page.locator(".hero-proof")).toBeVisible();

  const contract = await page.evaluate(() => window.__INTRO_CONTRACT);
  expect(contract.frames).toHaveLength(1);
  expect(contract.frames[0].text).toContain("SAMANDAR / PRODUCT LAB");
  expect(contract.frames[0].text).toContain("BUILD");
  expect(contract.frames[0].role).toBe("dialog");
  expect(contract.frames[0].busy).toBe("true");
  expect(contract.frames[0].lock).toBe(true);
  expect(contract.shellBlocked || contract.readiness.some((entry) =>
    entry.ready && entry.ready.shell === true &&
    entry.rootAriaHidden === "true" &&
    entry.rootInert === true
  )).toBe(true);
  expect(contract.done).toBe(1);
});
