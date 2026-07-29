// themes.js — single theme: Ember (warm bronze), the brand.
//
// v56 — the multi-theme system (Cortex / Sage + legacy palettes) and the
// runtime theme switcher were removed. The site now ships one theme. The
// theme's internal key stays "claude" so any value persisted in older
// builds' localStorage still resolves cleanly; the display name is "Ember".
window.THEMES = {
  claude: {
    name: "Ember",
  },
};
// The single source-of-truth theme key. applyTheme falls back to this for
// any unknown key (e.g. a stale "cortex"/"sage" left in localStorage).
window.DEFAULT_THEME_KEY = "claude";

window.FONT_STACKS = {
  geist: {
    name: "Oswald · Inter · JetBrains",
    display: "'Oswald', 'Inter', system-ui, -apple-system, sans-serif",
    body:    "'Inter', system-ui, -apple-system, sans-serif",
    mono:    "'JetBrains Mono', ui-monospace, monospace",
    serif:   "'Cormorant Garamond', 'Iowan Old Style', Georgia, serif",
  },
  mono_brutal: {
    name: "Mono Brutal",
    display: "'JetBrains Mono', ui-monospace, monospace",
    body:    "'JetBrains Mono', ui-monospace, monospace",
    mono:    "'JetBrains Mono', ui-monospace, monospace",
    serif:   "'Cormorant Garamond', Georgia, serif",
  },
  editorial: {
    name: "Editorial Serif",
    display: "'Cormorant Garamond', 'Iowan Old Style', Georgia, serif",
    body:    "'Inter', system-ui, sans-serif",
    mono:    "'JetBrains Mono', ui-monospace, monospace",
    serif:   "'Cormorant Garamond', Georgia, serif",
  },
};

// ── Device performance tier ──────────────────────────────────────────────
// Heuristic detection used to scale back GPU/CPU-heavy effects on weak
// hardware. Computed once and cached. Signals:
//   • navigator.hardwareConcurrency — logical CPU cores (widely supported).
//   • navigator.deviceMemory        — approx RAM in GB (Chromium only;
//                                     capped at 8, undefined elsewhere).
// Unknown values default to "capable" so we never needlessly degrade a
// device we simply can't measure.
const DEVICE_TIER_CORE_THRESHOLD = 4;   // ≤ this many cores → low tier
const DEVICE_TIER_MEMORY_THRESHOLD = 4; // ≤ this many GB    → low tier
let cachedDeviceTier = null;
window.getDeviceTier = function () {
  if (cachedDeviceTier) return cachedDeviceTier;
  let cores = 8;
  let memory = 8;
  if (typeof navigator !== "undefined") {
    if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency > 0) {
      cores = navigator.hardwareConcurrency;
    }
    if (typeof navigator.deviceMemory === "number" && navigator.deviceMemory > 0) {
      memory = navigator.deviceMemory;
    }
  }
  cachedDeviceTier =
    (cores <= DEVICE_TIER_CORE_THRESHOLD || memory <= DEVICE_TIER_MEMORY_THRESHOLD)
      ? "low"
      : "normal";
  return cachedDeviceTier;
};

window.applyTheme = function(themeKey) {
  // CSS is the sole source of colour truth. Runtime only resolves a stale
  // persisted key and publishes identity; it never rewrites first-paint
  // variables, so the initial frame and hydrated frame cannot diverge.
  const resolvedKey = window.THEMES[themeKey] ? themeKey : window.DEFAULT_THEME_KEY;
  const t = window.THEMES[resolvedKey];
  window.CURRENT_THEME = resolvedKey;
  document.documentElement.setAttribute("data-theme", resolvedKey);
  const css = getComputedStyle(document.documentElement);
  return {
    name: t.name,
    accent: css.getPropertyValue("--accent").trim(),
    accent2: css.getPropertyValue("--accent-2").trim(),
  };
};

window.applyFontStack = function(key) {
  const f = window.FONT_STACKS[key] || window.FONT_STACKS.geist;
  const r = document.documentElement.style;
  r.setProperty("--f-display", f.display);
  r.setProperty("--f-body", f.body);
  r.setProperty("--f-mono", f.mono);
  r.setProperty("--f-serif", f.serif || f.display);
  return f;
};
