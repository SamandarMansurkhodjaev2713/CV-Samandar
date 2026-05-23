// theme-transition.js — Choreographed "mood shift" for theme switching.
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// A bare CSS-variable swap reads as a cheap flicker. This module turns a
// theme change into a single designed moment:
//
//   1. A circular wave of the NEW theme's background colour expands from the
//      point the user clicked (the theme toggle).
//   2. When the wave fully covers the viewport, the actual theme swap runs
//      underneath it — completely hidden, so the user never sees a raw flash.
//   3. The wave fades out, revealing the new theme already in place.
//
// The wave body uses the new theme's bg-0 (dark) with an accent-coloured
// outer glow on its leading edge — "a new world spreading out", not a
// jarring bright flash.
//
// ROBUSTNESS
// ─────────────────────────────────────────────────────────────────────────────
//   • Re-entrancy: each run() bumps a generation counter and cancels the
//     previous wave (timers cleared, element removed). Rapid clicks never
//     leave orphaned overlays or apply stale themes.
//   • prefers-reduced-motion: skips the wave entirely, applies instantly.
//   • Graceful: if origin coords are missing/invalid, falls back to the
//     viewport centre; onApply always runs even if the DOM work throws.
//
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
//   window.ThemeTransition.run({
//     originX, originY,   // px — where the wave starts (toggle centre)
//     waveColor,          // new theme bg-0 (wave body)
//     glowColor,          // new theme accent (leading-edge glow)
//     onApply,            // () => void — runs the actual theme swap
//   })
//   window.ThemeTransition.dispose()  // cancel any in-flight wave
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── Timing (ms) ─────────────────────────────────────────────────────────
  // Expand: wave grows from a point to fully cover the viewport.
  const EXPAND_MS = 380;
  // Hold: brief pause at full coverage — guarantees the React commit that
  // applies the theme has painted before we start revealing it.
  const HOLD_MS = 90;
  // Fade: wave dissolves, revealing the new theme underneath.
  const FADE_MS = 420;

  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
  const WAVE_CLASS = "theme-wave";
  // z-index: above all page content + nav, below the OS cursor. The custom
  // cursor layer (if any) sits at 10000+, so 9990 keeps the wave under it.
  const WAVE_Z_INDEX = 9990;
  // Fallback wave/glow colours if the caller passes nothing valid.
  const FALLBACK_WAVE_COLOR = "#161616";
  const FALLBACK_GLOW_COLOR = "#D97757";

  // ── Module state ────────────────────────────────────────────────────────
  // `generation` increments on every run(); a wave's deferred callbacks
  // capture their generation and no-op if a newer run() has superseded them.
  let generation = 0;
  let activeWaveEl = null;
  let activeTimers = [];

  function prefersReducedMotion() {
    if (!window.matchMedia) return false;
    try { return window.matchMedia(MEDIA_REDUCED_MOTION).matches; }
    catch (err) {
      console.warn("[ThemeTransition] matchMedia failed:", err && err.message);
      return false;
    }
  }

  function clearActiveTimers() {
    for (let i = 0; i < activeTimers.length; i++) {
      window.clearTimeout(activeTimers[i]);
    }
    activeTimers = [];
  }

  function removeActiveWave() {
    if (activeWaveEl && activeWaveEl.parentNode) {
      activeWaveEl.parentNode.removeChild(activeWaveEl);
    }
    activeWaveEl = null;
  }

  // Cancel any in-flight transition: stop timers, drop the overlay. Does NOT
  // revert the theme — a half-applied theme is still a valid theme.
  function cancel() {
    clearActiveTimers();
    removeActiveWave();
  }

  // Compute the radius needed for a circle centred at (x,y) to cover the
  // whole viewport: the distance to the farthest corner.
  function coverRadius(x, y, w, h) {
    const dx = Math.max(x, w - x);
    const dy = Math.max(y, h - y);
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Run a theme transition.
   * @param {object} opts
   * @param {number} opts.originX   wave origin X (px). Defaults to viewport centre.
   * @param {number} opts.originY   wave origin Y (px). Defaults to viewport centre.
   * @param {string} opts.waveColor wave body colour (new theme bg-0).
   * @param {string} opts.glowColor leading-edge glow colour (new theme accent).
   * @param {Function} opts.onApply runs the actual theme swap.
   */
  function run(opts) {
    const options = opts || {};
    const onApply = typeof options.onApply === "function" ? options.onApply : null;

    // Always supersede any previous run.
    generation++;
    const myGeneration = generation;
    cancel();

    // Reduced-motion path: no wave, apply immediately.
    if (prefersReducedMotion()) {
      if (onApply) {
        try { onApply(); }
        catch (err) { console.warn("[ThemeTransition] onApply threw (reduced-motion):", err && err.message); }
      }
      return;
    }

    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    // Validate / default the origin coordinates (C-01 edge cases).
    let ox = typeof options.originX === "number" && isFinite(options.originX) ? options.originX : vw / 2;
    let oy = typeof options.originY === "number" && isFinite(options.originY) ? options.originY : vh / 2;
    ox = Math.max(0, Math.min(vw, ox));
    oy = Math.max(0, Math.min(vh, oy));

    const waveColor = typeof options.waveColor === "string" && options.waveColor ? options.waveColor : FALLBACK_WAVE_COLOR;
    const glowColor = typeof options.glowColor === "string" && options.glowColor ? options.glowColor : FALLBACK_GLOW_COLOR;

    const radius = coverRadius(ox, oy, vw, vh);
    if (radius <= 0) {
      // Degenerate viewport — just apply and bail.
      if (onApply) {
        try { onApply(); }
        catch (err) { console.warn("[ThemeTransition] onApply threw (degenerate viewport):", err && err.message); }
      }
      return;
    }

    // Build the wave element. A circle sized 2*radius, centred on the origin,
    // initially scaled to 0 → expands to 1.
    const wave = document.createElement("div");
    wave.className = WAVE_CLASS;
    wave.setAttribute("aria-hidden", "true");
    wave.style.position = "fixed";
    wave.style.left = (ox - radius) + "px";
    wave.style.top = (oy - radius) + "px";
    wave.style.width = (radius * 2) + "px";
    wave.style.height = (radius * 2) + "px";
    wave.style.borderRadius = "50%";
    wave.style.background = waveColor;
    wave.style.boxShadow = "0 0 80px 12px " + glowColor;
    wave.style.pointerEvents = "none";
    wave.style.zIndex = String(WAVE_Z_INDEX);
    wave.style.transform = "scale(0)";
    wave.style.transformOrigin = "center";
    wave.style.willChange = "transform, opacity";
    wave.style.opacity = "1";

    try {
      document.body.appendChild(wave);
    } catch (err) {
      // If we can't even attach the overlay, still apply the theme.
      console.warn("[ThemeTransition] appendChild failed:", err && err.message);
      if (onApply) {
        try { onApply(); }
        catch (err2) { console.warn("[ThemeTransition] onApply threw (no overlay):", err2 && err2.message); }
      }
      return;
    }
    activeWaveEl = wave;

    // Phase 1 — expand. Force a reflow so the transition picks up the
    // scale(0) → scale(1) change.
    wave.style.transition = "transform " + EXPAND_MS + "ms cubic-bezier(0.4, 0, 0.2, 1)";
    // Reading offsetWidth flushes pending style so the transition triggers.
    void wave.offsetWidth;
    wave.style.transform = "scale(1)";

    // Phase 2 — at full coverage, apply the theme (hidden under the wave).
    const applyTimer = window.setTimeout(function applyPhase() {
      if (myGeneration !== generation) return; // superseded
      if (onApply) {
        try { onApply(); }
        catch (err) { console.warn("[ThemeTransition] onApply threw:", err && err.message); }
      }
      // Phase 3 — after a short hold (lets React commit + paint), fade out.
      const fadeTimer = window.setTimeout(function fadePhase() {
        if (myGeneration !== generation) return;
        if (!activeWaveEl) return;
        activeWaveEl.style.transition = "opacity " + FADE_MS + "ms ease";
        activeWaveEl.style.opacity = "0";
        // Phase 4 — remove the overlay once the fade completes.
        const cleanupTimer = window.setTimeout(function cleanupPhase() {
          if (myGeneration !== generation) return;
          removeActiveWave();
          clearActiveTimers();
        }, FADE_MS + 40);
        activeTimers.push(cleanupTimer);
      }, HOLD_MS);
      activeTimers.push(fadeTimer);
    }, EXPAND_MS);
    activeTimers.push(applyTimer);
  }

  window.ThemeTransition = { run: run, dispose: cancel };
})();
