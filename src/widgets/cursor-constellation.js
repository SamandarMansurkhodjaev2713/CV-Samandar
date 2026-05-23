// cursor-constellation.js — Interactive generative canvas (v53).
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// A non-commercial, "залипательный" interactive piece. The visitor presses
// and drags to draw a constellation of glowing stars; releases to let them
// gently drift. Ambient particles wander the canvas when idle so the space
// always feels alive. Click without drag = small burst. Reset wipes
// everything with a clean fade-out.
//
// v53 changes vs v52:
//   • hold-to-draw — moving the cursor no longer spawns particles
//     uncontrollably. You press, draw, release. Much easier to make
//     beautiful shapes.
//   • velocity-aware brush — slow drag drops larger / fewer stars, fast
//     drag drops smaller / many.
//   • pressing indicator — soft ring around cursor while drawing.
//   • ambient drift — 8 low-energy stars wander when no recent activity.
//   • reset — fully wipes canvas (not just particle array) so trail
//     residue disappears immediately.
//   • twinkle — each star has a slow alpha oscillation for life.
//   • touch — long-press starts drawing, short tap = single star.
//
// All rendering in one rAF; particle data lives in flat typed arrays so
// the hot loop never allocates. Capped to PARTICLE_CAP for predictable
// frame time even on low-end phones. IO + visibilitychange pause when
// off-screen / tab hidden.
//
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
//   const w = window.CursorConstellation.create(rootEl, { labels?, lang? })
//   w.dispose()
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── Tuning ─────────────────────────────────────────────────────────────
  const PARTICLE_CAP = 220;
  // Brush spawn rate while drawing — velocity scales this.
  const BRUSH_SPAWN_BASE = 1;
  const BRUSH_SPAWN_MAX = 4;
  // Velocity (CSS px/frame) above which we hit max spawn.
  const VELOCITY_TO_MAX_SPAWN = 18;
  // Particle size mapped from velocity (slow drag → bigger stars).
  const PARTICLE_SIZE_MIN = 0.9;
  const PARTICLE_SIZE_MAX = 3.6;
  // Lifetime in frames (~60 fps). Long enough to let constellations build.
  const PARTICLE_LIFE_MIN = 480;
  const PARTICLE_LIFE_MAX = 920;
  // Drag (per-frame velocity multiplier) — closer to 1 = particles glide.
  const PARTICLE_DRAG = 0.972;
  // Click-vs-drag threshold. A pointerdown→pointerup within these bounds
  // is treated as a "tap" (single-star drop), otherwise as a drag.
  const TAP_MAX_DURATION_MS = 220;
  const TAP_MAX_DISTANCE_PX = 8;
  // Burst (long-press without drag is treated as tap → small starburst).
  const BURST_COUNT = 10;
  const BURST_SPEED = 1.4;
  // Connection lines.
  const LINE_MAX_DIST_PX = 96;
  const LINE_MAX_PER_FRAME = 380;
  // Ambient drifters when idle.
  const AMBIENT_COUNT = 8;
  const AMBIENT_DRIFT_SPEED = 0.16;
  const IDLE_AFTER_MS = 1800;
  // Pressing-ring radius (CSS px).
  const PRESSING_RING_RADIUS_PX = 22;
  // Reset wipe duration.
  const RESET_WIPE_MS = 360;
  // DPR cap.
  const DPR_MAX = 2;
  // Trail fade alpha — higher = stars vanish faster.
  const TRAIL_FADE_ALPHA = 0.085;

  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

  // ── Localized labels ──────────────────────────────────────────────────
  const I18N = {
    ru: {
      title: "constellation",
      subtitle: "зажми и тяни → нарисуй своё созвездие",
      hint_press: "зажми мышь",
      hint_tap: "клик · одна звезда",
      hint_mobile_press: "зажми и веди",
      hint_mobile_tap: "тап · звезда",
      reset: "сбросить",
      live: "live",
      stars: "звёзд",
    },
    en: {
      title: "constellation",
      subtitle: "press & drag → draw your own constellation",
      hint_press: "press & drag",
      hint_tap: "click · one star",
      hint_mobile_press: "press & drag",
      hint_mobile_tap: "tap · star",
      reset: "reset",
      live: "live",
      stars: "stars",
    },
    uz: {
      title: "constellation",
      subtitle: "bosib torting → o'z yulduz turkumingizni chizing",
      hint_press: "bosib torting",
      hint_tap: "bosish · bitta yulduz",
      hint_mobile_press: "bosib torting",
      hint_mobile_tap: "bosish · yulduz",
      reset: "tozalash",
      live: "live",
      stars: "yulduz",
    },
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function buildHtml(labels) {
    return (
      '<header class="cc-head">' +
        '<div class="cc-head-l">' +
          '<span class="cc-icon" aria-hidden="true">✦</span>' +
          '<div class="cc-head-titles">' +
            '<span class="cc-title">' + escapeHtml(labels.title) + '</span>' +
            '<span class="cc-subtitle mono">' + escapeHtml(labels.subtitle) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="cc-head-r">' +
          '<span class="cc-live mono"><span class="cc-live-dot"></span>' + escapeHtml(labels.live) + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="cc-stage" data-cc-stage>' +
        '<canvas class="cc-canvas" data-cc-canvas></canvas>' +
        '<div class="cc-hint mono" data-cc-hint>' +
          '<span class="cc-hint-line" data-cc-hint-press>' + escapeHtml(labels.hint_press) + '</span>' +
          '<span class="cc-hint-sep">·</span>' +
          '<span class="cc-hint-line" data-cc-hint-tap>' + escapeHtml(labels.hint_tap) + '</span>' +
        '</div>' +
        '<button type="button" class="cc-reset mono" data-cc-reset aria-label="reset">' +
          '<span class="cc-reset-ico" aria-hidden="true">↺</span>' +
          '<span>' + escapeHtml(labels.reset) + '</span>' +
        '</button>' +
        '<div class="cc-counter mono" data-cc-counter aria-live="polite">' +
          '<span data-cc-counter-num>0</span>' +
          '<span class="cc-counter-unit">' + escapeHtml(labels.stars) + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Factory ────────────────────────────────────────────────────────────
  function create(rootEl, opts) {
    const options = opts || {};
    if (!rootEl) {
      console.warn("[CursorConstellation] no rootEl, returning no-op.");
      return { dispose: function () {} };
    }
    const lang = options.lang in I18N ? options.lang : "ru";
    const labels = Object.assign({}, I18N[lang], options.labels || {});

    rootEl.classList.add("cursor-constellation", "cc");
    rootEl.innerHTML = buildHtml(labels);

    const stage = rootEl.querySelector("[data-cc-stage]");
    const canvas = rootEl.querySelector("[data-cc-canvas]");
    const hint = rootEl.querySelector("[data-cc-hint]");
    const hintPress = rootEl.querySelector("[data-cc-hint-press]");
    const hintTap = rootEl.querySelector("[data-cc-hint-tap]");
    const resetBtn = rootEl.querySelector("[data-cc-reset]");
    const counterNum = rootEl.querySelector("[data-cc-counter-num]");

    if (!canvas || !canvas.getContext) {
      console.warn("[CursorConstellation] canvas unavailable, abort.");
      return { dispose: function () {} };
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[CursorConstellation] 2d context unavailable, abort.");
      return { dispose: function () {} };
    }

    // ── State ────────────────────────────────────────────────────────────
    // Particle data — flat arrays for tight loops.
    const px = new Float32Array(PARTICLE_CAP);
    const py = new Float32Array(PARTICLE_CAP);
    const pvx = new Float32Array(PARTICLE_CAP);
    const pvy = new Float32Array(PARTICLE_CAP);
    const pSize = new Float32Array(PARTICLE_CAP);
    const pLife = new Int32Array(PARTICLE_CAP);
    const pMaxLife = new Int32Array(PARTICLE_CAP);
    // Twinkle phase per particle (radians). Independent oscillation makes
    // each star feel uniquely alive instead of pulsing in unison.
    const pTwinkle = new Float32Array(PARTICLE_CAP);
    let particleCount = 0;

    // Ambient drifters — pre-seeded, never culled, slow random walk.
    const ax = new Float32Array(AMBIENT_COUNT);
    const ay = new Float32Array(AMBIENT_COUNT);
    const avx = new Float32Array(AMBIENT_COUNT);
    const avy = new Float32Array(AMBIENT_COUNT);
    const aSize = new Float32Array(AMBIENT_COUNT);
    const aTwinkle = new Float32Array(AMBIENT_COUNT);
    let ambientInited = false;

    const motionMedia = window.matchMedia ? window.matchMedia(MEDIA_REDUCED_MOTION) : { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    let prefersReducedMotion = motionMedia.matches;

    // Pointer state.
    let pointerX = -9999;
    let pointerY = -9999;
    let pointerInside = false;
    let isDrawing = false;
    // Press start tracking — used to detect tap-vs-drag.
    let pressStartX = 0;
    let pressStartY = 0;
    let pressStartAt = 0;
    let pressMoved = false;
    // Velocity tracking.
    let lastVelocity = 0;
    let lastMoveAt = 0;
    let lastMoveX = 0;
    let lastMoveY = 0;
    // Reset wipe state.
    let wipingStartedAt = 0;

    // Canvas sizing.
    let dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    let cssW = 0;
    let cssH = 0;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(2, rect.width);
      cssH = Math.max(2, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedAmbient();
    }
    resize();
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(canvas);
    else window.addEventListener("resize", resize);

    function readAccentRgb() {
      const cs = getComputedStyle(document.documentElement);
      const val = cs.getPropertyValue("--accent-rgb").trim();
      if (!val) return [217, 119, 87];
      const parts = val.split(/\s+/).map(function (v) { return parseInt(v, 10); });
      if (parts.length !== 3 || parts.some(function (v) { return isNaN(v); })) return [217, 119, 87];
      return parts;
    }
    function readAccent2Rgb() {
      const cs = getComputedStyle(document.documentElement);
      const val = cs.getPropertyValue("--accent-2-rgb").trim();
      if (!val) return [200, 155, 94];
      const parts = val.split(/\s+/).map(function (v) { return parseInt(v, 10); });
      if (parts.length !== 3 || parts.some(function (v) { return isNaN(v); })) return [200, 155, 94];
      return parts;
    }

    // Detect touch capability for mobile-friendly hint text.
    const isTouch = (typeof window !== "undefined" && (("ontouchstart" in window) || (navigator.maxTouchPoints > 0)));
    if (isTouch) {
      if (hintPress) hintPress.textContent = labels.hint_mobile_press;
      if (hintTap) hintTap.textContent = labels.hint_mobile_tap;
    }

    function seedAmbient() {
      if (cssW < 2 || cssH < 2) return;
      for (let i = 0; i < AMBIENT_COUNT; i++) {
        ax[i] = Math.random() * cssW;
        ay[i] = Math.random() * cssH;
        const angle = Math.random() * Math.PI * 2;
        avx[i] = Math.cos(angle) * AMBIENT_DRIFT_SPEED;
        avy[i] = Math.sin(angle) * AMBIENT_DRIFT_SPEED;
        aSize[i] = 1.2 + Math.random() * 1.4;
        aTwinkle[i] = Math.random() * Math.PI * 2;
      }
      ambientInited = true;
    }

    function spawnParticle(x, y, vx, vy, size) {
      // FIFO recycle when at cap.
      if (particleCount >= PARTICLE_CAP) {
        for (let i = 0; i < PARTICLE_CAP - 1; i++) {
          px[i] = px[i + 1]; py[i] = py[i + 1];
          pvx[i] = pvx[i + 1]; pvy[i] = pvy[i + 1];
          pSize[i] = pSize[i + 1];
          pLife[i] = pLife[i + 1];
          pMaxLife[i] = pMaxLife[i + 1];
          pTwinkle[i] = pTwinkle[i + 1];
        }
        particleCount = PARTICLE_CAP - 1;
      }
      const i = particleCount;
      px[i] = x; py[i] = y;
      pvx[i] = vx; pvy[i] = vy;
      pSize[i] = size;
      pMaxLife[i] = PARTICLE_LIFE_MIN + Math.floor(Math.random() * (PARTICLE_LIFE_MAX - PARTICLE_LIFE_MIN));
      pLife[i] = pMaxLife[i];
      pTwinkle[i] = Math.random() * Math.PI * 2;
      particleCount++;
    }

    // Spawn a brush stroke at the given point. Velocity drives both the
    // particle COUNT (more for faster moves) and the particle SIZE
    // (bigger for slower moves — gives a tactile brush feel).
    function brushAt(x, y, velocity) {
      const v = Math.min(1, velocity / VELOCITY_TO_MAX_SPAWN);
      const count = Math.max(BRUSH_SPAWN_BASE, Math.round(BRUSH_SPAWN_BASE + v * (BRUSH_SPAWN_MAX - BRUSH_SPAWN_BASE)));
      const baseSize = PARTICLE_SIZE_MAX - v * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
      for (let n = 0; n < count; n++) {
        // Small random offset perpendicular to motion direction.
        const jitter = (Math.random() - 0.5) * 6;
        const angle = Math.random() * Math.PI * 2;
        const spd = 0.2 + Math.random() * 0.6;
        spawnParticle(
          x + jitter,
          y + jitter,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          baseSize * (0.75 + Math.random() * 0.5)
        );
      }
    }

    function tapAt(x, y) {
      // Single bright star + small radial burst around it.
      spawnParticle(x, y, 0, 0, PARTICLE_SIZE_MAX);
      for (let n = 0; n < BURST_COUNT; n++) {
        const angle = (n / BURST_COUNT) * Math.PI * 2;
        const spd = BURST_SPEED * (0.7 + Math.random() * 0.6);
        spawnParticle(
          x, y,
          Math.cos(angle) * spd,
          Math.sin(angle) * spd,
          PARTICLE_SIZE_MIN + Math.random() * 0.8
        );
      }
    }

    function startReset() {
      // Triggers the wipe pass in the render loop. Clears particles when
      // the wipe completes so the trail visibly fades to nothing.
      wipingStartedAt = performance.now();
      if (resetBtn) {
        resetBtn.classList.add("is-active");
        window.setTimeout(function clearActive() {
          if (resetBtn) resetBtn.classList.remove("is-active");
        }, RESET_WIPE_MS + 80);
      }
    }

    // ── Pointer events ───────────────────────────────────────────────────
    function localCoords(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return [clientX - rect.left, clientY - rect.top];
    }

    function onPointerEnter(e) {
      const c = localCoords(e.clientX, e.clientY);
      pointerX = c[0]; pointerY = c[1];
      pointerInside = true;
      lastMoveAt = performance.now();
      lastMoveX = pointerX; lastMoveY = pointerY;
      if (hint) hint.classList.remove("is-visible");
    }
    function onPointerLeave() {
      pointerInside = false;
      // Releasing the pointer outside still ends drawing.
      isDrawing = false;
    }
    function onPointerMove(e) {
      const c = localCoords(e.clientX, e.clientY);
      const newX = c[0];
      const newY = c[1];
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveAt);
      const dx = newX - lastMoveX;
      const dy = newY - lastMoveY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Velocity in px / 16ms (≈ per frame).
      lastVelocity = dist * (16 / dt);
      pointerX = newX; pointerY = newY;
      lastMoveX = newX; lastMoveY = newY;
      lastMoveAt = now;
      pointerInside = true;
      if (hint) hint.classList.remove("is-visible");

      if (isDrawing) {
        // Track that we moved enough to qualify as a "drag".
        const dxStart = newX - pressStartX;
        const dyStart = newY - pressStartY;
        if (dxStart * dxStart + dyStart * dyStart > TAP_MAX_DISTANCE_PX * TAP_MAX_DISTANCE_PX) {
          pressMoved = true;
        }
        brushAt(newX, newY, lastVelocity);
      }
    }
    function onPointerDown(e) {
      const c = localCoords(e.clientX, e.clientY);
      pointerX = c[0]; pointerY = c[1];
      pressStartX = c[0];
      pressStartY = c[1];
      pressStartAt = performance.now();
      pressMoved = false;
      isDrawing = true;
      lastMoveX = pointerX; lastMoveY = pointerY;
      lastMoveAt = pressStartAt;
      if (hint) hint.classList.remove("is-visible");
      // Spawn one star at the press point so the press is immediately visible.
      spawnParticle(pointerX, pointerY, 0, 0, PARTICLE_SIZE_MAX * 0.9);
      // Capture pointer so we keep getting events even if user drags outside.
      if (canvas.setPointerCapture && e.pointerId != null) {
        try { canvas.setPointerCapture(e.pointerId); }
        catch (err) { console.warn("[CursorConstellation] setPointerCapture failed:", err && err.message); }
      }
    }
    function onPointerUp(e) {
      if (!isDrawing) return;
      const now = performance.now();
      const duration = now - pressStartAt;
      isDrawing = false;
      // If it was a quick tap with minimal movement → trigger a small burst.
      if (duration < TAP_MAX_DURATION_MS && !pressMoved) {
        tapAt(pressStartX, pressStartY);
      }
      if (canvas.releasePointerCapture && e.pointerId != null) {
        try { canvas.releasePointerCapture(e.pointerId); }
        catch (err) { /* fine — non-critical */ }
      }
    }
    function onPointerCancel() {
      isDrawing = false;
    }

    canvas.addEventListener("pointerenter", onPointerEnter);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);

    function onResetClick() { startReset(); }
    if (resetBtn) resetBtn.addEventListener("click", onResetClick);

    // ── Visibility & motion preference ───────────────────────────────────
    let isVisible = true;
    let documentVisible = !document.hidden;
    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.target === canvas) isVisible = e.isIntersecting;
        });
      }, { threshold: [0, 0.05] });
      io.observe(canvas);
    }
    function onVisibilityChange() { documentVisible = !document.hidden; }
    document.addEventListener("visibilitychange", onVisibilityChange);
    function onMotionChange(e) { prefersReducedMotion = e.matches; }
    if (motionMedia.addEventListener) motionMedia.addEventListener("change", onMotionChange);
    else if (motionMedia.addListener) motionMedia.addListener(onMotionChange);

    // ── Render loop ──────────────────────────────────────────────────────
    let rafHandle = 0;
    let lastCounterValue = -1;
    let frameTime = 0;

    function tick(now) {
      rafHandle = requestAnimationFrame(tick);
      if (!isVisible || !documentVisible) return;
      frameTime = now;

      // Show idle hint after enough idle time.
      if (hint && !isDrawing && now - lastMoveAt > IDLE_AFTER_MS && particleCount === 0) {
        hint.classList.add("is-visible");
      }

      // Reset wipe — overlay an opaque rect that fades from solid to zero
      // over RESET_WIPE_MS. When complete, clear particles.
      const wipeAge = wipingStartedAt > 0 ? now - wipingStartedAt : Infinity;
      if (wipeAge < RESET_WIPE_MS) {
        // Continue with normal frame fade plus a stronger wipe overlay.
        ctx.globalCompositeOperation = "source-over";
        const wipeT = wipeAge / RESET_WIPE_MS;
        // Stronger fade during wipe.
        ctx.fillStyle = "rgba(8, 7, 6, " + (0.18 + 0.5 * (1 - wipeT)).toFixed(3) + ")";
        ctx.fillRect(0, 0, cssW, cssH);
        if (wipeT >= 0.55 && particleCount > 0) {
          particleCount = 0;
        }
      } else {
        if (wipingStartedAt > 0) {
          // Wipe just finished — clear once more to remove residue, then end.
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "rgba(8, 7, 6, 1)";
          ctx.fillRect(0, 0, cssW, cssH);
          wipingStartedAt = 0;
        }
        // Normal frame: low-alpha overlay creates trailing-fade effect.
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(8, 7, 6, " + TRAIL_FADE_ALPHA + ")";
        ctx.fillRect(0, 0, cssW, cssH);
      }

      if (prefersReducedMotion) {
        if (particleCount === 0) renderStaticPattern();
        return;
      }

      const accent = readAccentRgb();
      const accent2 = readAccent2Rgb();

      // Ambient drift — when no one is interacting, slowly wander.
      if (ambientInited) {
        for (let i = 0; i < AMBIENT_COUNT; i++) {
          let x = ax[i] + avx[i];
          let y = ay[i] + avy[i];
          // Bounce off edges with energy preservation.
          if (x < 8) { x = 8; avx[i] = -avx[i]; }
          else if (x > cssW - 8) { x = cssW - 8; avx[i] = -avx[i]; }
          if (y < 8) { y = 8; avy[i] = -avy[i]; }
          else if (y > cssH - 8) { y = cssH - 8; avy[i] = -avy[i]; }
          ax[i] = x; ay[i] = y;
          aTwinkle[i] += 0.018;
        }
      }

      // Update + cull active particles.
      let writeIdx = 0;
      for (let i = 0; i < particleCount; i++) {
        const life = pLife[i] - 1;
        if (life <= 0) continue;
        let vx = pvx[i] * PARTICLE_DRAG;
        let vy = pvy[i] * PARTICLE_DRAG;
        // Soft drift downward — like dust settling.
        vy += 0.003;
        const x = px[i] + vx;
        const y = py[i] + vy;
        const BOUNCE = 0.45;
        let finalX = x, finalY = y, finalVx = vx, finalVy = vy;
        if (x < 0) { finalX = 0; finalVx = -vx * BOUNCE; }
        else if (x > cssW) { finalX = cssW; finalVx = -vx * BOUNCE; }
        if (y < 0) { finalY = 0; finalVy = -vy * BOUNCE; }
        else if (y > cssH) { finalY = cssH; finalVy = -vy * BOUNCE; }
        px[writeIdx] = finalX; py[writeIdx] = finalY;
        pvx[writeIdx] = finalVx; pvy[writeIdx] = finalVy;
        pSize[writeIdx] = pSize[i];
        pLife[writeIdx] = life;
        pMaxLife[writeIdx] = pMaxLife[i];
        pTwinkle[writeIdx] = pTwinkle[i] + 0.04;
        writeIdx++;
      }
      particleCount = writeIdx;

      // Update counter (debounced).
      if (counterNum && particleCount !== lastCounterValue) {
        counterNum.textContent = String(particleCount);
        lastCounterValue = particleCount;
      }

      // Lines — additive overlay so overlaps brighten naturally.
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 0.7;
      const distMaxSq = LINE_MAX_DIST_PX * LINE_MAX_DIST_PX;
      let linesDrawn = 0;
      for (let i = 0; i < particleCount && linesDrawn < LINE_MAX_PER_FRAME; i++) {
        const xi = px[i]; const yi = py[i];
        for (let j = i + 1; j < particleCount && linesDrawn < LINE_MAX_PER_FRAME; j++) {
          const dx = px[j] - xi;
          const dy = py[j] - yi;
          const dsq = dx * dx + dy * dy;
          if (dsq > distMaxSq) continue;
          const d = Math.sqrt(dsq);
          const opacity = (1 - d / LINE_MAX_DIST_PX) * 0.4;
          ctx.strokeStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + "," + opacity.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(xi, yi);
          ctx.lineTo(px[j], py[j]);
          ctx.stroke();
          linesDrawn++;
        }
      }

      // Particles (additive composite).
      for (let i = 0; i < particleCount; i++) {
        const lifeT = pLife[i] / pMaxLife[i];
        // Twinkle factor: subtle ±15% size oscillation.
        const tw = 0.92 + Math.sin(pTwinkle[i]) * 0.08;
        const r = pSize[i] * (0.6 + lifeT * 0.6) * tw;
        const alpha = Math.min(1, lifeT * 1.4);
        const cx = px[i];
        const cy = py[i];
        // Soft halo with accent2 for warm secondary tone.
        ctx.fillStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + "," + (alpha * 0.55).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(cx, cy, r * 2.6, 0, Math.PI * 2);
        ctx.fill();
        // Mid layer in accent-2.
        ctx.fillStyle = "rgba(" + accent2[0] + "," + accent2[1] + "," + accent2[2] + "," + (alpha * 0.5).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
        // Bright core (warm white).
        ctx.fillStyle = "rgba(255, 240, 220, " + (alpha * 0.95).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ambient drifters — dim accent stars, always present.
      if (ambientInited) {
        for (let i = 0; i < AMBIENT_COUNT; i++) {
          const tw = 0.7 + Math.sin(aTwinkle[i]) * 0.3;
          const r = aSize[i] * tw;
          ctx.fillStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + ",0.25)";
          ctx.beginPath();
          ctx.arc(ax[i], ay[i], r * 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255, 240, 220, 0.55)";
          ctx.beginPath();
          ctx.arc(ax[i], ay[i], r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pressing ring — soft dashed circle around cursor while drawing.
      if (isDrawing && pointerInside) {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + ",0.7)";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(pointerX, pointerY, PRESSING_RING_RADIUS_PX, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.globalCompositeOperation = "source-over";
    }

    function renderStaticPattern() {
      const accent = readAccentRgb();
      const cols = 6;
      const rows = 4;
      ctx.fillStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + ",0.35)";
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * (cssW / cols);
          const y = (r + 0.5) * (cssH / rows);
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Boot.
    lastMoveAt = performance.now();
    seedAmbient();
    rafHandle = requestAnimationFrame(tick);

    return {
      dispose: function () {
        if (rafHandle) cancelAnimationFrame(rafHandle);
        rafHandle = 0;
        canvas.removeEventListener("pointerenter", onPointerEnter);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerCancel);
        if (resetBtn) resetBtn.removeEventListener("click", onResetClick);
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", resize);
        if (io) io.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (motionMedia.removeEventListener) motionMedia.removeEventListener("change", onMotionChange);
        else if (motionMedia.removeListener) motionMedia.removeListener(onMotionChange);
      },
    };
  }

  window.CursorConstellation = { create: create };
})();
