// themes.js — named themes. Each entry includes accent (primary), accent2
// (secondary), background levels, text levels, line colours, and a
// `bgProfile` key that picks the background animation character in bg-fx.js.
//
// v54 — the 3-theme showcase system (toggled in the navbar):
//   • claude (display "Ember")  — warm bronze, the brand. bgProfile "ember".
//   • cortex                    — cool indigo + cyan, neural. bgProfile "cortex".
//   • sage                      — pastel sand-gold + sage. bgProfile "sage".
// The remaining themes (matrix/vercel/linear/cursor/github) stay available
// through the tweaks panel; they default to the "ember" bgProfile.
//
// NOTE: the key for the warm-bronze theme remains "claude" (not "ember") to
// preserve backward compatibility with any value persisted in localStorage
// by earlier builds. Only the display `name` reads "Ember".
window.THEMES = {
  matrix: {
    name: "Matrix",
    accent: "#39FF7A", accent2: "#9DFF45",
    bg0: "#050807", bg1: "#0A1410", panel: "#0F1A14",
    text: "#E8FFEC", textDim: "#7AA88A", textMute: "#3F5A48",
    line: "rgba(57,255,122,0.10)", lineStrong: "rgba(57,255,122,0.22)",
    bgProfile: "ember",
  },
  vercel: {
    name: "Vercel",
    accent: "#FFFFFF", accent2: "#888888",
    bg0: "#000000", bg1: "#0A0A0A", panel: "#111111",
    text: "#FAFAFA", textDim: "#A1A1A1", textMute: "#525252",
    line: "rgba(255,255,255,0.08)", lineStrong: "rgba(255,255,255,0.18)",
    bgProfile: "ember",
  },
  // ── Ember — warm bronze (the brand). Palette + animation UNCHANGED from
  //    the original Claude theme; this is the default showcase theme. ──
  claude: {
    name: "Ember",
    accent: "#D97757", accent2: "#C89B5E",
    bg0: "#1F1E1B", bg1: "#28251F", panel: "#2F2B24",
    text: "#F5F0E6", textDim: "#B8AC97", textMute: "#6B6353",
    line: "rgba(217,119,87,0.10)", lineStrong: "rgba(217,119,87,0.22)",
    bgProfile: "ember",
  },
  // ── Cortex — cool indigo + cyan. The neural / AI register: deep
  //    midnight-blue surfaces, soft-electric indigo accent, cyan-teal
  //    secondary. Pastel-bright, not neon-harsh. ──
  cortex: {
    name: "Cortex",
    accent: "#7E8BFF", accent2: "#63D8D0",
    bg0: "#0D0F18", bg1: "#141726", panel: "#191D30",
    text: "#ECEEF8", textDim: "#9CA2C0", textMute: "#565C7C",
    line: "rgba(126,139,255,0.10)", lineStrong: "rgba(126,139,255,0.26)",
    bgProfile: "cortex",
  },
  // ── Sage — pastel sand-gold + sage-mint. The calm / organic register:
  //    soft forest-night surfaces, desaturated sand-gold accent, sage-mint
  //    secondary. Clearly distinct from Ember in any room. ──
  sage: {
    name: "Sage",
    accent: "#E0B97E", accent2: "#9FC9A0",
    bg0: "#181C18", bg1: "#1F241F", panel: "#252B25",
    text: "#ECE8DA", textDim: "#ABAA98", textMute: "#646A60",
    line: "rgba(224,185,126,0.10)", lineStrong: "rgba(224,185,126,0.24)",
    bgProfile: "sage",
  },
  linear: {
    name: "Linear",
    accent: "#7B66FF", accent2: "#4DEBFF",
    bg0: "#08080B", bg1: "#0F0F14", panel: "#16161D",
    text: "#F4F4F6", textDim: "#A0A0B0", textMute: "#54546A",
    line: "rgba(123,102,255,0.10)", lineStrong: "rgba(123,102,255,0.25)",
    bgProfile: "ember",
  },
  cursor: {
    name: "Cursor",
    accent: "#B8FF3D", accent2: "#4DEBFF",
    bg0: "#07090B", bg1: "#0D1014", panel: "#11151A",
    text: "#F4F1EA", textDim: "#9A9590", textMute: "#56524C",
    line: "rgba(184,255,61,0.10)", lineStrong: "rgba(184,255,61,0.22)",
    bgProfile: "ember",
  },
  github: {
    name: "GitHub",
    accent: "#3FB950", accent2: "#58A6FF",
    bg0: "#0D1117", bg1: "#161B22", panel: "#1C2128",
    text: "#E6EDF3", textDim: "#8B949E", textMute: "#484F58",
    line: "rgba(63,185,80,0.10)", lineStrong: "rgba(63,185,80,0.22)",
    bgProfile: "ember",
  },
};

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
  const t = window.THEMES[themeKey] || window.THEMES.cursor;
  const r = document.documentElement.style;
  // Set --accent-rgb FIRST so `transition: background-color` sees a
  // resolvable new value when it picks up the change in the same frame.
  r.setProperty("--accent-rgb", hexToRgbStr(t.accent));
  r.setProperty("--accent-2-rgb", hexToRgbStr(t.accent2));
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-2", t.accent2);
  r.setProperty("--bg-0", t.bg0);
  r.setProperty("--bg-1", t.bg1);
  r.setProperty("--bg-panel", t.panel);
  r.setProperty("--text", t.text);
  r.setProperty("--text-dim", t.textDim);
  r.setProperty("--text-mute", t.textMute);
  r.setProperty("--line", t.line);
  r.setProperty("--line-strong", t.lineStrong);
  // Mirror to data-theme attribute so CSS can branch on it for any rules
  // that need theme-specific tweaks (e.g. softer shadow intensity in sage).
  document.documentElement.setAttribute("data-theme", themeKey);
  // Also push the bg colour onto <body> directly so the entire page surface
  // — including areas not covered by section backgrounds — transitions.
  // Animating this via the CSS transition in features.css makes the swap
  // feel page-wide instead of patchy.
  document.body.style.backgroundColor = t.bg0;
  document.body.style.color = t.text;
  // Notify listeners (Hero robot, project-side widgets) so they can retint
  // anything they own. Best-effort — CustomEvent unavailable in very old
  // environments simply means widgets miss the swap (visual-only impact).
  try {
    window.dispatchEvent(new CustomEvent("theme-changed", {
      detail: { key: themeKey, accent: t.accent, accent2: t.accent2 },
    }));
  } catch (err) {
    console.warn("[themes] dispatchEvent failed:", err && err.message);
  }
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
