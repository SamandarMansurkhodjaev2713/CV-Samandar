// acts.js — Colour dramaturgy engine ("акт-движок").
//
// The page itself — not just the WebGL scene — travels through a temperature
// arc as you scroll: coolest at the hero, warm at the heart (projects),
// cool analytical dips (skills radar, CV document), warmest at contact.
// The arc DELIBERATELY mirrors bg-fx.js's HUE_SHIFTS_BY_SECTION so the page
// ground and the 3D scene never argue about the weather.
//
// Three cheap layers, zero per-frame JS:
//   1. body background-color  — driven by the CSS var --act-bg; a CSS
//      transition does the smoothing, so there is NO rAF loop to stall.
//   2. Act glow — two fixed, full-screen gradient veils (A/B). A change
//      paints the incoming act's gradient on the hidden veil and crossfades
//      opacity. background-image can't transition; two-layer opacity can.
//   3. Mouse light — one soft radial that lazily follows the pointer
//      (fine pointers only). Position via transform with a long CSS
//      transition = built-in inertia, again no rAF.
//
// Section changes arrive via the "sm:section" CustomEvent dispatched by the
// App's existing IntersectionObserver (single source of truth for "where the
// reader is"). window.__SM_ACTS.set(id) applies the same path synchronously —
// that's the verification hook for headless preview (IO/rAF frozen there) and
// a public escape hatch.
//
// Perf/degradation contract (user-approved): this engine runs EVERYWHERE —
// it is two opacity transitions and one background-color transition, far
// below any device budget. prefers-reduced-motion keeps the colours but
// makes changes near-instant (colour shift is not motion, but a 1.4s ambient
// crossfade is; 150ms reads as immediate without a hard pop).
(function () {
  "use strict";

  var EMBER = "217, 119, 87";   // --accent
  var BRASS = "200, 155, 94";   // --accent-2
  var STEEL = "110, 139, 166";  // analytical cool (matches SM steel telemetry)

  function topGlow(rgb, a) {
    return "radial-gradient(ellipse 95% 70% at 50% -12%, rgba(" + rgb + ", " + a + "), transparent 62%)";
  }
  function duskGlow(rgb, a) {
    return "radial-gradient(ellipse 80% 55% at 50% 112%, rgba(" + rgb + ", " + a + "), transparent 60%)";
  }

  // Per-act accents. These drift with the journey and drive ATMOSPHERIC accent
  // surfaces only — eyebrows, hairlines, telemetry, signature animations. The
  // brand tokens (--accent on the CTA, the brand mark) deliberately never move:
  // a primary button that changes colour every screen stops reading as "the
  // button" and quietly costs conversions. So the page feels like it travels
  // while the thing you click stays a constant.
  var COPPER = "205, 122, 74";  // projects — the warm heart, close to Ember but its own
  var SLATE  = "122, 145, 168"; // engineering blocks — cool, analytical
  var SAND   = "196, 160, 108"; // services/faq — warm neutral, between ember and brass

  // Section → act preset. --act-bg deltas are ±3–5 per channel around the
  // base #1F1E1B (31,30,27) — felt as atmosphere, never read as a repaint.
  // The glow layer carries the legible part of the journey.
  var ACTS = {
    hero:     { bg: "#1D1E20", accent: STEEL,  glow: topGlow(STEEL, 0.055) },              // coolest — the start
    signal:   { bg: "#1E1E1E", accent: STEEL,  glow: topGlow(STEEL, 0.04) },
    about:    { bg: "#1F1E1B", accent: EMBER,  glow: topGlow(EMBER, 0.04) },               // neutral warm (base)
    projects: { bg: "#211E19", accent: COPPER, glow: topGlow(EMBER, 0.06) },               // warm — the heart
    skills:   { bg: "#1C1D1F", accent: SLATE,  glow: topGlow(STEEL, 0.05) },               // cool dip — the radar
    services: { bg: "#201E1A", accent: SAND,   glow: topGlow(EMBER, 0.05) },
    cv:       { bg: "#1C1D1E", accent: SLATE,  glow: topGlow(STEEL, 0.045) },              // cool dip — the document
    process:  { bg: "#1E1D1B", accent: SLATE,  glow: topGlow(EMBER, 0.035) },
    faq:      { bg: "#201E1A", accent: SAND,   glow: topGlow(EMBER, 0.045) },              // warming back up
    trust:    { bg: "#221E18", accent: BRASS,  glow: topGlow(EMBER, 0.055) },
    contact:  { bg: "#231F17", accent: BRASS,  glow: topGlow(EMBER, 0.065) + ", " + duskGlow(BRASS, 0.05) }, // warmest — destination
  };
  var DEFAULT_ACT = "about"; // the neutral base — what no-JS/unknown ids resolve to

  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* opportunistic */ }
  var FADE_MS = reduced ? 150 : 1400;

  var veilA, veilB, frontIsA = false, light;
  var current = null;
  var currentId = null;

  // ── Shutters — the "instrument hatch" beat at the two MAJOR act changes
  // (entering the projects heart, arriving at contact). Two thin plates blink
  // in from the screen edges and retreat, brass seam first. Deliberately rare:
  // an event on every joint would read as a metronome. Non-blocking overlay
  // (pointer-events:none), pure CSS animation, skipped on reduced-motion.
  var SHUTTER_AT = { projects: 1, contact: 1 };
  var shutterTop = null, shutterBot = null, shutterTimer = 0;

  function makeShutters() {
    function plate(pos) {
      var p = document.createElement("div");
      p.className = "act-shutter act-shutter--" + pos;
      p.setAttribute("aria-hidden", "true");
      document.body.appendChild(p);
      return p;
    }
    shutterTop = plate("top");
    shutterBot = plate("bot");
  }

  function runShutter() {
    if (reduced || !shutterTop) return;
    // Restart cleanly even if a previous run is mid-flight.
    shutterTop.classList.remove("is-run");
    shutterBot.classList.remove("is-run");
    void shutterTop.offsetWidth;
    shutterTop.classList.add("is-run");
    shutterBot.classList.add("is-run");
    window.clearTimeout(shutterTimer);
    shutterTimer = window.setTimeout(function () {
      shutterTop.classList.remove("is-run");
      shutterBot.classList.remove("is-run");
    }, 950);
  }

  function makeVeil() {
    var v = document.createElement("div");
    v.className = "act-veil";
    v.setAttribute("aria-hidden", "true");
    v.style.cssText =
      "position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0;" +
      "transition:opacity " + FADE_MS + "ms ease;will-change:opacity;";
    document.body.appendChild(v);
    return v;
  }

  function apply(id) {
    var act = ACTS[id] || ACTS[DEFAULT_ACT];
    // Shutter fires on a real TRANSITION into a marked act (never on the
    // initial paint — currentId is still null then).
    if (currentId !== null && currentId !== id && SHUTTER_AT[id]) runShutter();
    currentId = id;
    if (current === act) return;
    current = act;
    document.documentElement.style.setProperty("--act-bg", act.bg);
    // Atmospheric accent for this act. CSS transitions it (see styles.css), so
    // eyebrows/hairlines/telemetry drift with the journey rather than snapping.
    document.documentElement.style.setProperty("--act-accent-rgb", act.accent);
    document.documentElement.style.setProperty("--act-accent", "rgb(" + act.accent + ")");
    // Crossfade: paint the incoming gradient on the back veil, then swap roles.
    var front = frontIsA ? veilA : veilB;
    var back  = frontIsA ? veilB : veilA;
    back.style.background = act.glow;
    // Double-rAF is the textbook "commit then transition" beat, but rAF can be
    // frozen (hidden/headless tabs) — force a sync style flush instead so the
    // opacity change always transitions from a committed 0.
    void back.offsetWidth;
    back.style.opacity = "1";
    front.style.opacity = "0";
    frontIsA = !frontIsA;
  }

  function initLight() {
    // Fine pointers only — on touch the light has nothing to follow.
    var fine = false;
    try { fine = window.matchMedia("(pointer: fine)").matches; } catch (e) { /* opportunistic */ }
    if (!fine || reduced) return;
    light = document.createElement("div");
    light.className = "act-light";
    light.setAttribute("aria-hidden", "true");
    var SIZE = 760;
    light.style.cssText =
      "position:fixed;left:0;top:0;width:" + SIZE + "px;height:" + SIZE + "px;" +
      "z-index:1;pointer-events:none;border-radius:50%;" +
      "background:radial-gradient(circle, rgba(" + EMBER + ", 0.05), transparent 65%);" +
      "transform:translate3d(-9999px,-9999px,0);" +
      // The slow transition IS the inertia — the light drifts after the hand.
      "transition:transform 1.1s cubic-bezier(.22,.6,.18,1);will-change:transform;";
    document.body.appendChild(light);
    var HALF = SIZE / 2;
    window.addEventListener("pointermove", function (e) {
      light.style.transform = "translate3d(" + (e.clientX - HALF) + "px," + (e.clientY - HALF) + "px,0)";
    }, { passive: true });
  }

  function boot() {
    if (!document.body) return; // scripts load at end of <body>; this is belt-and-braces
    veilA = makeVeil();
    veilB = makeVeil();
    makeShutters();
    initLight();
    apply(DEFAULT_ACT);
    window.addEventListener("sm:section", function (e) {
      if (e && e.detail && e.detail.id) apply(e.detail.id);
    });
    // Sync hook: verification in headless preview (IO frozen) + public API.
    window.__SM_ACTS = {
      set: apply,
      current: function () {
        for (var k in ACTS) { if (ACTS[k] === current) return k; }
        return null;
      },
      acts: Object.keys(ACTS),
    };
  }

  boot();
})();
