// intro.js — "Boot Sequence" loader.
// Runs on every full page load (head-boot in index.html creates #sm-intro and
// stashes window.__SM_INTRO = {mode, panel}; this file only runs the
// timeline — it never decides whether to show).
//
// Design: an honest-feeling technical boot readout (activetheory.net-style —
// a real loader, not a cinematic "story"). CORE.AI status label, a large
// percentage counter, a thin progress line, warm ambient light + a few
// drifting motes. Replaces the earlier "Core Ignition" concept (aperture
// blades, embers, lock-ring flash) — that was a decorative narrative
// animation; this is a loader that actually behaves like one.
//
// How the percentage works (client-approved synthesis of two answers that
// look contradictory but aren't): the NUMBER animates on a smooth, engineered
// curve — not raw byte-progress, which reads as jumpy/stalling and is common
// but ugly. But the REVEAL is gated on the real critical asset (the Spline
// robot) actually being ready, with a hard ceiling for slow connections — so
// "100%" is never a lie by more than a couple of seconds even on bad
// networks, and a fast/cached load never waits around pretending to be slow.
//
// Modes: intent.mode "full" = rich (particles + iris reveal), "fade" =
// reduced-motion/low-tier (no particle canvas, plain fade reveal instead of
// the spatial iris). Both show the same percentage/label/line — that part is
// cheap (DOM + CSS transitions, no canvas) and isn't a motion concern.
(function () {
  "use strict";

  let CFG = {
    EASE_MS: 2200,       // percentage animates 0 → EASE_TARGET over this window
    EASE_TARGET: 92,
    CREEP_MS: 3200,      // then creeps EASE_TARGET → 99 while waiting on the robot
    CEILING_MS: 7500,    // absolute max wait before revealing regardless
    HOLD_MS: 220,        // brief hold at real 100% before the reveal starts
    REVEAL_MS: 550,
    SKIP_GRACE_MS: 500,
    CORE_Y: 0.42,        // matches hero photo's own focal point
    PARTICLES: 22,
  };

  function easeOutCubic(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return 1 - Math.pow(1 - t, 3); }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

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

  // True once Hero's own loading effect has resolved the robot one way or the
  // other (loaded, or gave up and swapped to the legacy fallback). Both flags
  // start undefined until that effect actually runs (after React mounts), so
  // this naturally stays false through the React-mount → Hero-effect →
  // Spline-create chain, not just "has React rendered yet".
  function robotSettled() {
    return window.__splineRobotLoaded === true || !!window.__splineRobotFailed;
  }

  function run() {
    var intent = window.__SM_INTRO;
    if (!intent || !intent.panel || !intent.panel.parentNode) return;
    if (intent.__started) return;
    intent.__started = true;

    var panel = intent.panel;
    var reduced = intent.mode === "fade"; // reuses the existing head-boot flag

    // Mobile pacing (user-approved): same aesthetic, ~half the wait. A phone
    // visitor is more impatient AND the mobile robot is lighter — the desktop
    // ceiling exists to cover a 1–3MB Spline download that mobile doesn't
    // need as much headroom for. Swipe still skips instantly.
    var isMobile = false;
    try { isMobile = window.matchMedia("(max-width: 900px)").matches; } catch (e) { /* opportunistic */ }
    if (isMobile) {
      CFG = Object.assign({}, CFG, {
        EASE_MS: 850,      // 0 → 92% in .85s
        CREEP_MS: 450,     // brief 92 → 99 creep
        CEILING_MS: 2400,  // absolute cap — off the reader's back fast
        HOLD_MS: 140,
        REVEAL_MS: 450,
      });
    }

    var forcedTimer = setTimeout(forceRemove, CFG.CEILING_MS + 1200);
    function forceRemove() {
      forcedTimer = 0;
      if (panel && panel.parentNode) panel.remove();
      try { window.dispatchEvent(new CustomEvent("sm:intro-done")); } catch (e) { /* opportunistic */ }
    }

    if (intent.safety) { clearTimeout(intent.safety); intent.safety = 0; }

    var a1 = readRGB("--accent-rgb", [217, 119, 87]);
    var a2 = readRGB("--accent-2-rgb", [200, 155, 94]);

    var elPct, elLine, elLabelState, smBoot, particleCv, particleCtx;
    var elLog, elClock, logIdx = -1;
    var particles = null, pW = 0, pH = 0, pDpr = 1;
    var start = 0, raf = 0, resizeHandler = null;
    var exitFrom = 0, finished = false, revealing = false;
    var displayed = -1;

    // Boot-log lines: reuse the hero's real boot readout (technical, language-
    // independent) so the loader narrates the same "system coming online" story
    // the hero implies. Content.js loads before this script (see index.html), so
    // window.CONTENT is available; fall back to a built-in list if not.
    var BOOT_LINES = (function () {
      try {
        var b = window.CONTENT && window.CONTENT.ru && window.CONTENT.ru.hero && window.CONTENT.ru.hero.boot_lines;
        if (b && b.length) return b.slice();
      } catch (e) { /* fall through to default */ }
      return [
        "init core.engine ... ok",
        "load /modules/full-stack ... ok",
        "load /modules/ai-automation ... ok",
        "compile build ... ok",
        "deploy READY",
      ];
    })();
    // Real build tag — pulled from the ?v= cache-buster on any app script so the
    // telemetry version tracks deploys automatically instead of drifting.
    var BUILD_TAG = (function () {
      try {
        var s = document.querySelector('script[src*="?v="]');
        var m = s && String(s.src).match(/[?&]v=(\w+)/);
        return m ? ("BUILD " + m[1]) : "BUILD 2026";
      } catch (e) { return "BUILD 2026"; }
    })();

    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    // Colour the trailing status token (ok / READY / done) so each line reads
    // like a real console echo.
    function fmtLogLine(s) {
      var str = String(s == null ? "" : s);
      var m = str.match(/^(.*?)(ok|READY|done)\s*$/);
      if (m) return esc(m[1]) + '<span class="sm-boot-ok">' + esc(m[2]) + "</span>";
      return esc(str);
    }
    function fmtClock(ms) {
      var sec = Math.floor((ms < 0 ? 0 : ms) / 1000);
      var mm = String(Math.floor(sec / 60) % 100).padStart(2, "0");
      var ss = String(sec % 60).padStart(2, "0");
      return "T+00:" + mm + ":" + ss;
    }
    function renderLog() {
      if (!elLog) return;
      var startI = Math.max(0, logIdx - 2); // rolling window of the last 3 lines
      var html = "";
      for (var i = startI; i <= logIdx; i++) {
        html += '<div class="' + (i === logIdx ? "cur" : "on") + '">' + fmtLogLine(BOOT_LINES[i]) + "</div>";
      }
      elLog.innerHTML = html;
    }
    function revealLogTo(idx) {
      if (idx <= logIdx) return;
      logIdx = Math.min(idx, BOOT_LINES.length - 1);
      renderLog();
    }
    // Reveal lines 0..n-2 spread across 0..90%; the final line (usually
    // "deploy READY") is held back and revealed at ONLINE for the payoff.
    function setLog(pct) {
      var n = BOOT_LINES.length;
      if (n < 2) return;
      var idx = Math.floor(clamp01(pct / 90) * (n - 1));
      if (idx > n - 2) idx = n - 2;
      revealLogTo(idx);
    }

    function buildDom() {
      panel.style.background =
        "radial-gradient(circle at 50% " + (CFG.CORE_Y * 100).toFixed(0) + "%, " +
        "rgba(" + a1[0] + "," + a1[1] + "," + a1[2] + ",0.15) 0%, transparent 55%), #1F1E1B";

      if (!reduced) {
        particleCv = document.createElement("canvas");
        particleCv.className = "sm-boot-particles";
        particleCv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
        panel.appendChild(particleCv);
        setupParticles();

        // Core pulse — reactor rings breathing from the focal point, behind the
        // readout (rich path only; reduced-motion skips it and CSS hides it).
        var core = document.createElement("div");
        core.className = "sm-boot-core";
        core.style.top = (CFG.CORE_Y * 100).toFixed(1) + "%";
        core.setAttribute("aria-hidden", "true");
        core.innerHTML = "<b></b><i></i><i></i>";
        panel.appendChild(core);
      }

      var wrap = document.createElement("div");
      wrap.className = "sm-boot";
      wrap.style.top = (CFG.CORE_Y * 100).toFixed(1) + "%";
      wrap.innerHTML =
        '<div class="sm-boot-label mono">CORE.AI <span class="sm-boot-state">INITIALIZING</span></div>' +
        '<div class="sm-boot-pct"><span class="sm-boot-pct-n">00</span><span class="sm-boot-pct-sign">%</span></div>' +
        '<div class="sm-boot-line"><i></i></div>' +
        '<div class="sm-boot-log mono" aria-hidden="true"></div>';
      panel.appendChild(wrap);
      smBoot = wrap;
      elPct = wrap.querySelector(".sm-boot-pct-n");
      elLine = wrap.querySelector(".sm-boot-line > i");
      elLabelState = wrap.querySelector(".sm-boot-state");
      elLog = wrap.querySelector(".sm-boot-log");

      // Telemetry corners — coordinates (Tashkent) + build tag + live T+ clock.
      // Both modes (static, cheap); the clock ticks from the frame loop.
      var teleL = document.createElement("div");
      teleL.className = "sm-boot-tele sm-boot-tele--l mono";
      teleL.setAttribute("aria-hidden", "true");
      teleL.innerHTML = "<div><b>TASHKENT</b> · UZ</div><div>41.31°N · 69.24°E · UTC+5</div>";
      panel.appendChild(teleL);

      var teleR = document.createElement("div");
      teleR.className = "sm-boot-tele sm-boot-tele--r mono";
      teleR.setAttribute("aria-hidden", "true");
      teleR.innerHTML =
        "<div>SM · " + esc(BUILD_TAG) + "</div>" +
        '<div class="sm-boot-clock"><b>T+00:00:00</b></div>';
      panel.appendChild(teleR);
      elClock = teleR.querySelector(".sm-boot-clock b");
    }

    function setupParticles() {
      particleCtx = particleCv.getContext("2d");
      if (!particleCtx) return;
      pDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      function size() {
        pW = window.innerWidth; pH = window.innerHeight;
        particleCv.width = Math.round(pW * pDpr);
        particleCv.height = Math.round(pH * pDpr);
        particleCtx.setTransform(pDpr, 0, 0, pDpr, 0, 0);
      }
      size();
      resizeHandler = size;
      window.addEventListener("resize", resizeHandler, { passive: true });
      particles = new Array(CFG.PARTICLES);
      for (var i = 0; i < particles.length; i++) {
        var s1 = ((i * 53) % 100) / 100, s2 = ((i * 29) % 100) / 100, s3 = ((i * 71) % 100) / 100;
        particles[i] = {
          x: s1, band: 0.28 + s2 * 0.5, speed: 0.5 + s3 * 0.7,
          drift: (s2 - 0.5) * 0.25, size: 1 + s1 * 1.7, hot: (i % 6 === 0),
        };
      }
    }
    function drawParticles(now) {
      if (!particleCtx) return;
      particleCtx.clearRect(0, 0, pW, pH);
      particleCtx.globalCompositeOperation = "lighter";
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var life = ((now * 0.00006 * p.speed) + p.x) % 1;
        var x = clamp01(p.x + p.drift * life) * pW;
        var y = pH * (1 - life * p.band) ;
        var alpha = Math.sin(life * Math.PI) * (p.hot ? 0.5 : 0.32);
        var col = p.hot ? a2 : a1;
        particleCtx.fillStyle = "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + alpha.toFixed(3) + ")";
        particleCtx.beginPath(); particleCtx.arc(x, y, p.size, 0, Math.PI * 2); particleCtx.fill();
      }
      particleCtx.globalCompositeOperation = "source-over";
    }

    function requestSkip() {
      if (finished || exitFrom) return;
      if (performance.now() - start < CFG.SKIP_GRACE_MS) return;
      exitFrom = performance.now();
      detachSkipListeners();
    }
    function onKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") requestSkip(); }
    function onSkip() { requestSkip(); }
    function attachSkipListeners() {
      window.addEventListener("keydown", onKey, true);
      window.addEventListener("wheel", onSkip, { passive: true });
      window.addEventListener("touchstart", onSkip, { passive: true });
      window.addEventListener("pointerdown", onSkip, { passive: true });
    }
    function detachSkipListeners() {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("wheel", onSkip);
      window.removeEventListener("touchstart", onSkip);
      window.removeEventListener("pointerdown", onSkip);
    }

    function teardown() {
      if (finished) return;
      finished = true;
      if (forcedTimer) { clearTimeout(forcedTimer); forcedTimer = 0; }
      if (raf) cancelAnimationFrame(raf);
      detachSkipListeners();
      if (resizeHandler) window.removeEventListener("resize", resizeHandler);
      if (panel.parentNode) panel.remove();
      try { window.dispatchEvent(new CustomEvent("sm:intro-done")); } catch (e) { /* opportunistic */ }
    }

    function setPercent(p) {
      var n = Math.round(clamp01(p / 100) * 100);
      if (n === displayed) return;
      displayed = n;
      if (elPct) elPct.textContent = String(n).padStart(2, "0");
      if (elLine) elLine.style.width = n + "%";
    }

    function startReveal() {
      if (revealing) return;
      revealing = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (elLabelState) elLabelState.textContent = "ONLINE";
      if (smBoot) smBoot.classList.add("is-online");
      setPercent(100);
      revealLogTo(BOOT_LINES.length - 1); // release the held final line ("deploy READY")
      setTimeout(function () {
        panel.style.transition = "opacity " + (CFG.REVEAL_MS / 1000) + "s cubic-bezier(.2,.6,.18,1)";
        if (reduced) {
          panel.style.opacity = "0";
        } else {
          var rPct = "150";
          var maskC = (CFG.CORE_Y * 100).toFixed(0);
          var mask = "radial-gradient(circle at 50% " + maskC + "%, transparent 0%, transparent " + rPct + "%, #000 " + (parseFloat(rPct) + 8) + "%)";
          panel.style.webkitMaskImage = mask;
          panel.style.maskImage = mask;
        }
        setTimeout(teardown, CFG.REVEAL_MS + 60);
      }, CFG.HOLD_MS);
    }

    function frame(now) {
      raf = !reduced ? requestAnimationFrame(frame) : 0;
      if (revealing) return;

      if (!reduced) drawParticles(now);
      if (elClock) elClock.textContent = fmtClock(now - start);

      if (exitFrom) { startReveal(); return; }

      var t = now - start;
      var visualPct;
      if (t < CFG.EASE_MS) {
        visualPct = easeOutCubic(t / CFG.EASE_MS) * CFG.EASE_TARGET;
      } else {
        var creepT = clamp01((t - CFG.EASE_MS) / CFG.CREEP_MS);
        visualPct = CFG.EASE_TARGET + (99 - CFG.EASE_TARGET) * (1 - Math.pow(1 - creepT, 2));
      }
      setPercent(visualPct);
      setLog(visualPct);

      var pastCeiling = t >= CFG.CEILING_MS;
      if (pastCeiling || (visualPct >= CFG.EASE_TARGET - 0.01 && robotSettled())) {
        startReveal();
        return;
      }
      // Reduced-motion still needs to keep polling without a canvas rAF loop —
      // a cheap timer substitutes for the rAF driver above.
      if (reduced) setTimeout(function () { frame(performance.now()); }, 90);
    }

    try {
      buildDom();
    } catch (setupErr) {
      forceRemove();
      return;
    }
    attachSkipListeners();
    start = performance.now();
    if (reduced) {
      frame(start);
    } else {
      raf = requestAnimationFrame(frame);
    }
    // Wall-clock backstop, independent of rAF/ready-state — a hidden/
    // backgrounded tab (or a robot that never settles for some unforeseen
    // reason) can't leave the curtain up forever. teardown() is idempotent.
    setTimeout(teardown, CFG.CEILING_MS + 900);
  }

  window.SMIntro = { run: run };
  if (window.__SM_INTRO && !window.__SM_INTRO.__started) run();
})();
