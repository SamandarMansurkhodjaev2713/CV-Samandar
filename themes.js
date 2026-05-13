// themes.js — 6 named themes (Matrix, Vercel, Claude, Linear, Cursor, GitHub)
// Each: accent (primary), accent2 (secondary), bg (page bg), bgPanel (cards), text, text-dim
window.THEMES = {
  matrix: {
    name: "Matrix",
    accent: "#39FF7A", accent2: "#9DFF45",
    bg0: "#050807", bg1: "#0A1410", panel: "#0F1A14",
    text: "#E8FFEC", textDim: "#7AA88A", textMute: "#3F5A48",
    line: "rgba(57,255,122,0.10)", lineStrong: "rgba(57,255,122,0.22)",
  },
  vercel: {
    name: "Vercel",
    accent: "#FFFFFF", accent2: "#888888",
    bg0: "#000000", bg1: "#0A0A0A", panel: "#111111",
    text: "#FAFAFA", textDim: "#A1A1A1", textMute: "#525252",
    line: "rgba(255,255,255,0.08)", lineStrong: "rgba(255,255,255,0.18)",
  },
  claude: {
    name: "Claude",
    accent: "#D97757", accent2: "#C89B5E",
    bg0: "#1F1E1B", bg1: "#28251F", panel: "#2F2B24",
    text: "#F5F0E6", textDim: "#B8AC97", textMute: "#6B6353",
    line: "rgba(217,119,87,0.10)", lineStrong: "rgba(217,119,87,0.22)",
  },
  linear: {
    name: "Linear",
    accent: "#7B66FF", accent2: "#4DEBFF",
    bg0: "#08080B", bg1: "#0F0F14", panel: "#16161D",
    text: "#F4F4F6", textDim: "#A0A0B0", textMute: "#54546A",
    line: "rgba(123,102,255,0.10)", lineStrong: "rgba(123,102,255,0.25)",
  },
  cursor: {
    name: "Cursor",
    accent: "#B8FF3D", accent2: "#4DEBFF",
    bg0: "#07090B", bg1: "#0D1014", panel: "#11151A",
    text: "#F4F1EA", textDim: "#9A9590", textMute: "#56524C",
    line: "rgba(184,255,61,0.10)", lineStrong: "rgba(184,255,61,0.22)",
  },
  github: {
    name: "GitHub",
    accent: "#3FB950", accent2: "#58A6FF",
    bg0: "#0D1117", bg1: "#161B22", panel: "#1C2128",
    text: "#E6EDF3", textDim: "#8B949E", textMute: "#484F58",
    line: "rgba(63,185,80,0.10)", lineStrong: "rgba(63,185,80,0.22)",
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

window.applyTheme = function(themeKey) {
  const t = window.THEMES[themeKey] || window.THEMES.cursor;
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
