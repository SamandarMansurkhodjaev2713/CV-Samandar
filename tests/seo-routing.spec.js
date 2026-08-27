"use strict";

const { test, expect } = require("@playwright/test");
const { caseProducts, orderedProducts, switchMainLanguage } = require("./helpers");

test("@smoke discovery artifacts and the real 404 route are deployable", async ({ request, page }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(robots.headers()["content-type"]).toContain("text/plain");
  expect(await robots.text()).toContain("/CV-Samandar/sitemap.xml");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()["content-type"]).toContain("application/xml");
  const sitemapBody = await sitemap.text();
  expect((sitemapBody.match(/<loc>/g) || []).length).toBe(caseProducts.length * 3 + 1);
  for (const product of caseProducts) expect(sitemapBody).toContain(product.casePage);

  const response = await page.goto("/route-that-does-not-exist", { waitUntil: "domcontentloaded" });
  expect(response && response.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Такого маршрута нет." })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");
});

test("main language URLs are shareable and preserve deep-link context", async ({ page, isMobile }) => {
  test.skip(isMobile, "The desktop language control is exercised here; mobile navigation has its own interaction coverage.");
  await page.goto("/?e2e=1&lang=en#projects", { waitUntil: "domcontentloaded" });
  await page.locator("#projects").waitFor({ state: "attached" });
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveURL(/\?e2e=1&lang=en#projects$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\?lang=en$/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");

  await switchMainLanguage(page, "UZ");
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await expect(page).toHaveURL(/\?e2e=1&lang=uz#projects$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\?lang=uz$/);
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "uz_UZ");

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await expect(page.locator("#projects")).toBeAttached();
});

test("main and case pages expose canonical social and locale metadata", async ({ page }) => {
  await page.goto("/?e2e=1#hero", { waitUntil: "domcontentloaded" });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/CV-Samandar\/$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\//);
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(4);
  const mainStructuredData = JSON.parse(await page.locator('script[type="application/ld+json"]').first().textContent());
  expect(mainStructuredData["@graph"].map((item) => item["@type"])).toEqual(
    expect.arrayContaining(["Person", "WebSite", "ProfilePage"])
  );
  const projectItemList = JSON.parse(await page.locator("#portfolio-projects-jsonld").textContent());
  expect(projectItemList["@type"]).toBe("ItemList");
  expect(projectItemList.numberOfItems).toBe(orderedProducts.length);
  expect(projectItemList.itemListElement).toHaveLength(orderedProducts.length);
  expect(projectItemList.itemListElement.map((entry) => entry.position)).toEqual(
    orderedProducts.map((_, index) => index + 1)
  );

  const product = caseProducts.find((item) => item.slug === "chat-app");
  await page.goto("/" + product.casePage, { waitUntil: "domcontentloaded" });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(product.casePage + "$"));
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(4);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", /^https:\/\//);
  const structuredData = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(structuredData["@graph"].map((item) => item["@type"])).toEqual(
    expect.arrayContaining(["CreativeWork", "Person", "WebPage", "BreadcrumbList"])
  );
});

test("localized case URLs ship translated metadata and body before JavaScript", async ({ request }) => {
  const product = caseProducts.find((item) => item.slug === "chat-app");
  for (const locale of ["en", "uz"]) {
    const route = "/" + product.casePage + locale + "/";
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<html lang="' + locale + '"');
    expect(html).toContain('data-lp-lang="' + locale + '"');
    expect(html).toContain('"inLanguage":"' + locale + '"');
    expect(html).toContain('href="https://samandarmansurkhodjaev2713.github.io/CV-Samandar/' + product.casePage + locale + '/"');
    expect(html).toContain("<h1 class=\"lp-title\">" + product.i18n[locale].name + "</h1>");
  }
});

test("strict CSP permits the authored runtime and rejects arbitrary inline execution", async ({ page, isMobile }) => {
  test.skip(isMobile, "The policy is viewport-independent and is exercised once in desktop Chromium.");
  const violations = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy/i.test(message.text())) {
      violations.push(message.text());
    }
  });

  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await page.locator("#main").waitFor({ state: "attached" });
  await expect(page.locator("#sm-intro")).toHaveCount(0, { timeout: 6000 });
  await expect(page.locator(".hero-ctas .btn").first()).toBeEnabled();
  expect(violations).toEqual([]);

  const probe = await page.evaluate(async () => {
    window.__SM_CSP_PROBE = 0;
    const script = document.createElement("script");
    script.textContent = "window.__SM_CSP_PROBE = 1";
    document.head.appendChild(script);
    await new Promise((resolve) => setTimeout(resolve, 0));
    script.remove();
    return window.__SM_CSP_PROBE;
  });
  expect(probe).toBe(0);
  expect(violations.some((message) => /script-src/i.test(message))).toBe(true);

  const styleProbe = await page.evaluate(async () => {
    const style = document.createElement("style");
    style.textContent = "body { --sm-csp-style-probe: blocked; }";
    document.head.appendChild(style);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const value = getComputedStyle(document.body).getPropertyValue("--sm-csp-style-probe").trim();
    style.remove();
    return value;
  });
  expect(styleProbe).toBe("");
  expect(violations.some((message) => /style-src(?:-elem)?/i.test(message))).toBe(true);
});
