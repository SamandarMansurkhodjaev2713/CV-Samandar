// intro.js — "Полёт к станции" cinematic curtain.
// Runs at most ONCE per session (gating is done by the head-boot inline
// script in index.html, which creates the #sm-intro panel and stashes
// window.__SM_INTRO = {mode, panel}). This module only RUNS the timeline;
// it never decides whether to show — that decision already happened before
// this file even loaded, so a slow-loading intro.js can never delay it.
//
// Modes:
//   'full' — canvas: starfield warp → Earth approach → iris reveal into hero.
//   'fade' — reduced-motion / low-tier: no canvas, 400ms opacity fade of panel.
//
// PERF: one 2D canvas, ~180 particles via deterministic sin/cos drift (same
// no-teleport approach as bg-fx.js). rAF stops the instant the timeline ends,
// and the whole thing (canvas + panel) is removed from the DOM at completion.
(function () {
  "use strict";

  var CFG = {
    STAR_COUNT: 180,
    // Phase windows (ms from start). Overlaps are intentional (no dead beats).
    P1_END: 1000,     // warp
    P2_START: 900,    // earth approach (overlaps warp tail)
    P2_END: 1750,
    P3_START: 1600,   // iris (overlaps earth tail)
    P3_END: 2400,     // total duration
    SKIP_DISSOLVE_MS: 320,
    IRIS_CENTER_Y: 0.42,  // matches .hero-photo-inner background-position: center 42%
  };
  // House entrance curve cubic-bezier(.2,.6,.18,1) — same language as the
  // section-entrance system (cursor.css --sec-ease). Analytic stand-in
  // (cheap, visually indistinguishable for these short durations).
  function easeHouse(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return 1 - Math.pow(1 - t, 2.4); }
  function easeInPow(t, p) { t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.pow(t, p); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(now, a, b) { return clamp01((now - a) / (b - a)); }

  function readAccentRGB() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
      if (v) return v.split(/[\s,]+/).map(Number);
    } catch (e) { /* opportunistic */ }
    return [217, 119, 87]; // documented --accent fallback
  }

  function run() {
    var intent = window.__SM_INTRO;
    if (!intent || !intent.panel || !intent.panel.parentNode) return;
    if (intent.__started) return;
    intent.__started = true;
    if (intent.safety) { clearTimeout(intent.safety); intent.safety = 0; }

    var panel = intent.panel;

    // ── Fade mode (reduced-motion / low-tier): cheap 400ms opacity fade. ──
    if (intent.mode === "fade") {
      panel.style.transition = "opacity .4s cubic-bezier(.2,.6,.18,1)";
      requestAnimationFrame(function () {
        panel.style.opacity = "0";
        setTimeout(function () {
          if (panel.parentNode) panel.remove();
          try { window.dispatchEvent(new CustomEvent("sm:intro-done")); } catch (e) { /* opportunistic */ }
        }, 440);
      });
      return;
    }

    // ── Full mode: canvas timeline. ──────────────────────────────────────
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cv = document.createElement("canvas");
    cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
    panel.appendChild(cv);
    var ctx = cv.getContext("2d");
    var W = 0, H = 0;
    function size() {
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener("resize", size, { passive: true });

    var accent = readAccentRGB();
    function cx() { return W * 0.5; }
    function cy() { return H * CFG.IRIS_CENTER_Y; }

    // Deterministic star field: fixed angle + base-radius per star, no random
    // reposition mid-flight (no twitch). Streaming = radius grows with phase.
    var stars = new Array(CFG.STAR_COUNT);
    for (var i = 0; i < CFG.STAR_COUNT; i++) {
      var ang = i * 2.399963; // golden-angle spread
      var seed = ((i * 53) % 100) / 100; // deterministic 0..1
      stars[i] = {
        ang: ang,
        base: 0.02 + seed * 0.14,
        len: 0.4 + ((i * 17) % 100) / 100 * 0.9,
        hot: (i % 7 === 0),
        z: 0.3 + ((i * 31) % 100) / 100 * 0.7,
      };
    }

    var start = performance.now();
    var exitFrom = 0;
    var raf = 0;
    var finished = false;

    function teardown() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("wheel", onSkip);
      window.removeEventListener("touchstart", onSkip);
      window.removeEventListener("pointerdown", onSkip);
      if (panel && panel.parentNode) panel.remove();
      try { window.dispatchEvent(new CustomEvent("sm:intro-done")); } catch (e) { /* opportunistic */ }
    }

    function requestSkip() {
      if (exitFrom) return;
      exitFrom = performance.now();
      window.removeEventListener("wheel", onSkip);
      window.removeEventListener("touchstart", onSkip);
      window.removeEventListener("pointerdown", onSkip);
    }
    function onKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") requestSkip(); }
    function onSkip() { requestSkip(); }
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("wheel", onSkip, { passive: true });
    window.addEventListener("touchstart", onSkip, { passive: true });
    window.addEventListener("pointerdown", onSkip, { passive: true });

    // Earth: layered radial gradients, amber terminator arc. No image asset.
    function drawEarth(scale, driftX, driftY, alpha) {
      var r = Math.min(W, H) * 0.42 * scale;
      var ex = cx() + driftX, ey = cy() + driftY;
      ctx.save();
      ctx.globalAlpha = alpha;
      var g = ctx.createRadialGradient(ex - r * 0.3, ey - r * 0.3, r * 0.1, ex, ey, r);
      g.addColorStop(0, "rgba(60,110,150,1)");
      g.addColorStop(0.55, "rgba(20,44,74,1)");
      g.addColorStop(1, "rgba(6,14,26,1)");
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath();
      ctx.arc(ex, ey, r, -Math.PI * 0.7, Math.PI * 0.15);
      ctx.lineWidth = r * 0.08;
      ctx.strokeStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + ",0.55)";
      ctx.shadowBlur = r * 0.3;
      ctx.shadowColor = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + ",0.5)";
      ctx.stroke();
      ctx.restore();
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var t = now - start;

      // ── Iris: transparent hole on the PANEL grows in phase 3, revealing the
      // live hero underneath through a CSS mask (cheap compositor work). ──
      var iris = seg(t, CFG.P3_START, CFG.P3_END);
      if (iris > 0) {
        var rPct = (easeHouse(iris) * 145).toFixed(1); // 0 → 145% of vmax
        var maskC = (CFG.IRIS_CENTER_Y * 100).toFixed(0);
        var mask =
          "radial-gradient(circle at 50% " + maskC + "%, " +
          "transparent 0%, transparent " + rPct + "%, #000 " +
          (parseFloat(rPct) + 8).toFixed(1) + "%)";
        panel.style.webkitMaskImage = mask;
        panel.style.maskImage = mask;
      }

      ctx.clearRect(0, 0, W, H);

      var p1 = seg(t, 0, CFG.P1_END);
      var earthP = seg(t, CFG.P2_START, CFG.P2_END);
      var canvasAlpha = 1 - clamp01((t - (CFG.P3_START + 120)) / 300);

      if (exitFrom) {
        var k = seg(now, exitFrom, exitFrom + CFG.SKIP_DISSOLVE_MS);
        var a = 1 - easeHouse(k);
        cv.style.opacity = a; panel.style.opacity = a;
        if (k >= 1) { teardown(); return; }
      }
      ctx.globalAlpha = Math.max(0, canvasAlpha);

      if (canvasAlpha > 0.01) {
        var accel = easeInPow(p1, 2.2);
        var decel = 1 - easeHouse(earthP);
        var speed = 0.12 + accel * 6.0;
        var CX = cx(), CY = cy();
        for (var s = 0; s < stars.length; s++) {
          var st = stars[s];
          var rad = (st.base + speed * st.z * 0.16) * Math.min(W, H);
          var x = CX + Math.cos(st.ang) * rad;
          var y = CY + Math.sin(st.ang) * rad;
          var tail = st.len * speed * st.z * 14 * decel;
          var x2 = CX + Math.cos(st.ang) * (rad - tail);
          var y2 = CY + Math.sin(st.ang) * (rad - tail);
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x2, y2);
          ctx.lineWidth = st.hot ? 1.6 : 1.0;
          ctx.strokeStyle = st.hot
            ? "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + "," + (0.5 * decel).toFixed(2) + ")"
            : "rgba(232,224,210," + (0.7 * decel).toFixed(2) + ")"; // --bone-ish
          ctx.stroke();
        }
      }

      if (earthP > 0 && canvasAlpha > 0.01) {
        var scale = 0.05 + easeHouse(earthP) * 1.55;
        var driftX = -easeHouse(earthP) * W * 0.18;
        var driftY = easeHouse(earthP) * H * 0.12;
        var eAlpha = clamp01(earthP * 3);
        drawEarth(scale, driftX, driftY, eAlpha);
      }

      if (!exitFrom && t >= CFG.P3_END) { teardown(); return; }
    }
    raf = requestAnimationFrame(frame);
    // Wall-clock backstop, independent of rAF — browsers throttle (or fully
    // suspend) requestAnimationFrame on hidden/backgrounded tabs, which would
    // otherwise leave the curtain frozen on screen indefinitely. teardown()
    // is idempotent (guarded by `finished`), so this is a harmless no-op if
    // the timeline already completed normally.
    setTimeout(teardown, 4000);
  }

  // Public API — the head-boot script calls this once intro.js is present.
  window.SMIntro = { run: run };
  // If the head boot already ran and stashed intent before this file parsed,
  // kick immediately (normal load order — intro.js loads before the boot's
  // intent would ever be consumed otherwise).
  if (window.__SM_INTRO && !window.__SM_INTRO.__started) run();
})();
