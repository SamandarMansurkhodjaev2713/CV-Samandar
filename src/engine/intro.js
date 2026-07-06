// intro.js — "Ядро оживает" (Core Ignition) cinematic boot.
// Runs on every full page load (the head-boot inline script in index.html
// creates the #sm-intro panel and stashes window.__SM_INTRO = {mode, panel}
// unconditionally — no once-per-session gate, so a reload always replays it).
// This module only RUNS the timeline; it never decides whether to show — that
// decision already happened before this file loaded, so a slow-loading
// intro.js can never delay it.
//
// Concept: a single warm core ignites in a warm void, a gold aperture opens
// around it, embers rise (heat convection), the link locks ("CORE ONLINE"),
// then the core blooms and an iris burns open directly into the hero. Strictly
// warm palette (--accent terracotta, --accent-2 gold, --bg-0 warm dark) so the
// intro flows seamlessly into the hero's own warm cockpit light — no cold
// starfield, no off-palette blue. It also buys ~3s for the hero (Spline robot,
// React, content) to finish loading behind the opaque panel.
//
// Modes:
//   'full' — the canvas timeline below.
//   'fade' — reduced-motion / low-tier: no canvas, 400ms opacity fade of panel.
//
// PERF: one 2D canvas, ~40 embers + a few additive gradient blooms, all
// deterministic drift (no Math.random twitch). rAF stops the instant the
// timeline ends; a wall-clock backstop guarantees teardown even if a hidden/
// backgrounded tab stalls rAF forever; the whole thing is removed at the end.
(function () {
  "use strict";

  var CFG = {
    EMBERS: 40,
    IGNITE_END: 800,        // core ignites + grows
    APERTURE_START: 550,    // aperture blades begin sweeping open
    APERTURE_END: 1750,
    LOCK_AT: 1800,          // "link locked" flash-ring
    LOCK_MS: 260,
    BLOOM_START: 2100,      // core bloom starts flooding
    IRIS_START: 2450,       // iris hole opens onto the hero
    TOTAL: 3000,            // full duration
    SKIP_DISSOLVE_MS: 300,
    // A skip is IGNORED for the first SKIP_GRACE_MS. Without this, a stray early
    // event (the tap/click that opened the page, trackpad inertia, a synthetic
    // pointerdown) fired onSkip on frame ~0 and the intro dissolved before it
    // was ever visible — the likely reason it "never showed". After the grace
    // window it's freely skippable (click / scroll / touch / Esc-Enter-Space).
    SKIP_GRACE_MS: 600,
    // Fade mode's own timeline: hold the glow, then fade. Totals ~3s, matching
    // the full canvas mode — the intro's real job (buying load time for the
    // Spline robot + rest of the page behind the opaque curtain) doesn't stop
    // mattering just because a device takes the cheap visual path. A ~0.85s
    // fade — the previous timing — cleared before assets had a real chance to
    // finish, so the hero could still be visibly mid-load right as the curtain
    // lifted.
    FADE_HOLD_MS: 2350,
    FADE_OUT_MS: 600,
    CORE_Y: 0.42,           // vertical focus (matches hero photo focus)
  };

  // House entrance curve cubic-bezier(.2,.6,.18,1) — same motion language as the
  // section-entrance system. Analytic stand-in (cheap, indistinguishable here).
  function easeHouse(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return 1 - Math.pow(1 - t, 2.4); }
  function easeInPow(t, p) { t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.pow(t, p); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(now, a, b) { return clamp01((now - a) / (b - a)); }

  function readRGB(varName, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      if (v) {
        var parts = v.split(/[\s,/]+/).map(Number).filter(function (n) { return !isNaN(n); });
        if (parts.length >= 3) return parts.slice(0, 3);
      }
    } catch (e) { /* opportunistic */ }
    return fallback;
  }

  function run() {
    var intent = window.__SM_INTRO;
    if (!intent || !intent.panel || !intent.panel.parentNode) return;
    if (intent.__started) return;
    intent.__started = true;

    var panel = intent.panel;

    // Absolute last-resort net, armed before ANY fallible work below. If canvas
    // setup throws, the curtain must never get stuck (it covers the whole page).
    var forcedTimer = setTimeout(forceRemove, 3800);
    function forceRemove() {
      forcedTimer = 0;
      if (panel && panel.parentNode) panel.remove();
      try { window.dispatchEvent(new CustomEvent("sm:intro-done")); } catch (e) { /* opportunistic */ }
    }

    if (intent.safety) { clearTimeout(intent.safety); intent.safety = 0; }

    // ── Fade mode (reduced-motion / low-tier): cheap, no canvas/rAF. ──
    // WAS a plain opacity fade of the boot panel, whose background is the
    // page's own --bg-0 (set inline in index.html so there's no flash before
    // this file decides a mode) — i.e. it faded a solid color into the exact
    // same solid color underneath. That is visually a no-op: nothing ever
    // appeared to change, on every device that takes this path. Given how
    // many real Android phones land in "low-tier" (Chrome buckets
    // deviceMemory conservatively — see getDeviceTier), this was very likely
    // why the intro "never showed" for a lot of real visitors, not a logic
    // bug. Fix: paint a warm radial glow (on-theme, matches the full mode's
    // core) so there is an actual visible moment, held briefly, then faded —
    // still just one CSS background + one opacity transition, no rAF loop.
    if (intent.mode === "fade") {
      var fa1 = readRGB("--accent-rgb", [217, 119, 87]);
      var fa2 = readRGB("--accent-2-rgb", [200, 155, 94]);
      var fadeStart = performance.now();
      var holdTimer = 0, fadeOutTimer = 0, fadeDone = false;
      panel.style.background =
        "radial-gradient(circle at 50% 42%, rgba(" + fa1[0] + "," + fa1[1] + "," + fa1[2] + ",0.95) 0%, " +
        "rgba(" + fa2[0] + "," + fa2[1] + "," + fa2[2] + ",0.6) 30%, #1F1E1B 70%)";
      panel.style.transition = "opacity " + (CFG.FADE_OUT_MS / 1000) + "s cubic-bezier(.2,.6,.18,1)";

      function fadeTeardown() {
        if (fadeDone) return;
        fadeDone = true;
        if (forcedTimer) { clearTimeout(forcedTimer); forcedTimer = 0; }
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
        if (fadeOutTimer) { clearTimeout(fadeOutTimer); fadeOutTimer = 0; }
        window.removeEventListener("keydown", onFadeKey, true);
        window.removeEventListener("wheel", onFadeSkip);
        window.removeEventListener("touchstart", onFadeSkip);
        window.removeEventListener("pointerdown", onFadeSkip);
        if (panel.parentNode) panel.remove();
        try { window.dispatchEvent(new CustomEvent("sm:intro-done")); } catch (e) { /* opportunistic */ }
      }
      function startFadeOut() {
        if (holdTimer) { holdTimer = 0; }
        panel.style.opacity = "0";
        fadeOutTimer = setTimeout(fadeTeardown, CFG.FADE_OUT_MS + 20);
      }
      // Same grace window as full mode — ignore a stray early event (the tap
      // that opened the page, etc.), freely skippable after that.
      function requestFadeSkip() {
        if (fadeDone || fadeOutTimer) return;
        if (performance.now() - fadeStart < CFG.SKIP_GRACE_MS) return;
        window.removeEventListener("wheel", onFadeSkip);
        window.removeEventListener("touchstart", onFadeSkip);
        window.removeEventListener("pointerdown", onFadeSkip);
        startFadeOut();
      }
      function onFadeKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") requestFadeSkip(); }
      function onFadeSkip() { requestFadeSkip(); }
      window.addEventListener("keydown", onFadeKey, true);
      window.addEventListener("wheel", onFadeSkip, { passive: true });
      window.addEventListener("touchstart", onFadeSkip, { passive: true });
      window.addEventListener("pointerdown", onFadeSkip, { passive: true });

      // Hold at full opacity so the glow registers AND the page behind the
      // curtain gets real time to load — the previous version began fading on
      // the very next frame, so at most one rendered frame was ever visible.
      holdTimer = setTimeout(startFadeOut, CFG.FADE_HOLD_MS);
      return;
    }

    // ── Full mode: canvas timeline. Setup guarded so a null 2d context can't
    // leave the curtain up with nothing to clear it (forcedTimer is the net). ──
    var dpr, cv, ctx, W, H, size, a1, a2, hot, embers, start, exitFrom, raf, finished;
    try {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv = document.createElement("canvas");
      cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
      panel.appendChild(cv);
      ctx = cv.getContext("2d");
      if (!ctx) throw new Error("2d context unavailable");
      W = 0; H = 0;
      size = function () {
        W = window.innerWidth; H = window.innerHeight;
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      size();
      window.addEventListener("resize", size, { passive: true });

      a1 = readRGB("--accent-rgb", [217, 119, 87]);    // terracotta
      a2 = readRGB("--accent-2-rgb", [200, 155, 94]);  // gold
      hot = [255, 236, 208];                            // hot white-gold core

      // Deterministic embers — born at the core, rise + fade (heat convection).
      embers = new Array(CFG.EMBERS);
      for (var i = 0; i < CFG.EMBERS; i++) {
        var s1 = ((i * 53) % 100) / 100;
        var s2 = ((i * 29) % 100) / 100;
        var s3 = ((i * 71) % 100) / 100;
        embers[i] = {
          spread: (s1 - 0.5),           // −.5..5 horizontal offset factor
          delay: s2 * 0.55,             // 0..0.55 start fraction
          speed: 0.55 + s3 * 0.85,      // rise speed
          size: 0.8 + s1 * 1.9,
          sway: (s2 - 0.5) * 2,
          hot: (i % 5 === 0),
        };
      }

      start = performance.now();
      exitFrom = 0;
      raf = 0;
      finished = false;
    } catch (setupErr) {
      forceRemove();
      return;
    }

    function teardown() {
      if (finished) return;
      finished = true;
      if (forcedTimer) { clearTimeout(forcedTimer); forcedTimer = 0; }
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
      // Ignore skips fired during the grace window — see CFG.SKIP_GRACE_MS.
      if (performance.now() - start < CFG.SKIP_GRACE_MS) return;
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

    function cx() { return W * 0.5; }
    function cy() { return H * CFG.CORE_Y; }
    function minDim() { return Math.min(W, H); }

    // Additive warm bloom — layered radial gradient (hot core → gold → terracotta
    // → transparent). This is the "physical light", not a flat disc.
    function bloom(x, y, r, inten) {
      if (r <= 0 || inten <= 0) return;
      ctx.globalCompositeOperation = "lighter";
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(" + hot[0] + "," + hot[1] + "," + hot[2] + "," + (0.85 * inten).toFixed(3) + ")");
      g.addColorStop(0.22, "rgba(" + a2[0] + "," + a2[1] + "," + a2[2] + "," + (0.5 * inten).toFixed(3) + ")");
      g.addColorStop(0.55, "rgba(" + a1[0] + "," + a1[1] + "," + a1[2] + "," + (0.2 * inten).toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + a1[0] + "," + a1[1] + "," + a1[2] + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }

    function drawLabel(t, MD, CX, CY, iris) {
      var label = t < 1050 ? "CORE.AI" : (t < CFG.LOCK_AT ? "ESTABLISHING LINK" : "CORE ONLINE");
      var online = t >= CFG.LOCK_AT;
      var alpha = seg(t, 300, 750) * (1 - iris);
      if (alpha <= 0.02) return;
      ctx.globalCompositeOperation = "source-over";
      ctx.font = "600 12px ui-monospace, 'JetBrains Mono', 'SFMono-Regular', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var hadLS = ("letterSpacing" in ctx);
      if (hadLS) { try { ctx.letterSpacing = "4px"; } catch (e) { /* older engine */ } }
      var col = online ? a1 : [232, 224, 210];
      ctx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + (alpha * (online ? 0.95 : 0.6)).toFixed(3) + ")";
      ctx.fillText(label, CX, CY + MD * 0.2);
      if (hadLS) { try { ctx.letterSpacing = "0px"; } catch (e) { /* noop */ } }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      var t = now - start;
      var CX = cx(), CY = cy(), MD = minDim();

      // Base warm-dark fill (matches the panel so there's never a flash).
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#1F1E1B";
      ctx.fillRect(0, 0, W, H);

      // Cinematic vignette.
      var vg = ctx.createRadialGradient(CX, CY, MD * 0.18, CX, CY, MD * 0.78);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);

      var ignite = seg(t, 0, CFG.IGNITE_END);
      var coreR = MD * (0.006 + easeHouse(ignite) * 0.05);
      var corePulse = 1 + Math.sin(t * 0.011) * 0.12;
      var iris = seg(t, CFG.IRIS_START, CFG.TOTAL);

      // Immediate warm ambient — a soft glow that's already visible on the very
      // first frames (before the core has grown), so the screen never reads as
      // a plain dark/loading rectangle. Ramps in over the first ~350ms, fades
      // as the iris opens. Cheap: one radial gradient, additive.
      var ambient = seg(t, 60, 400) * (1 - iris);
      if (ambient > 0.01) bloom(CX, CY, MD * 0.5, 0.28 * ambient);

      // Embers — additive, warm, rising from the core.
      ctx.globalCompositeOperation = "lighter";
      for (var i = 0; i < embers.length; i++) {
        var em = embers[i];
        var life = seg(t, em.delay * 1000, CFG.TOTAL);
        if (life <= 0) continue;
        var rise = life * em.speed;
        var ex = CX + em.spread * MD * 0.34 + Math.sin(t * 0.002 + i) * MD * 0.02 * em.sway;
        var ey = CY - rise * MD * 0.52;
        var alpha = (1 - life) * 0.55;
        if (alpha <= 0.01) continue;
        var col = em.hot ? a2 : a1;
        ctx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + alpha.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(ex, ey, em.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      // Aperture blades — 3 thin gold arcs sweeping open + slowly rotating.
      var rot = t * 0.0004;
      ctx.globalCompositeOperation = "lighter";
      for (var k = 0; k < 3; k++) {
        var sweep = seg(t, CFG.APERTURE_START + k * 150, CFG.APERTURE_END);
        if (sweep <= 0) continue;
        var e = easeHouse(sweep);
        var ar = coreR * 3 + MD * (0.06 + k * 0.045);
        var a0 = -Math.PI / 2 + k * 0.6 + rot;
        var a1e = a0 + e * Math.PI * 2 * 0.8;
        ctx.beginPath();
        ctx.arc(CX, CY, ar, a0, a1e);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "rgba(" + a2[0] + "," + a2[1] + "," + a2[2] + "," + (0.45 * e * (1 - iris)).toFixed(3) + ")";
        ctx.shadowBlur = 14;
        ctx.shadowColor = "rgba(" + a1[0] + "," + a1[1] + "," + a1[2] + ",0.55)";
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";

      // Lock flash.
      var lock = seg(t, CFG.LOCK_AT, CFG.LOCK_AT + CFG.LOCK_MS);
      var lockFlash = (lock > 0 && lock < 1) ? Math.sin(lock * Math.PI) : 0;

      // Core bloom + flood.
      var baseInten = 0.5 + easeHouse(ignite) * 0.5;
      var bloomGrow = easeInPow(seg(t, CFG.BLOOM_START, CFG.TOTAL), 1.8);
      var floodR = MD * (0.14 * corePulse) + bloomGrow * MD * 1.7;
      var floodInten = baseInten * (1 + lockFlash * 0.7) + bloomGrow * 1.1;
      bloom(CX, CY, floodR, Math.min(1.8, floodInten));
      bloom(CX, CY, coreR * corePulse * 2.4, 1.05);

      // Lock ring flash.
      if (lockFlash > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.arc(CX, CY, coreR * 3 + MD * 0.12, 0, Math.PI * 2);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = "rgba(" + hot[0] + "," + hot[1] + "," + hot[2] + "," + (0.5 * lockFlash).toFixed(3) + ")";
        ctx.shadowBlur = 20;
        ctx.shadowColor = "rgba(" + a2[0] + "," + a2[1] + "," + a2[2] + ",0.8)";
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = "source-over";
      }

      drawLabel(t, MD, CX, CY, iris);

      // Iris — a transparent hole grows on the PANEL from the core, revealing the
      // live hero underneath through a CSS mask (cheap compositor work). The warm
      // bloom is at its peak here, so it reads as the light burning through.
      if (iris > 0) {
        var rPct = (easeHouse(iris) * 150).toFixed(1);
        var maskC = (CFG.CORE_Y * 100).toFixed(0);
        var mask =
          "radial-gradient(circle at 50% " + maskC + "%, " +
          "transparent 0%, transparent " + rPct + "%, #000 " +
          (parseFloat(rPct) + 10).toFixed(1) + "%)";
        panel.style.webkitMaskImage = mask;
        panel.style.maskImage = mask;
      }

      // Skip dissolve.
      if (exitFrom) {
        var kk = seg(now, exitFrom, exitFrom + CFG.SKIP_DISSOLVE_MS);
        var aa = 1 - easeHouse(kk);
        cv.style.opacity = aa; panel.style.opacity = aa;
        if (kk >= 1) { teardown(); return; }
      }

      if (!exitFrom && t >= CFG.TOTAL) { teardown(); return; }
    }
    raf = requestAnimationFrame(frame);
    // Wall-clock backstop, independent of rAF — hidden/backgrounded tabs throttle
    // or fully suspend rAF, which would otherwise freeze the curtain on screen.
    // teardown() is idempotent (guarded by `finished`), so this is harmless if
    // the timeline already completed normally.
    setTimeout(teardown, 3600);
  }

  window.SMIntro = { run: run };
  if (window.__SM_INTRO && !window.__SM_INTRO.__started) run();
})();
