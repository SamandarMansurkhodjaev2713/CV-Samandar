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
  var STEEL = "110, 139, 166";  // retained for compatibility with older CSS

  function topGlow(rgb, a) {
    return "radial-gradient(ellipse 95% 70% at 50% -12%, rgba(" + rgb + ", " + a + "), transparent 62%)";
  }
  function duskGlow(rgb, a) {
    return "radial-gradient(ellipse 80% 55% at 50% 112%, rgba(" + rgb + ", " + a + "), transparent 60%)";
  }

  // Per-act accents — ACCENT HELD IN RESERVE.
  //
  // The site used to paint terracotta on essentially every element, and the eye
  // stops seeing a colour that is always there. So the ATMOSPHERIC accent is now
  // bone and ash by default — the graphite/paper end of the palette — and the
  // warm accent appears rarely and deliberately: the primary CTA, live statuses,
  // and the destination. Less colour makes the colour felt MORE.
  //
  // The brand tokens themselves never move: a primary button that changes hue
  // every screen stops reading as "the button".
  var BONE   = "232, 230, 225"; // the default atmospheric accent — near-white
  var ASH    = "150, 146, 138"; // quieter still: analytical blocks
  var SLATE  = "122, 145, 168"; // one cool note, for the engineering dip
  var COPPER = "205, 122, 74";  // reserved: the heart of the work
  var SAND   = "196, 160, 108"; // reserved: warming toward the destination

  // Section → act preset. --act-bg deltas are ±3–5 per channel around the
  // base #1F1E1B (31,30,27) — felt as atmosphere, never read as a repaint.
  // The glow layer carries the legible part of the journey.
  // Light acts (CV, trust) invert the ground entirely — see the .act-light
  // class applied below and the light-section styles in sections.css.
  // One material world. Chapters change depth and composition, not palette.
  // The tiny background deltas are enough to separate stacked plates while a
  // single brass inspection light keeps the complete route coherent.
  var ACTS = {
    hero:     { bg: "#090A09", accent: BRASS, glow: topGlow(BRASS, 0.030) },
    signal:   { bg: "#0A0B0A", accent: BRASS, glow: topGlow(BRASS, 0.026) },
    about:    { bg: "#0B0C0B", accent: BRASS, glow: topGlow(BRASS, 0.024) },
    projects: { bg: "#0C0D0B", accent: BRASS, glow: topGlow(BRASS, 0.032) },
    builder:  { bg: "#0B0C0A", accent: BRASS, glow: topGlow(BRASS, 0.028) },
    skills:   { bg: "#090B0A", accent: BRASS, glow: topGlow(BRASS, 0.024) },
    services: { bg: "#0A0B0A", accent: BRASS, glow: topGlow(BRASS, 0.025) },
    cv:       { bg: "#0B0C0B", accent: BRASS, glow: topGlow(BRASS, 0.022) },
    process:  { bg: "#090A09", accent: BRASS, glow: topGlow(BRASS, 0.024) },
    faq:      { bg: "#0A0B0A", accent: BRASS, glow: topGlow(BRASS, 0.025) },
    trust:    { bg: "#0B0C0A", accent: BRASS, glow: topGlow(BRASS, 0.026) },
    contact:  { bg: "#100E0A", accent: BRASS, glow: topGlow(BRASS, 0.040) + ", " + duskGlow(EMBER, 0.030) },
  };
  var DEFAULT_ACT = "about"; // the neutral base — what no-JS/unknown ids resolve to

  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* opportunistic */ }
  var FADE_MS = reduced ? 150 : 1400;

  var veilA, veilB, frontIsA = false, light;
  var current = null;
  var currentId = null;
  var unsubscribeRuntime = function () {};
  var fallbackPointerHandler = null;
  var sectionHandler = null;

  // ── Shutters — the "instrument hatch" beat at the two MAJOR act changes
  // (entering the projects heart, arriving at contact). Two thin plates blink
  // in from the screen edges and retreat, brass seam first. Deliberately rare:
  // an event on every joint would read as a metronome. Non-blocking overlay
  // (pointer-events:none), pure CSS animation, skipped on reduced-motion.
  var SHUTTER_AT = { projects: 1, contact: 1 };
  var shutterTop = null, shutterBot = null, shutterTimer = 0, exitTimer = 0;
  var exitPending = false;

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

  function navigateWithShutter(destination) {
    if (!destination || exitPending) return false;
    exitPending = true;
    if (reduced || !shutterTop || !shutterBot) {
      window.location.assign(destination);
      return true;
    }
    shutterTop.classList.remove("is-run", "is-exit");
    shutterBot.classList.remove("is-run", "is-exit");
    void shutterTop.offsetWidth;
    shutterTop.classList.add("is-exit");
    shutterBot.classList.add("is-exit");
    document.documentElement.classList.add("sm-is-leaving");
    window.clearTimeout(exitTimer);
    // Navigate at full closure. The next document has the same dark base, so
    // there is no white flash while its first meaningful paint is prepared.
    exitTimer = window.setTimeout(function () {
      window.location.assign(destination);
    }, 440);
    return true;
  }

  function resetExitState() {
    exitPending = false;
    window.clearTimeout(exitTimer);
    document.documentElement.classList.remove("sm-is-leaving");
    if (shutterTop) shutterTop.classList.remove("is-exit");
    if (shutterBot) shutterBot.classList.remove("is-exit");
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
    //
    // --act-accent-rgb MUST be space-separated to match --accent-rgb, because
    // the whole stylesheet composes alpha with the modern slash syntax:
    //     rgba(var(--act-accent-rgb) / 0.3)
    // With commas that expands to `rgba(217, 119, 87 / 0.3)`, which is invalid,
    // so the browser silently DROPS the declaration — the rule paints nothing
    // and no error is reported anywhere. (Found exactly that way: nine section
    // signatures animated correctly while rendering fully transparent.)
    document.documentElement.style.setProperty("--act-accent-rgb", act.accent.replace(/,\s*/g, " "));
    document.documentElement.style.setProperty("--act-accent", "rgb(" + act.accent + ")");
    // Light acts invert through one class. themes.js no longer writes palette
    // variables inline, so the stylesheet remains authoritative at every
    // point in the transition.
    var root = document.documentElement;
    root.classList.toggle("act-light", !!act.light);
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
    var runtime = window.__SM_MOTION_RUNTIME;
    if (runtime && typeof runtime.subscribe === "function") {
      unsubscribeRuntime = runtime.subscribe({
        id: "act-pointer-light",
        priority: 46,
        enabled: function (context) {
          return Boolean(light) && !context.policy.reducedMotion && context.policy.pointerClass === "fine";
        },
        mutate: function (context) {
          if (!context.input.pointerMoved && context.input.reason !== "subscribe:act-pointer-light") return;
          light.style.transform =
            "translate3d(" + (context.input.pointerX - HALF) + "px," +
            (context.input.pointerY - HALF) + "px,0)";
        },
      });
      runtime.wake("act-pointer-light-init");
      return;
    }

    // Recovery only: production uses the shared pointer stream above.
    fallbackPointerHandler = function (event) {
      light.style.transform =
        "translate3d(" + (event.clientX - HALF) + "px," +
        (event.clientY - HALF) + "px,0)";
    };
    window.addEventListener("pointermove", fallbackPointerHandler, { passive: true });
  }

  function dispose() {
    unsubscribeRuntime();
    unsubscribeRuntime = function () {};
    window.removeEventListener("pageshow", resetExitState);
    if (fallbackPointerHandler) {
      window.removeEventListener("pointermove", fallbackPointerHandler);
      fallbackPointerHandler = null;
    }
    if (sectionHandler) {
      window.removeEventListener("sm:section", sectionHandler);
      sectionHandler = null;
    }
    window.clearTimeout(shutterTimer);
    window.clearTimeout(exitTimer);
    [shutterTop, shutterBot, veilA, veilB, light].forEach(function (element) {
      if (element && element.parentNode) element.parentNode.removeChild(element);
    });
    shutterTop = null;
    shutterBot = null;
    veilA = null;
    veilB = null;
    light = null;
  }

  function boot() {
    if (!document.body) return; // scripts load at end of <body>; this is belt-and-braces
    veilA = makeVeil();
    veilB = makeVeil();
    makeShutters();
    initLight();
    apply(DEFAULT_ACT);
    sectionHandler = function (e) {
      if (e && e.detail && e.detail.id) apply(e.detail.id);
    };
    window.addEventListener("sm:section", sectionHandler);
    // History can revive this document from the back-forward cache with its
    // old classes intact. Always reopen the aperture on pageshow.
    window.addEventListener("pageshow", resetExitState);
    // Sync hook: verification in headless preview (IO frozen) + public API.
    window.__SM_ACTS = {
      set: apply,
      // Public: play the hatch on demand. Used when leaving for a product
      // landing in browsers that cannot morph across documents, so the hand-off
      // is still a designed beat rather than a blank frame.
      shutter: runShutter,
      navigate: navigateWithShutter,
      current: function () {
        for (var k in ACTS) { if (ACTS[k] === current) return k; }
        return null;
      },
      acts: Object.keys(ACTS),
      dispose: dispose,
    };
  }

  boot();
})();
