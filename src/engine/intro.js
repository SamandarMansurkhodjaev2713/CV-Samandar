// intro.js — "RACK FOCUS" intro (v2 — replaces the Boot Sequence loader).
//
// The intro is NOT a screen in front of the hero. It IS the hero's own cockpit
// photo, held out-of-focus (a blurred copy of the exact same asset the hero
// paints), slightly over-scaled, with one warm ember of light at the hero's
// focal point (~42% vertical — the robot's future seat). While the robot loads
// the frame breathes; when it's ready the whole picture RACKS INTO FOCUS in
// place — the blurred copy dissolves to reveal the identical sharp hero photo
// beneath, the warm wash lifts, the ember flares and hands its light to the
// robot's glow, and the hero content precipitates upward out of the clearing
// focus. Nothing is ever "removed to show" the hero, so there is no cut to
// blink at — the thing that dissolves is the same image it dissolves into.
//
// WHY THIS SHAPE (design panel + adversarial critique, verified in source):
//  - The hero backdrop is a REAL opaque photo (hero-cockpit.webp desktop /
//    orbital-station.webp mobile at center 42%), not a flat void — so a
//    defocused copy of it is the one overlay that shares the hero's actual
//    backdrop pixel-for-pixel. That is what kills the "blink".
//  - Defocus is a pre-blurred layer whose blur radius is set ONCE in CSS and
//    NEVER animated (animating blur() re-rasterizes every frame = the jank
//    sink). The "rack" is a compositor-only opacity + scale transition.
//  - The ember→robot light hand-off is a CSS glow on .hero-robot (class
//    .core-lit, set from the sm:core-ignite event), NOT WebGL — so the climax
//    lands on time even if the Spline model is a beat behind.
//  - The hero content is held by an .intro-armed class on <html> (set in the
//    head-boot, before React) and released at the rack, so the headline rises
//    WITH the focus instead of being statically revealed. This is a paint
//    suppression on the hero's own column wrappers (.hero-left/.hero-right/
//    marquee/scroll-hint) — it does NOT touch motion.js's reveal logic, so the
//    "reveals are IO-driven" invariant is untouched.
//
// Modes: intent.mode "full" = blurred rack + ember + focus-pull; "fade" =
// reduced-motion / low-tier = static SHARP shared photo + warm-wash
// cross-dissolve (still continuous — same image — just no blur/ember/canvas).
//
// Robustness (unchanged obligations): never leave the page curtained (three
// backstops: forcedTimer, wall-clock teardown, wall-clock reveal), self-clear
// if the robot never settles, and dispatch sm:intro-done on EVERY exit path
// (reveal, skip, forceRemove, teardown) — bg-fx's WebGL loop + the robot's
// heavy load both gate on it. Also un-arm the hero (.intro-armed) on every
// exit, or the hero stays invisible for the whole session.
(function () {
  "use strict";

  var CFG = {
    PRESETTLE_MS: 1700,  // blurred frame subtly clears toward focus while loading (never lands)
    CEILING_MS: 7500,    // absolute max wait before the rack fires regardless
    RACK_MS: 820,        // the focus-rack climax (full mode)
    FADE_MS: 460,        // reduced-motion / low-tier cross-dissolve
    IGNITE_DELAY_MS: 150, // into the rack: ember flare + robot glow hand-off
    ARM_RELEASE_MS: 70,  // into the rack: release the hero content (rises with the focus)
    SKIP_GRACE_MS: 450,
    CORE_Y: 0.42,        // hero photo's own focal point
  };

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutCubic(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }

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
  // other (loaded, or gave up and swapped to the legacy fallback).
  function robotSettled() {
    return window.__splineRobotLoaded === true || !!window.__splineRobotFailed;
  }

  // Un-arm the hero content hold — idempotent, safe even pre-React (matches
  // nothing then). Called from EVERY exit path so the hero can never stay hidden.
  function unarm() {
    try { document.documentElement.classList.remove("intro-armed"); } catch (e) { /* opportunistic */ }
  }

  function run() {
    var intent = window.__SM_INTRO;
    if (!intent || !intent.panel || !intent.panel.parentNode) { unarm(); return; }
    if (intent.__started) return;
    intent.__started = true;

    var panel = intent.panel;
    var reduced = intent.mode === "fade";

    // ── Backstops (all three kept): a hidden/backgrounded tab throttles rAF, so
    // the rack + teardown must also be reachable via wall-clock timers.
    var forcedTimer = setTimeout(forceRemove, CFG.CEILING_MS + 1200);
    function forceRemove() {
      forcedTimer = 0;
      unarm();
      if (panel && panel.parentNode) panel.remove();
      try { window.dispatchEvent(new CustomEvent("sm:intro-done")); } catch (e) { /* opportunistic */ }
    }
    if (intent.safety) { clearTimeout(intent.safety); intent.safety = 0; }

    var a1 = readRGB("--accent-rgb", [217, 119, 87]);
    var a2 = readRGB("--accent-2-rgb", [200, 155, 94]);
    var bone = [232, 224, 210];

    var wash, blurImg, emberCv, emberCtx, emberSprite, teleState;
    var eW = 0, eH = 0, eDpr = 1;
    var start = 0, raf = 0, resizeHandler = null;
    var exitFrom = 0, finished = false, revealing = false;
    var lastClock = -1;

    function buildDom() {
      // The panel already carries background:#1F1E1B + contain:strict from the
      // head-boot. Children (styled via the #sm-intro CSS block) go on top.
      var rackWrap = document.createElement("div");
      rackWrap.className = "sm-rack-wrap";
      blurImg = document.createElement("div");
      // .is-blur applies the ONE-TIME filter:blur; sharp reveal comes from the
      // real hero photo underneath as this dissolves (no second image needed).
      blurImg.className = "sm-rack-img" + (reduced ? "" : " is-blur");
      rackWrap.appendChild(blurImg);
      panel.appendChild(rackWrap);

      wash = document.createElement("div");
      wash.className = "sm-wash";
      panel.appendChild(wash);

      if (!reduced) {
        emberCv = document.createElement("canvas");
        emberCv.className = "sm-ember";
        panel.appendChild(emberCv);
        setupEmber();
      }

      var tele = document.createElement("div");
      tele.className = "sm-tele mono";
      tele.innerHTML =
        '<span class="sm-tele-dot"></span>' +
        '<span class="sm-tele-k">CORE.AI</span>' +
        '<span class="sm-tele-t">T+00:00:00</span>';
      panel.appendChild(tele);
      teleState = tele.querySelector(".sm-tele-t");
    }

    function setupEmber() {
      emberCtx = emberCv.getContext("2d");
      if (!emberCtx) return;
      eDpr = Math.min(window.devicePixelRatio || 1, 1.5);
      emberSprite = makeEmberSprite();
      function size() {
        eW = window.innerWidth; eH = window.innerHeight;
        emberCv.width = Math.round(eW * eDpr);
        emberCv.height = Math.round(eH * eDpr);
        emberCtx.setTransform(eDpr, 0, 0, eDpr, 0, 0);
      }
      size();
      resizeHandler = size;
      window.addEventListener("resize", resizeHandler, { passive: true });
    }

    // Pre-render the radial ember ONCE to an offscreen canvas; each frame is a
    // single drawImage+scale — never rebuild the gradient per frame.
    function makeEmberSprite() {
      var s = document.createElement("canvas");
      s.width = s.height = 256;
      var c = s.getContext("2d");
      var g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0.0, "rgba(" + bone[0] + "," + bone[1] + "," + bone[2] + ",0.95)");
      g.addColorStop(0.22, "rgba(" + a1[0] + "," + a1[1] + "," + a1[2] + ",0.70)");
      g.addColorStop(0.55, "rgba(" + a2[0] + "," + a2[1] + "," + a2[2] + ",0.20)");
      g.addColorStop(1.0, "rgba(" + a2[0] + "," + a2[1] + "," + a2[2] + ",0)");
      c.fillStyle = g; c.fillRect(0, 0, 256, 256);
      return s;
    }

    // alpha 0..1, scale in screen px radius; drawn additively at 50%/CORE_Y.
    function drawEmber(alpha, radius) {
      if (!emberCtx || !emberSprite) return;
      emberCtx.clearRect(0, 0, eW, eH);
      if (alpha <= 0.001) return;
      var cx = eW * 0.5, cy = eH * CFG.CORE_Y;
      var d = radius * 2;
      emberCtx.globalCompositeOperation = "lighter";
      emberCtx.globalAlpha = clamp01(alpha);
      emberCtx.drawImage(emberSprite, cx - radius, cy - radius, d, d);
      emberCtx.globalAlpha = 1;
      emberCtx.globalCompositeOperation = "source-over";
    }

    function tickClock(now) {
      if (!teleState) return;
      var s = Math.floor((now - start) / 1000);
      if (s === lastClock) return;
      lastClock = s;
      var mm = Math.floor(s / 60), ss = s % 60;
      teleState.textContent = "T+00:" + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
    }

    // ── Skip (same grace-period contract as before)
    function requestSkip() {
      if (finished || exitFrom) return;
      if (performance.now() - start < CFG.SKIP_GRACE_MS) return;
      exitFrom = performance.now();
      detachSkipListeners();
      if (reduced) startReveal(); // reduced has no rAF driver to notice exitFrom
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
      unarm();
      if (panel.parentNode) panel.remove();
      try { window.dispatchEvent(new CustomEvent("sm:intro-done")); } catch (e) { /* opportunistic */ }
    }

    // Snap the rack image box to the LIVE hero photo box so the dissolve lands
    // on an identical crop. Necessary because the hero photo box is -15%/130%
    // of the (content-tall) .hero SECTION, while the panel is a viewport-height
    // fixed layer — so the same CSS percentages resolve to different heights and
    // `background-size:cover` would crop the focal band to a different pixel
    // (a visible "settle jump"). We copy the hero-photo-wrap's actual rect. The
    // rack image is blurred + dark at this instant, so the box swap is
    // imperceptible; the dissolve that follows is then pixel-aligned. Best-
    // effort: if the hero isn't mounted (intro outlasted React), we skip and the
    // CSS approximate box carries it (same image, so still no hard cut).
    function alignRackToHero() {
      try {
        var rackWrap = panel.querySelector(".sm-rack-wrap");
        var heroWrap = document.querySelector(".hero-photo-wrap");
        if (!rackWrap || !heroWrap) return;
        var r = heroWrap.getBoundingClientRect();
        if (r.height < 1) return;
        rackWrap.style.top = Math.round(r.top) + "px";
        rackWrap.style.left = Math.round(r.left) + "px";
        rackWrap.style.right = "auto";
        rackWrap.style.width = Math.round(r.width) + "px";
        rackWrap.style.height = Math.round(r.height) + "px";
      } catch (e) { /* opportunistic — CSS box is a fine fallback */ }
    }

    // ── THE RACK — the whole point. One compositor-only climax.
    function startReveal() {
      if (revealing) return;
      revealing = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      detachSkipListeners();
      alignRackToHero();

      var dur = reduced ? CFG.FADE_MS : CFG.RACK_MS;

      // (1) FOCUS RACK: the warm wash lifts and the blurred copy dissolves —
      //     revealing the identical SHARP hero photo underneath — while it
      //     settles from over-scale to rest. Sharp reveal = the real hero photo.
      if (wash) {
        wash.style.transition = "opacity " + (dur / 1000) + "s cubic-bezier(.2,.6,.18,1)";
        wash.style.opacity = "0";
      }
      if (blurImg) {
        blurImg.style.transition =
          "opacity " + ((dur - 120) / 1000) + "s cubic-bezier(.2,.6,.18,1), " +
          "transform " + (dur / 1000) + "s cubic-bezier(.2,.6,.18,1)";
        blurImg.style.opacity = "0";
        blurImg.style.transform = "scale(1)";
      }

      // (2) RELEASE THE HERO — content precipitates up out of the clearing focus.
      setTimeout(unarm, reduced ? 0 : CFG.ARM_RELEASE_MS);

      // (3) EMBER FLARE → ROBOT GLOW baton-pass. CSS glow lands even if Spline lags.
      if (!reduced) {
        setTimeout(function ignite() {
          try { window.dispatchEvent(new CustomEvent("sm:core-ignite", { detail: { y: CFG.CORE_Y } })); } catch (e) { /* opportunistic */ }
          igniteAt = performance.now();
          if (!raf) raf = requestAnimationFrame(emberOutro);
        }, CFG.IGNITE_DELAY_MS);
      }

      setTimeout(teardown, dur + 90);
    }

    // Ember flare + decay during the rack (a short independent rAF, cheap).
    var igniteAt = 0;
    function emberOutro(now) {
      if (finished) return;
      var e = clamp01((now - igniteAt) / 460);
      // fast flare up, slow decay to 0
      var alpha = e < 0.22 ? (e / 0.22) : (1 - (e - 0.22) / 0.78);
      var radius = Math.min(eW, eH) * (0.16 + e * 0.22);
      drawEmber(alpha * 0.9, radius);
      if (e < 1) raf = requestAnimationFrame(emberOutro); else { drawEmber(0, 0); raf = 0; }
    }

    // ── Loading loop (full mode): breathing ember + a subtle pre-settle of the
    // frame toward focus so a slow load visibly progresses but never lands.
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (revealing) return;

      tickClock(now);

      var t = now - start;
      // Ember breath: slow sine, warm and alive.
      var breath = 0.5 + 0.5 * Math.sin(t * 0.0016);
      var r = Math.min(eW, eH) * (0.13 + breath * 0.03);
      drawEmber(0.32 + breath * 0.16, r);

      // Pre-settle: nudge the wash a touch lighter over PRESETTLE_MS (floored),
      // so waiting reads as "coming into focus", not "stuck".
      if (wash) {
        var pre = easeOutCubic(clamp01(t / CFG.PRESETTLE_MS)) * 0.22; // 0 → 0.22
        wash.style.opacity = String(1 - pre); // 1 → 0.78
      }

      if (exitFrom) { startReveal(); return; }
      var pastCeiling = t >= CFG.CEILING_MS;
      if (pastCeiling || robotSettled()) { startReveal(); return; }
    }

    // Reduced/low-tier loop: no canvas, just a coarse clock + ready poll.
    function reducedTick() {
      if (revealing || finished) return;
      tickClock(performance.now());
      var t = performance.now() - start;
      if (exitFrom || t >= CFG.CEILING_MS || robotSettled()) { startReveal(); return; }
      setTimeout(reducedTick, 120);
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
      reducedTick();
    } else {
      raf = requestAnimationFrame(frame);
    }
    // Wall-clock backstops independent of rAF: fire the rack even if rAF is
    // throttled (hidden tab), and hard-teardown after.
    setTimeout(function () { if (!revealing && !finished) startReveal(); }, CFG.CEILING_MS + 300);
    setTimeout(teardown, CFG.CEILING_MS + 1100);
  }

  window.SMIntro = { run: run };
  if (window.__SM_INTRO && !window.__SM_INTRO.__started) run();
})();
