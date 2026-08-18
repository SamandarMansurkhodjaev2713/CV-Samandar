#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const LOCALES = ["ru", "en", "uz"];
const ALLOWED_PRESENTATION = new Set(["live", "case"]);
const ALLOWED_PORTFOLIO_STATE = new Set(["featured", "catalog", "hold"]);
const ALLOWED_CONFIDENTIALITY = new Set(["public", "private_source", "nda", "sensitive"]);
const ALLOWED_REPO_VISIBILITY = new Set(["public", "private"]);
const ALLOWED_LIFECYCLE = new Set(["discovery", "build", "prototype", "demo", "live", "production", "source_incomplete"]);
const ALLOWED_EVIDENCE_LEVEL = new Set([
  "live_plus_private_source", "showcase_plus_private_source", "case_plus_private_source",
  "public_source_plus_live", "private_source", "documented_discovery",
  "public_source_plus_live_demo", "public_source_plus_demo",
  "public_source_plus_private_variant", "case_only", "public_source", "incomplete",
]);
const ALLOWED_LIVE_HOSTS = new Set([
  "klawis.uz", "softlylove.uz", "dostupnoe-pravo-alpha.vercel.app",
  "samandarmansurkhodjaev2713.github.io", "izzatullo.uz",
]);
const PROJECT_IMAGE_SPECS = [
  { suffix: "-768", width: 768, height: 256, maxBytes: 60000, responsive: true },
  { suffix: "-1152", width: 1152, height: 384, maxBytes: 100000, responsive: true },
  { suffix: "", width: 1536, height: 512, maxBytes: 150000, responsive: false },
];
const HERO_IMAGE_SPECS = [
  { file: path.join("assets", "hero", "responsive", "release-gate-768.webp"), width: 768, height: 512, maxBytes: 60000 },
  { file: path.join("assets", "hero", "responsive", "release-gate-1152.webp"), width: 1152, height: 768, maxBytes: 100000 },
  { file: path.join("assets", "hero", "release-gate.webp"), width: 1536, height: 1024, maxBytes: 150000 },
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

function valueShape(value) {
  if (Array.isArray(value)) return { type: "array", length: value.length, items: value.map(valueShape) };
  if (value && typeof value === "object") {
    return {
      type: "object",
      keys: Object.keys(value).sort().map(function shapeKey(key) { return [key, valueShape(value[key])]; }),
    };
  }
  return { type: value === null ? "null" : typeof value };
}

function assertLocaleShape(group, label) {
  const canonical = JSON.stringify(valueShape(group.ru));
  ["en", "uz"].forEach(function compareLocale(locale) {
    assert(JSON.stringify(valueShape(group[locale])) === canonical, label + ": " + locale + " structure differs from ru");
  });
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
  assert(registry.length === 25, "expected 25 canonical products, received " + registry.length);
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
    assert(ALLOWED_LIFECYCLE.has(product.lifecycle), label + ": unsupported lifecycle " + product.lifecycle);
    assert(ALLOWED_EVIDENCE_LEVEL.has(product.evidenceLevel), label + ": unsupported evidenceLevel " + product.evidenceLevel);
    assert(Array.isArray(product.privacyBoundary) && product.privacyBoundary.length > 0, label + ": privacyBoundary is required");
    assert(Array.isArray(product.repositoryAliases), label + ": repositoryAliases must be an array");
    assert(cleanString(product.image) && product.image.endsWith(".webp"), label + ": WebP image path is required");
    assert(/^#[0-9A-F]{6}$/i.test(product.accent), label + ": accent must be a six-digit hex color");

    if (product.presentation === "live") {
      assert(cleanString(product.liveUrl), label + ": live presentation requires liveUrl");
      let live;
      try { live = new URL(product.liveUrl); } catch (error) { fail(label + ": liveUrl is invalid"); }
      assert(live.protocol === "https:", label + ": liveUrl must use HTTPS");
      assert(ALLOWED_LIVE_HOSTS.has(live.hostname), label + ": liveUrl host is not approved: " + live.hostname);
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

    if (product.claims) {
      assert(Array.isArray(product.claims) && product.claims.length > 0, label + ": claims must be a non-empty array");
      assertUnique(product.claims, (claim) => claim.id, label + " claim id");
      product.claims.forEach(function validateClaim(claim) {
        assert(cleanString(claim.id), label + ": claim id is required");
        assert(Number.isFinite(claim.value), label + "/" + claim.id + ": numeric value is required");
        assert(cleanString(claim.unit), label + "/" + claim.id + ": unit is required");
        assert(cleanString(claim.evidenceRef), label + "/" + claim.id + ": evidenceRef is required");
        const evidenceFile = claim.evidenceRef.split("#")[0];
        assert(fs.existsSync(path.join(ROOT, evidenceFile)), label + "/" + claim.id + ": evidence file is missing");
        assert(/^\d{4}-\d{2}-\d{2}$/.test(claim.reviewedAt || ""), label + "/" + claim.id + ": reviewedAt must be YYYY-MM-DD");
      });
    }

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
  assert(caseCount === 16, "expected 16 case products, received " + caseCount);
}

function validateMainContent(registry, content) {
  assert(content && typeof content === "object", "content.js did not expose window.CONTENT");
  const expectedSlugs = registry.slice().sort((a, b) => a.featuredRank - b.featuredRank).map((p) => p.slug);
  assertLocaleShape(content, "CONTENT locale parity");
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

function validateTruthAndLanguage(content, landings) {
  Object.keys(landings).forEach(function validateLandingShape(slug) {
    assertLocaleShape(landings[slug].i18n, slug + " landing locale parity");
  });
  const renderPath = path.join(ROOT, "src", "projects", "render.js");
  delete require.cache[require.resolve(renderPath)];
  assertLocaleShape(require(renderPath).LP_UI, "landing UI locale parity");

  const authored = [
    "src/content/content.js", "src/content/product-registry.js",
    "src/projects/landings-data.js", "src/projects/render.js",
  ];
  authored.forEach(function validateUnicode(relativePath) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    assert(source === source.normalize("NFC"), relativePath + ": text must be NFC-normalized");
    assert(!/[\uFFFDÃÂÐ]/.test(source), relativePath + ": possible mojibake detected");
    const words = source.match(/[A-Za-z\u0400-\u04FF]+/g) || [];
    const mixed = words.find(function mixedScript(word) {
      return /[A-Za-z]/.test(word) && /[\u0400-\u04FF]/.test(word);
    });
    assert(!mixed, relativePath + ": mixed Latin/Cyrillic token " + JSON.stringify(mixed));
  });

  const car = JSON.stringify(landings["car-superapp"].i18n);
  ["Production foundation under active development", "CI has already caught", "RLS is tested against real PostgreSQL"].forEach(function rejectCarClaim(claim) {
    assert(!car.includes(claim), "CAR Superapp discovery copy contains an implementation claim: " + claim);
  });
  const vfs = JSON.stringify(landings["vfs-killer"].i18n);
  ["Reliable automation in real", "Надёжная автоматизация", "ishonchli avtomatlashtirish"].forEach(function rejectVfsReadiness(claim) {
    assert(!vfs.includes(claim), "VFS Killer SOURCE_INCOMPLETE copy contains a readiness claim: " + claim);
  });
  const task = JSON.stringify(landings["task-manager"].i18n);
  assert(!task.includes("tests for RBAC, onboarding, deadlines, notifications, voice processing"), "Task-manager merges Rust and private Python evidence");
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
      const renderPath = path.join(ROOT, "src", "projects", "render.js");
      delete require.cache[require.resolve(renderPath)];
      const renderer = require(renderPath);
      LOCALES.forEach(function validateGeneratedLocale(locale) {
        const base = locale === "ru" ? "../../" : "../../../";
        const relativeIndex = locale === "ru" ? "index.html" : path.join(locale, "index.html");
        const indexPath = path.join(ROOT, meta.casePage, relativeIndex);
        const route = meta.casePage + (locale === "ru" ? "" : locale + "/");
        assert(fs.existsSync(indexPath), meta.id + "/" + locale + ": generated case page is missing");
        const html = fs.readFileSync(indexPath, "utf8");
        assert(html.includes('<html lang="' + locale + '"'), meta.id + "/" + locale + ": html lang drift");
        assert(html.includes('data-lp-lang="' + locale + '"'), meta.id + "/" + locale + ": static locale marker is missing");
        assert(html.includes('data-lp-slug="' + meta.slug + '"'), meta.id + "/" + locale + ": generated slug marker is missing");
        assert(html.includes('<link rel="canonical" href="https://samandarmansurkhodjaev2713.github.io/CV-Samandar/' + route + '">'), meta.id + "/" + locale + ": canonical is not self-referential");
        assert(html.includes('<div id="lp-root">' + renderer.LP_render(landing, locale, base) + '</div>'), meta.id + "/" + locale + ": source/generated body drift");
        assert(!/<script\b(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/i.test(html), meta.id + "/" + locale + ": executable inline JavaScript");
        assert(html.includes('http-equiv="Content-Security-Policy"'), meta.id + "/" + locale + ": no CSP");
        const inlineBlocks = Array.from(html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1]);
        inlineBlocks.forEach(function requireInlineHash(source) {
          const hash = "sha256-" + crypto.createHash("sha256").update(source, "utf8").digest("base64");
          assert(html.includes(hash), meta.id + "/" + locale + ": CSP is missing an exact inline-data hash");
        });
        assert(html.includes(base + "src/content/product-registry.js"), meta.id + "/" + locale + ": product registry is not loaded");
        assert(html.includes('hreflang="ru"') && html.includes('hreflang="en"') && html.includes('hreflang="uz"') && html.includes('hreflang="x-default"'), meta.id + "/" + locale + ": hreflang set is incomplete");
        assert(html.includes('"@type":"CreativeWork"') && html.includes('"inLanguage":"' + locale + '"'), meta.id + "/" + locale + ": localized schema is missing");
        assert(html.includes('name="twitter:image" content="https://'), meta.id + "/" + locale + ": Twitter image must be absolute");
        assert(html.includes('href="' + base + '#proj-' + meta.slug + '"'), meta.id + "/" + locale + ": return link does not preserve card context");
        assert(html.includes("assets/proj/responsive/" + meta.slug + "-768.webp 768w"), meta.id + "/" + locale + ": no 768px image candidate");
      });
      const ruHtml = fs.readFileSync(path.join(ROOT, meta.casePage, "index.html"), "utf8");
      const diagramMatch = ruHtml.match(/data-diagram="([^"]+)"/);
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
  const bootstrap = fs.readFileSync(path.join(ROOT, "src", "engine", "bootstrap.js"), "utf8");
  const lazyEffects = fs.readFileSync(path.join(ROOT, "src", "engine", "lazy-effects.js"), "utf8");
  assert(!html.includes("??v="), "index.html contains a malformed asset version query");
  const assetVersions = Array.from(html.matchAll(/\?v=(\d+)/g)).map((match) => match[1]);
  assert(assetVersions.length > 0, "index.html has no cache-busted assets");
  assert(new Set(assetVersions).size === 1, "index.html asset versions drifted");
  const registryAt = bootstrap.indexOf("src/content/product-registry.js");
  const contentAt = bootstrap.indexOf("src/content/content.js");
  const perfAt = bootstrap.indexOf("src/engine/perf.js");
  const runtimeAt = bootstrap.indexOf("src/engine/motion-runtime.js");
  const motionAt = bootstrap.indexOf("src/engine/motion.js");
  const cinemaAt = bootstrap.indexOf("src/engine/scene-cinema.js");
  assert(registryAt >= 0 && contentAt >= 0 && registryAt < contentAt, "product registry must load before content.js");
  assert(
    perfAt >= 0 && runtimeAt > perfAt && motionAt > runtimeAt && cinemaAt > runtimeAt,
    "motion policy and runtime must load before every authored motion consumer"
  );
  assert(html.indexOf("src/engine/intro.js") < html.indexOf("src/engine/bootstrap.js"), "intro must start before the cooperative app bootstrap");
  assert(lazyEffects.indexOf("vendor/three.min.js") < lazyEffects.indexOf("src/engine/img-fx.js"), "lazy shader must load Three.js before img-fx");
  assert(!html.includes('<script src="vendor/three.min.js"'), "Three.js must not block the initial document parser");
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

function validateRuntimeShell(generated) {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const appSource = fs.readFileSync(path.join(ROOT, "src", "components", "app.jsx"), "utf8");
  const headBoot = fs.readFileSync(path.join(ROOT, "src", "engine", "head-boot.js"), "utf8");
  const introSource = fs.readFileSync(path.join(ROOT, "src", "engine", "intro.js"), "utf8");
  const watchdog = fs.readFileSync(path.join(ROOT, "src", "engine", "app-watchdog.js"), "utf8");
  const deployWorkflow = fs.readFileSync(path.join(ROOT, ".github", "workflows", "deploy-pages.yml"), "utf8");
  const cacheTokens = Array.from(html.matchAll(/\?v=(\d+)/g), (match) => match[1]);
  assert(cacheTokens.length >= 15, "index.html must cache-bust all first-party assets");
  assert(new Set(cacheTokens).size === 1, "index.html contains mixed cache versions");
  assert(html.includes("<noscript>"), "index.html must provide a no-JavaScript fallback");
  assert(html.includes('src/engine/head-boot.js'), "index.html must load the parser-blocking frame-zero boot");
  assert(html.includes('src/engine/app-watchdog.js'), "index.html must load the pre-React watchdog");
  assert(html.includes('src/styles/app.bundle.min.css'), "index.html must load the generated production style bundle");
  assert(html.includes('id="sm-hero-media"'), "index.html must ship the frame-zero Hero media outside React root");
  assert(html.indexOf('id="sm-hero-media"') < html.indexOf('id="root"'), "frame-zero Hero media must precede the React root");
  HERO_IMAGE_SPECS.forEach(function validateHeroImage(spec) {
    const filePath = path.join(ROOT, spec.file);
    assert(fs.existsSync(filePath), spec.file + " is missing");
    const size = readWebpSize(filePath);
    assert(size.width === spec.width && size.height === spec.height, spec.file + " must be " + spec.width + "x" + spec.height);
    assert(fs.statSync(filePath).size <= spec.maxBytes, spec.file + " exceeds " + spec.maxBytes + " bytes");
    assert(html.includes(spec.file.replace(/\\/g, "/")), "index.html must reference " + spec.file);
  });
  assert(appSource.includes("release-gate-1152.webp"), "fullscreen Index must continue the Release Gate visual system");
  assert(introSource.includes("release-gate-1152.webp"), "Intro must continue the Release Gate visual system");
  assert(!html.includes("proof-instrument") && !appSource.includes("proof-instrument") && !introSource.includes("proof-instrument"), "retired Proof Instrument must not return to the critical path");
  assert(!html.includes('rel="stylesheet" href="src/styles/sections.css'), "index.html must not bypass the generated style bundle");
  if (generated) {
    const styleBundle = path.join(ROOT, "src", "styles", "app.bundle.min.css");
    assert(fs.existsSync(styleBundle), "generated production style bundle is missing");
    assert(fs.readFileSync(styleBundle, "utf8").startsWith("/*! AUTO-GENERATED"), "production style bundle must be generated by build.js");
  }
  assert(headBoot.includes("__SM_INTRO.safety") && headBoot.includes("__SM_INTRO.recover"), "head boot must own timeout and recovery paths");
  assert(watchdog.includes("__SM_APP_WATCHDOG") && watchdog.includes("fatal-shell"), "watchdog must provide a branded pre-React recovery state");
  assert(!/onclick=["']/.test(headBoot + watchdog), "recovery modules must not require inline event handlers");
  assert(!/<script\b(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>/i.test(html), "index.html contains executable inline JavaScript");
  if (generated) {
    assert(html.includes('http-equiv="Content-Security-Policy"'), "index.html must emit a Content Security Policy");
    assert(html.includes("style-src 'self'; style-src-elem 'self'; style-src-attr 'unsafe-inline'"), "CSP must isolate authored stylesheets from required dynamic style attributes");
    assert(!html.includes("style-src 'self' 'unsafe-inline'"), "CSP must not allow arbitrary inline style elements");
    const inlineBlocks = Array.from(html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi), (match) => match[1]);
    inlineBlocks.forEach(function requireInlineHash(source) {
      const hash = "sha256-" + crypto.createHash("sha256").update(source, "utf8").digest("base64");
      assert(html.includes(hash), "main CSP is missing an exact hash for inline structured data");
    });
  }
  assert(appSource.includes("class ErrorBoundary"), "React render failures need an ErrorBoundary");
  assert(appSource.includes('className="fatal-shell"'), "ErrorBoundary must render the branded recovery surface");
  assert(deployWorkflow.includes("npm ci"), "deployment must install the locked dependency graph");
  assert(deployWorkflow.includes("npm audit --audit-level=high"), "deployment must audit the dependency graph");
  assert(deployWorkflow.includes("npm run scan:secrets"), "deployment must scan repository candidates for secrets");
  assert(deployWorkflow.includes("npm test"), "deployment must pass the automated quality gate");
  assert(deployWorkflow.includes("git status --porcelain --untracked-files=all -- index.html src/components src/styles/app.bundle.min.css projects sitemap.xml"), "deployment must reject tracked and untracked generated drift");
  assert(!/uses:\s*[^\s]+@v\d+/i.test(deployWorkflow), "deployment actions must be pinned to immutable commit SHAs");
  assert(/deploy:[\s\S]*?permissions:\s*\n\s+pages:\s*write\s*\n\s+id-token:\s*write/.test(deployWorkflow), "only the deploy job may receive Pages write credentials");
  assert(!/^\s*cp\s+index\.html\s+404\.html\s*$/m.test(deployWorkflow), "deployment must preserve the intentional 404 page");
}

function validateDiscoveryArtifacts(registry, generated) {
  const main = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const siteBase = "https://samandarmansurkhodjaev2713.github.io/CV-Samandar/";
  assert(main.includes('<meta name="robots" content="index,follow,max-image-preview:large"'), "main robots directive is incomplete");
  assert(main.includes('<meta property="og:image" content="' + siteBase), "main OG image must be absolute");
  ["ru", "en", "uz", "x-default"].forEach(function requireMainHreflang(locale) {
    assert(main.includes('hreflang="' + locale + '"'), "main hreflang is missing: " + locale);
  });
  assert(main.includes('"@type": "Person"'), "main Person structured data is missing");

  const robotsPath = path.join(ROOT, "robots.txt");
  const notFoundPath = path.join(ROOT, "404.html");
  assert(fs.existsSync(robotsPath), "robots.txt is missing");
  assert(fs.existsSync(notFoundPath), "404.html is missing");
  const robots = fs.readFileSync(robotsPath, "utf8");
  const notFound = fs.readFileSync(notFoundPath, "utf8");
  assert(robots.includes("Sitemap: " + siteBase + "sitemap.xml"), "robots.txt does not advertise the canonical sitemap");
  assert(/name="robots" content="noindex,follow"/.test(notFound), "404 must be noindex,follow");
  assert(notFound.includes('/CV-Samandar/#projects'), "404 must offer a route back to projects");
  assert(notFound.includes('http-equiv="Content-Security-Policy"'), "404 must enforce CSP");
  assert(notFound.includes('/CV-Samandar/src/styles/404.css'), "404 must use its external style sheet");
  assert(!/<style\b/i.test(notFound), "404 must not rely on inline CSS");

  if (!generated) return;
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  assert(fs.existsSync(sitemapPath), "generated sitemap.xml is missing");
  const sitemap = fs.readFileSync(sitemapPath, "utf8");
  const expectedUrls = [siteBase];
  registry.filter((product) => product.presentation === "case").forEach(function addLocalizedUrls(product) {
    expectedUrls.push(siteBase + product.casePage);
    expectedUrls.push(siteBase + product.casePage + "en/");
    expectedUrls.push(siteBase + product.casePage + "uz/");
  });
  const actualUrls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
  assert(actualUrls.length === expectedUrls.length, "sitemap URL count drift");
  expectedUrls.forEach(function requireSitemapUrl(url) {
    assert(actualUrls.includes(url), "sitemap is missing " + url);
  });
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
  validateTruthAndLanguage(content, landings);
  validateScriptOrder();
  validateMotionArchitecture();
  validateRuntimeShell(Boolean(options && options.generated));
  validateDiscoveryArtifacts(registry, Boolean(options && options.generated));
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
