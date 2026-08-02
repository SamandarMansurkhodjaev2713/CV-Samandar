#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const LOCALES = ["ru", "en", "uz"];
const ALLOWED_PRESENTATION = new Set(["live", "case"]);
const ALLOWED_PORTFOLIO_STATE = new Set(["featured", "catalog", "hold"]);
const ALLOWED_CONFIDENTIALITY = new Set(["public", "private_source", "nda", "sensitive"]);
const ALLOWED_REPO_VISIBILITY = new Set(["public", "private"]);
const PROJECT_IMAGE_SPECS = [
  { suffix: "-768", width: 768, height: 256, maxBytes: 60000, responsive: true },
  { suffix: "-1152", width: 1152, height: 384, maxBytes: 100000, responsive: true },
  { suffix: "", width: 1536, height: 512, maxBytes: 150000, responsive: false },
];
const REQUIRED_CASE_COPY = [
  "tag", "role", "signal", "quick", "what", "problem", "architecture",
  "why", "unique", "employer", "quality", "boundary",
];

function fail(message) {
  throw new Error("[validate] " + message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function cleanString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assertUnique(items, select, label) {
  const seen = new Map();
  items.forEach(function checkUnique(item, index) {
    const value = select(item);
    if (value === null || value === undefined || value === "") return;
    if (seen.has(value)) {
      fail(label + " duplicate `" + value + "` at indexes " + seen.get(value) + " and " + index);
    }
    seen.set(value, index);
  });
}

function readWebpSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.length >= 30, path.relative(ROOT, filePath) + " is too small to be a WebP");
  assert(buffer.toString("ascii", 0, 4) === "RIFF", path.relative(ROOT, filePath) + " has no RIFF header");
  assert(buffer.toString("ascii", 8, 12) === "WEBP", path.relative(ROOT, filePath) + " has no WEBP signature");
  const kind = buffer.toString("ascii", 12, 16);
  const data = 20;
  if (kind === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(data + 4, 3),
      height: 1 + buffer.readUIntLE(data + 7, 3),
    };
  }
  if (kind === "VP8 ") {
    return {
      width: buffer.readUInt16LE(data + 6) & 0x3fff,
      height: buffer.readUInt16LE(data + 8) & 0x3fff,
    };
  }
  if (kind === "VP8L") {
    const b0 = buffer[data + 1];
    const b1 = buffer[data + 2];
    const b2 = buffer[data + 3];
    const b3 = buffer[data + 4];
    return {
      width: 1 + b0 + ((b1 & 0x3f) << 8),
      height: 1 + ((b1 & 0xc0) >> 6) + (b2 << 2) + ((b3 & 0x0f) << 10),
    };
  }
  fail(path.relative(ROOT, filePath) + " uses unsupported WebP chunk " + kind);
}

function loadMainContent(registry) {
  const source = fs.readFileSync(path.join(ROOT, "src", "content", "content.js"), "utf8");
  const context = { window: { PRODUCT_REGISTRY: registry } };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "src/content/content.js", timeout: 5000 });
  return context.window.CONTENT;
}

function validateRegistry(registry) {
  assert(Array.isArray(registry), "PRODUCT_REGISTRY must export an array");
  assert(registry.length === 24, "expected 24 canonical products, received " + registry.length);
  assertUnique(registry, (p) => p.id, "product id");
  assertUnique(registry, (p) => p.slug, "product slug");
  assertUnique(registry, (p) => p.i18n && p.i18n.ru && p.i18n.ru.name, "display name");
  assertUnique(registry, (p) => p.liveUrl, "live URL");
  assertUnique(registry, (p) => p.githubUrl, "GitHub URL");
  assertUnique(registry, (p) => p.casePage, "case route");
  assertUnique(registry, (p) => p.featuredRank, "featured rank");

  registry.forEach(function validateProduct(product) {
    const label = product.id || "<missing-id>";
    assert(cleanString(product.id), label + ": id is required");
    assert(cleanString(product.slug) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug), label + ": invalid slug");
    assert(Number.isInteger(product.featuredRank) && product.featuredRank > 0, label + ": featuredRank must be a positive integer");
    assert(ALLOWED_PRESENTATION.has(product.presentation), label + ": unsupported presentation");
    assert(ALLOWED_PORTFOLIO_STATE.has(product.portfolioState), label + ": unsupported portfolioState");
    assert(ALLOWED_CONFIDENTIALITY.has(product.confidentiality), label + ": unsupported confidentiality");
    assert(cleanString(product.lifecycle), label + ": lifecycle is required");
    assert(cleanString(product.evidenceLevel), label + ": evidenceLevel is required");
    assert(Array.isArray(product.privacyBoundary) && product.privacyBoundary.length > 0, label + ": privacyBoundary is required");
    assert(Array.isArray(product.repositoryAliases), label + ": repositoryAliases must be an array");
    assert(cleanString(product.image) && product.image.endsWith(".webp"), label + ": WebP image path is required");
    assert(/^#[0-9A-F]{6}$/i.test(product.accent), label + ": accent must be a six-digit hex color");

    if (product.presentation === "live") {
      assert(cleanString(product.liveUrl), label + ": live presentation requires liveUrl");
      assert(product.casePage === null, label + ": live presentation must not also declare a casePage");
    } else {
      assert(cleanString(product.casePage), label + ": case presentation requires casePage");
      assert(product.casePage === "projects/" + product.slug + "/", label + ": case route must match slug");
    }

    if (product.githubUrl) {
      assert(product.githubUrl.startsWith("https://github.com/SamandarMansurkhodjaev2713/"), label + ": unexpected GitHub owner");
      const publicSource = product.repositoryAliases.some(function hasPublicAlias(alias) {
        return alias.visibility === "public";
      });
      assert(publicSource, label + ": public GitHub CTA has no public repository alias");
    }

    product.repositoryAliases.forEach(function validateAlias(alias) {
      assert(cleanString(alias.name), label + ": repository alias name is required");
      assert(ALLOWED_REPO_VISIBILITY.has(alias.visibility), label + ": invalid repository visibility");
      assert(cleanString(alias.role), label + ": repository alias role is required");
    });

    LOCALES.forEach(function validateLocale(locale) {
      const copy = product.i18n && product.i18n[locale];
      assert(copy && cleanString(copy.name) && cleanString(copy.descriptor), label + ": incomplete " + locale + " registry copy");
    });

    const imageDirectory = path.dirname(product.image);
    const imageStem = path.basename(product.image, ".webp");
    PROJECT_IMAGE_SPECS.forEach(function validateProjectImage(spec) {
      const relativePath = spec.responsive
        ? path.join(imageDirectory, "responsive", imageStem + spec.suffix + ".webp")
        : product.image;
      const imagePath = path.join(ROOT, relativePath);
      assert(fs.existsSync(imagePath), label + ": missing image " + relativePath);
      const bytes = fs.statSync(imagePath).size;
      assert(bytes <= spec.maxBytes, label + ": image exceeds byte budget " + relativePath + " (" + bytes + " bytes)");
      const size = readWebpSize(imagePath);
      assert(
        size.width === spec.width && size.height === spec.height,
        label + ": image must be " + spec.width + "×" + spec.height + ", got " + size.width + "×" + size.height
      );
    });
  });

  const responsiveDirectory = path.join(ROOT, "assets", "proj", "responsive");
  const expectedResponsive = new Set();
  registry.forEach(function collectExpectedResponsive(product) {
    const imageStem = path.basename(product.image, ".webp");
    PROJECT_IMAGE_SPECS.filter((spec) => spec.responsive).forEach(function collectSpec(spec) {
      expectedResponsive.add(imageStem + spec.suffix + ".webp");
    });
  });
  const actualResponsive = fs.existsSync(responsiveDirectory)
    ? fs.readdirSync(responsiveDirectory).filter((name) => name.endsWith(".webp"))
    : [];
  assert(actualResponsive.length === expectedResponsive.size, "responsive project image count drift");
  actualResponsive.forEach(function validateResponsiveName(name) {
    assert(expectedResponsive.has(name), "unexpected responsive project image " + name);
  });

  const liveCount = registry.filter((p) => p.presentation === "live").length;
  const caseCount = registry.filter((p) => p.presentation === "case").length;
  assert(liveCount === 9, "expected 9 live products, received " + liveCount);
  assert(caseCount === 15, "expected 15 case products, received " + caseCount);
}

function validateMainContent(registry, content) {
  assert(content && typeof content === "object", "content.js did not expose window.CONTENT");
  const expectedSlugs = registry.slice().sort((a, b) => a.featuredRank - b.featuredRank).map((p) => p.slug);
  LOCALES.forEach(function validateContentLocale(locale) {
    const section = content[locale] && content[locale].projects;
    assert(section && Array.isArray(section.items), "missing " + locale + " project items");
    assert(section.items.length === registry.length, locale + ": expected " + registry.length + " cards, received " + section.items.length);
    assertUnique(section.items, (p) => p.slug, locale + " card slug");
    assertUnique(section.items, (p) => p.name, locale + " card name");
    const actualSlugs = section.items.map((p) => p.slug);
    assert(JSON.stringify(actualSlugs) === JSON.stringify(expectedSlugs), locale + ": card order differs from registry");
    section.items.forEach(function validateCard(card) {
      const meta = registry.find((p) => p.slug === card.slug);
      assert(meta, locale + ": unknown card " + card.slug);
      const expectedUrl = meta.presentation === "live" ? meta.liveUrl : meta.casePage;
      assert(card.url === expectedUrl, locale + "/" + card.slug + ": route drift");
      assert((card.github || null) === (meta.githubUrl || null), locale + "/" + card.slug + ": GitHub route drift");
      ["tag", "name", "problem", "solution", "role", "outcome"].forEach(function requireCardField(field) {
        assert(cleanString(card[field]), locale + "/" + card.slug + ": missing card." + field);
      });
      assert(Array.isArray(card.stack) && card.stack.length > 0, locale + "/" + card.slug + ": empty stack");
    });
  });
}

function validateLandings(registry, landings, generated) {
  const expected = registry.filter((p) => p.presentation === "case");
  const generatedDiagramKinds = [];
  assert(Object.keys(landings).length === expected.length, "expected " + expected.length + " landing definitions, received " + Object.keys(landings).length);
  expected.forEach(function validateLanding(meta) {
    const landing = landings[meta.slug];
    assert(landing, meta.id + ": missing landing data");
    assert(landing.slug === meta.slug, meta.id + ": landing slug drift");
    assert(landing.visual === path.basename(meta.image), meta.id + ": landing visual drift");
    assert(Array.isArray(landing.stack) && landing.stack.length > 0, meta.id + ": landing stack is empty");
    assert(Array.isArray(landing.flow) && landing.flow.length >= 4, meta.id + ": architecture flow needs at least four nodes");
    LOCALES.forEach(function validateLandingLocale(locale) {
      const copy = landing.i18n && landing.i18n[locale];
      assert(copy, meta.id + ": missing landing " + locale + " copy");
      REQUIRED_CASE_COPY.forEach(function requireCaseField(field) {
        if (field === "quick") {
          assert(Array.isArray(copy.quick) && copy.quick.length === 3 && copy.quick.every((x) => cleanString(x.v)), meta.id + "/" + locale + ": quick must have three facts");
        } else {
          assert(cleanString(copy[field]), meta.id + "/" + locale + ": missing " + field);
        }
      });
    });
    if (generated) {
      const indexPath = path.join(ROOT, meta.casePage, "index.html");
      assert(fs.existsSync(indexPath), meta.id + ": generated case page is missing");
      const html = fs.readFileSync(indexPath, "utf8");
      assert(html.includes("window.__LP_SLUG__=" + JSON.stringify(meta.slug)), meta.id + ": generated slug marker is missing");
      assert(html.includes("../../src/content/product-registry.js"), meta.id + ": generated page does not load product registry");
      assert(html.includes("../../src/projects/landings-new.js"), meta.id + ": generated page does not load new landing source");
      assert(html.includes('data-hero-profile="'), meta.id + ": generated hero profile is missing");
      assert(html.includes('href="../../#proj-' + meta.slug + '"'), meta.id + ": generated return link does not preserve card context");
      assert(html.includes("assets/proj/responsive/" + meta.slug + "-768.webp 768w"), meta.id + ": generated hero has no 768px candidate");
      assert(html.includes("assets/proj/responsive/" + meta.slug + "-1152.webp 1152w"), meta.id + ": generated hero has no 1152px candidate");
      const diagramMatch = html.match(/data-diagram="([^"]+)"/);
      assert(diagramMatch && diagramMatch[1] !== "pipeline", meta.id + ": generated case still uses the generic architecture pipeline");
      generatedDiagramKinds.push(diagramMatch[1]);
    }
  });
  if (generated) {
    assert(new Set(generatedDiagramKinds).size === expected.length, "case architecture diagrams must be semantically unique");
  }
}

function validateScriptOrder() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const registryAt = html.indexOf("src/content/product-registry.js");
  const contentAt = html.indexOf("src/content/content.js");
  const perfAt = html.indexOf("src/engine/perf.js");
  const runtimeAt = html.indexOf("src/engine/motion-runtime.js");
  const motionAt = html.indexOf("src/engine/motion.js");
  const shaderAt = html.indexOf("src/engine/img-fx.js");
  const cinemaAt = html.indexOf("src/engine/scene-cinema.js");
  assert(registryAt >= 0 && contentAt >= 0 && registryAt < contentAt, "product registry must load before content.js");
  assert(
    perfAt >= 0 && runtimeAt > perfAt && motionAt > runtimeAt && shaderAt > runtimeAt && cinemaAt > runtimeAt,
    "motion policy and runtime must load before every authored motion consumer"
  );
}

function validateMotionArchitecture() {
  const motionSource = fs.readFileSync(path.join(ROOT, "src", "engine", "motion.js"), "utf8");
  const shaderSource = fs.readFileSync(path.join(ROOT, "src", "engine", "img-fx.js"), "utf8");
  const runtimeSource = fs.readFileSync(path.join(ROOT, "src", "engine", "motion-runtime.js"), "utf8");
  const perfSource = fs.readFileSync(path.join(ROOT, "src", "engine", "perf.js"), "utf8");

  [
    ["motion.js", motionSource],
    ["img-fx.js", shaderSource],
  ].forEach(function rejectPrivateLoops(entry) {
    const name = entry[0];
    const source = entry[1];
    assert(!/\brequestAnimationFrame\s*\(/.test(source), name + " must use motion-runtime instead of a private RAF");
    assert(!/\bsetInterval\s*\(/.test(source), name + " must not create an always-on timer");
    assert(!/addEventListener\s*\(\s*["'](?:scroll|resize|pointermove|mousemove)["']/.test(source), name + " must use the shared input stream");
  });

  assert(/bind\s*\(\s*window\s*,\s*["']scroll["']/.test(runtimeSource), "motion-runtime must own the scroll input");
  assert(/bind\s*\(\s*window\s*,\s*["']pointermove["']/.test(runtimeSource), "motion-runtime must own the pointer input");
  assert(!/bind\s*\(\s*window\s*,\s*["']scroll["']/.test(perfSource), "motion policy must not duplicate the runtime scroll listener");
  assert(perfSource.includes("window.__SM_PERF = api") && perfSource.includes("window.__SM_MOTION_POLICY = api"), "motion policy aliases must share one source of truth");
}

function validateRuntimeShell() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const appSource = fs.readFileSync(path.join(ROOT, "src", "components", "app.jsx"), "utf8");
  const deployWorkflow = fs.readFileSync(path.join(ROOT, ".github", "workflows", "deploy-pages.yml"), "utf8");
  const cacheTokens = Array.from(html.matchAll(/\?v=(\d+)/g), (match) => match[1]);
  assert(cacheTokens.length >= 15, "index.html must cache-bust all first-party assets");
  assert(new Set(cacheTokens).size === 1, "index.html contains mixed cache versions");
  assert(html.includes("<noscript>"), "index.html must provide a no-JavaScript fallback");
  assert(html.includes("__SM_APP_WATCHDOG"), "index.html must recover from pre-React load failures");
  assert(appSource.includes("class ErrorBoundary"), "React render failures need an ErrorBoundary");
  assert(appSource.includes('className="fatal-shell"'), "ErrorBoundary must render the branded recovery surface");
  assert(deployWorkflow.includes("npm ci"), "deployment must install the locked dependency graph");
  assert(deployWorkflow.includes("npm test"), "deployment must pass the automated quality gate");
}

function validate(options) {
  const registryPath = path.join(ROOT, "src", "content", "product-registry.js");
  const landingPath = path.join(ROOT, "src", "projects", "landings-data.js");
  delete require.cache[require.resolve(registryPath)];
  delete require.cache[require.resolve(landingPath)];
  const registry = require(registryPath);
  const landings = require(landingPath);
  const content = loadMainContent(registry);
  validateRegistry(registry);
  validateMainContent(registry, content);
  validateLandings(registry, landings, Boolean(options && options.generated));
  validateScriptOrder();
  validateMotionArchitecture();
  validateRuntimeShell();
  return {
    products: registry.length,
    live: registry.filter((p) => p.presentation === "live").length,
    cases: registry.filter((p) => p.presentation === "case").length,
    locales: LOCALES.length,
  };
}

if (require.main === module) {
  try {
    const result = validate({ generated: process.argv.includes("--generated") });
    process.stdout.write(
      "[validate] OK — " + result.products + " products, " + result.live +
      " live routes, " + result.cases + " case routes, " + result.locales + " locales\n"
    );
  } catch (error) {
    process.stderr.write(error.stack + "\n");
    process.exit(1);
  }
}

module.exports = { validate };
