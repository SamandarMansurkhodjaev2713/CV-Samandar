// themes.js — single theme: Ember (warm bronze), the brand.
//
// v56 — the multi-theme system (Cortex / Sage + legacy palettes) and the
// runtime theme switcher were removed. The site now ships one theme. The
// theme's internal key stays "claude" so any value persisted in older
// builds' localStorage still resolves cleanly; the display name is "Ember".
window.THEMES = {
  claude: {
    name: "Ember",
    accent: "#D97757", accent2: "#C89B5E",
    bg0: "#1F1E1B", bg1: "#28251F", panel: "#2F2B24",
    text: "#F5F0E6", textDim: "#B8AC97", textMute: "#9C9180",
    line: "rgba(217,119,87,0.10)", lineStrong: "rgba(217,119,87,0.22)",
  },
};
// The single source-of-truth theme key. applyTheme falls back to this for
// any unknown key (e.g. a stale "cortex"/"sage" left in localStorage).
window.DEFAULT_THEME_KEY = "claude";

window.FONT_STACKS = {
  geist: {
    name: "Geist · Inter · JetBrains",
    display: "'Geist', 'Inter', system-ui, -apple-system, sans-serif",
    body:    "'Inter', 'Geist', system-ui, -apple-system, sans-serif",
    mono:    "'JetBrains Mono', ui-monospace, monospace",
    serif:   "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
  },
  mono_brutal: {
    name: "Mono Brutal",
    display: "'JetBrains Mono', ui-monospace, monospace",
    body:    "'JetBrains Mono', ui-monospace, monospace",
    mono:    "'JetBrains Mono', ui-monospace, monospace",
    serif:   "'Instrument Serif', Georgia, serif",
  },
  editorial: {
    name: "Editorial Serif",
    display: "'Instrument Serif', 'Iowan Old Style', Georgia, serif",
    body:    "'Inter', system-ui, sans-serif",
    mono:    "'JetBrains Mono', ui-monospace, monospace",
    serif:   "'Instrument Serif', Georgia, serif",
  },
};

function hexToRgbStr(hex) {
  if (!hex) return null;
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map(c=>c+c).join("") : h;
  const n = parseInt(v, 16);
  if (Number.isNaN(n)) return null;
  return `${(n>>16)&255} ${(n>>8)&255} ${n&255}`;
}

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
  // Resolve the theme; unknown keys (e.g. a stale "cortex" in localStorage
  // from an older build) fall back to the single default theme.
  const resolvedKey = window.THEMES[themeKey] ? themeKey : window.DEFAULT_THEME_KEY;
  const t = window.THEMES[resolvedKey];
  // Remembered so acts.js can hand ink control back after a light act.
  window.CURRENT_THEME = resolvedKey;
  const r = document.documentElement.style;
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-2", t.accent2);
  r.setProperty("--accent-rgb", hexToRgbStr(t.accent));
  r.setProperty("--accent-2-rgb", hexToRgbStr(t.accent2));
  r.setProperty("--bg-0", t.bg0);
  r.setProperty("--bg-1", t.bg1);
  r.setProperty("--bg-panel", t.panel);
  r.setProperty("--text", t.text);
  r.setProperty("--text-dim", t.textDim);
  r.setProperty("--text-mute", t.textMute);
  r.setProperty("--line", t.line);
  r.setProperty("--line-strong", t.lineStrong);
  // Mirror the RESOLVED key to data-theme so CSS that branches on it
  // (e.g. the Ember corner-wash decoration) always matches reality.
  document.documentElement.setAttribute("data-theme", resolvedKey);
  // Background and ink are deliberately NOT written inline onto <body> any more.
  // The stylesheet already resolves both from the tokens set above, and an
  // inline copy beats every rule — which froze the page ink and made the light
  // acts (CV, Quality) impossible: the ground turned bone while the text stayed
  // cream. Setting the tokens is enough; <body> follows them, and acts.js can
  // now invert those same tokens for a light act.
  return t;
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
