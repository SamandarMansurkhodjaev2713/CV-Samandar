// robot-spline.js — Spline-runtime backed robot for the hero canvas.
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The hand-built robot (`robot.js`) was technically nice but didn't pass the
// "wow" bar set by the Spline community asset "GENKUB - Greeting robot". Spline
// scenes ship with hand-rigged cursor tracking, idle animations, and click
// reactions that would take weeks to reproduce in raw Three.js. So we load the
// scene directly via `@splinetool/runtime` — that's the npm package Spline
// publishes for headless playback. It renders into our own canvas (no iframe,
// no watermark, no third-party DOM injection).
//
// Public API mirrors `robot.js`:
//   window.RobotSpline.create(canvas, opts)
//     opts.accent / accent2 — Claude palette; used post-load to retint
//                              ANY material that reads as "accent" (orange-ish)
//     opts.motion           — 0..2, mapped to renderer's animation speed
//     opts.onExpressionChange — fired with mood name when cycleExpression runs
//
//   controller.setAccent(hex1, hex2)
//   controller.setMotion(m)
//   controller.setExpression(name)
//   controller.getExpression()
//   controller.cycleExpression()
//   controller.dispose()
//
// FALLBACK BEHAVIOR
// ─────────────────────────────────────────────────────────────────────────────
// If the runtime CDN fails (offline, blocked, 4xx), if the .splinecode URL
// 404s, or if `new Application` throws — we return a no-op controller and log
// a console warning. Hero.jsx then catches that the controller never reports a
// mood change and falls back to the prior `window.Brain` / `window.RobotHead`
// factory so users always see SOMETHING. See `Hero` in components-1.jsx.
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────────────
  // Pin to a major version — `@1` keeps unpkg serving the latest 1.x without
  // pulling in breaking 2.x changes that have happened mid-tour in the past.
  const SPLINE_RUNTIME_URL = "https://unpkg.com/@splinetool/runtime@1/build/runtime.js";
  const DEFAULT_SCENE_URL = "https://prod.spline.design/32DW3HnSC71qRqDQ/scene.splinecode";

  // The runtime auto-syncs DPR, but we override on mobile to avoid burning
  // GPU on retina screens — the asset doesn't need >1.5 DPR to look crisp.
  const MOBILE_BREAKPOINT_PX = 900;

  // Expression cycle mirrors robot.js so the rest of the UI (mood dot color,
  // hero-robot-state label) keeps working. The Spline scene may not have all
  // these named states; cycleExpression() degrades gracefully to a click event.
  const EXPRESSION_CYCLE = ["idle", "happy", "thinking", "surprised", "sleeping"];

  // ── Module cache so multiple create() calls share one fetch ────────────
  let splineModulePromise = null;
  function loadSplineRuntime() {
    if (splineModulePromise) return splineModulePromise;
    splineModulePromise = import(/* @vite-ignore */ SPLINE_RUNTIME_URL)
      .then(function unwrap(mod) {
        if (!mod || !mod.Application) {
          throw new Error("Spline runtime export missing `Application`.");
        }
        return mod.Application;
      })
      .catch(function onLoadFail(err) {
        // Reset so a future create() can retry (transient network errors).
        splineModulePromise = null;
        throw err;
      });
    return splineModulePromise;
  }

  // ── Intro coordination ──────────────────────────────────────────────────
  // The dynamic import above is pure network + module-eval — cheap, and safe
  // Loading deliberately starts under the intro curtain: the intro is the
  // loading experience, not a gate in front of it. This keeps the robot ready
  // for the reveal on warm caches and lets a cold load continue independently.

  // ── Watermark safety-net ───────────────────────────────────────────────
  // The runtime itself doesn't inject branding into the DOM, but we sweep
  // once after load just in case future versions add an attribution element.
  const WATERMARK_SELECTORS = [
    '[class*="spline-watermark"]',
    'a[href*="spline.design"]',
    'a[href*="my.spline.design"]',
  ];
  function hideWatermarks(rootEl) {
    if (!rootEl) return;
    const scope = rootEl.parentElement || document.body;
    WATERMARK_SELECTORS.forEach(function (sel) {
      scope.querySelectorAll(sel).forEach(function (el) {
        el.style.display = "none";
        el.style.visibility = "hidden";
        el.setAttribute("aria-hidden", "true");
      });
    });
  }

  // ── No-op controller for graceful failure ──────────────────────────────
  function noOpController(reason) {
    if (reason) {
      // Tag the failure on the global so Hero.jsx can decide to fall back.
      window.__splineRobotFailed = reason;
    }
    return {
      isFallback: true,
      setAccent: function () {},
      setMotion: function () {},
      setActive: function () {},
      setExpression: function () {},
      getExpression: function () { return "idle"; },
      cycleExpression: function () {},
      dispose: function () {},
    };
  }

  // ── Color helpers — post-load retint to Claude palette ─────────────────
  // We walk the scene graph; for each Mesh whose material has an emissive
  // color in the "warm orange/pink" range (this scene's accent), we re-emit
  // it in Claude's accent. Cool tones and neutrals (black shell) are left
  // alone — they already read as "premium 3D" against the warm page.
  const tmpHsl = { h: 0, s: 0, l: 0 };
  function isWarmAccent(color) {
    color.getHSL(tmpHsl);
    // Hue around orange/red (-30°..40° wrapped). Filter highly saturated only.
    const hueDeg = tmpHsl.h * 360;
    const inHue = hueDeg < 50 || hueDeg > 320;
    return inHue && tmpHsl.s > 0.45 && tmpHsl.l > 0.18;
  }
  function retintScene(app, accentHex, accent2Hex) {
    if (!app || !app.scene) return;
    const THREE = window.THREE;
    if (!THREE) return;
    const accent = new THREE.Color(accentHex || "#D97757");
    app.scene.traverse(function visit(node) {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach(function (mat) {
        if (!mat) return;
        if (mat.emissive && isWarmAccent(mat.emissive)) {
          mat.emissive.copy(accent);
          mat.needsUpdate = true;
        }
        if (mat.color && isWarmAccent(mat.color)) {
          mat.color.copy(accent);
          mat.needsUpdate = true;
        }
      });
    });
  }

  // ── Factory ────────────────────────────────────────────────────────────
  /**
   * Build a Spline-backed robot controller bound to `canvas`.
   * Idempotent: if the runtime can't load, returns a no-op controller so the
   * caller's lifecycle (dispose etc.) still works.
   */
  function create(canvas, opts) {
    if (!canvas) return noOpController("no-canvas");
    const options = opts || {};
    const sceneUrl = options.sceneUrl || DEFAULT_SCENE_URL;
    const onExpressionChange = typeof options.onExpressionChange === "function"
      ? options.onExpressionChange
      : null;

    let app = null;
    let disposed = false;
    let expressionCurrent = "idle";
    let sceneActive = true;
    let cinemaPaused = false;
    let accentHex = options.accent || "#D97757";
    let accent2Hex = options.accent2 || "#C89B5E";

    canvas.style.touchAction = "none";

    function applyPlaybackState() {
      if (!app) return;
      try {
        if (sceneActive && !cinemaPaused) {
          if (typeof app.play === "function") app.play();
        } else if (typeof app.stop === "function") app.stop();
      } catch (playErr) { /* runtime versions differ; visual fallback remains */ }
    }
    function onCinemaStart() { cinemaPaused = true; applyPlaybackState(); }
    function onCinemaDone() { cinemaPaused = false; applyPlaybackState(); }
    window.addEventListener("sm:cinema-start", onCinemaStart);
    window.addEventListener("sm:cinema-done", onCinemaDone);

    // Async load — caller gets a controller back immediately, real scene
    // appears once the runtime + .splinecode have both downloaded. We set
    // BOTH `__splineRobotLoaded` (on success) and `__splineRobotFailed` (on
    // failure) as window-level flags so Hero's watchdog can distinguish
    // "Spline truly succeeded" from "Spline silently never finished".
    // Reset both at start in case create() is called multiple times.
    window.__splineRobotLoaded = false;
    window.__splineRobotFailed = null;
    // Start the real scene immediately underneath the intro. The intro has a
    // deterministic duration and does not wait for this promise; conversely,
    // the robot no longer waits for sm:intro-done. This removes the former
    // circular dependency while preserving the loader's original purpose:
    // useful work happens during the 2–3 second opening sequence.
    loadSplineRuntime()
      .then(function instantiate(Application) {
        if (disposed) return null;
        app = new Application(canvas);
        return app.load(sceneUrl);
      })
      .then(function onLoaded(result) {
        if (disposed || result === null) return;
        // Recolor + sweep watermarks now that the scene exists in the DOM.
        retintScene(app, accentHex, accent2Hex);
        hideWatermarks(canvas);
        // Signal success — Hero stops polling for failure.
        window.__splineRobotLoaded = true;
        applyPlaybackState();
        if (onExpressionChange) {
          try { onExpressionChange(expressionCurrent); }
          catch (cbErr) { console.warn("[RobotSpline] onExpressionChange threw:", cbErr); }
        }
      })
      .catch(function onError(err) {
        // eslint-disable-next-line no-console
        console.warn("[RobotSpline] Load failed, falling back:", err && err.message);
        window.__splineRobotFailed = "load-error";
      });

    function cycleExpression() {
      const idx = EXPRESSION_CYCLE.indexOf(expressionCurrent);
      const next = EXPRESSION_CYCLE[(idx + 1) % EXPRESSION_CYCLE.length];
      expressionCurrent = next;
      // Best-effort trigger of a Spline event. The runtime exposes emitEvent
      // for state-machines defined in the editor. If this particular scene
      // doesn't define a "click" state, the call is a no-op — that's fine,
      // the surrounding UI still gets the mood change for the label dot.
      if (app && typeof app.emitEvent === "function") {
        try { app.emitEvent("mouseDown"); }
        catch (emitErr) { /* opportunistic */ }
      }
      if (onExpressionChange) {
        try { onExpressionChange(next); }
        catch (cbErr) { console.warn("[RobotSpline] onExpressionChange threw:", cbErr); }
      }
    }

    return {
      isFallback: false,
      setAccent: function (hex1, hex2) {
        if (hex1) accentHex = hex1;
        if (hex2) accent2Hex = hex2;
        retintScene(app, accentHex, accent2Hex);
      },
      setMotion: function () {
        // Spline drives its own animation loop. We deliberately don't tamper
        // with it — undocumented internals make speed scaling fragile.
      },
      /**
       * Pause / resume the Spline render loop. The runtime keeps rendering
       * the full 3D scene at 60fps even when the hero is scrolled far
       * off-screen — pure waste. The runtime exposes `stop()`/`play()` in
       * recent versions; we call them defensively (no-op if absent, so
       * older runtimes simply keep running — graceful degradation).
       * @param {boolean} active
       */
      setActive: function (active) {
        sceneActive = !!active;
        applyPlaybackState();
      },
      setExpression: function (name) {
        if (EXPRESSION_CYCLE.indexOf(name) === -1) return;
        expressionCurrent = name;
        if (onExpressionChange) {
          try { onExpressionChange(name); }
          catch (cbErr) { console.warn("[RobotSpline] onExpressionChange threw:", cbErr); }
        }
      },
      getExpression: function () { return expressionCurrent; },
      cycleExpression: cycleExpression,
      dispose: function () {
        disposed = true;
        window.removeEventListener("sm:cinema-start", onCinemaStart);
        window.removeEventListener("sm:cinema-done", onCinemaDone);
        if (app && typeof app.dispose === "function") {
          try { app.dispose(); }
          catch (dispErr) { console.warn("[RobotSpline] dispose threw:", dispErr); }
        }
        app = null;
      },
    };
  }

  window.RobotSpline = { create: create };
})();
