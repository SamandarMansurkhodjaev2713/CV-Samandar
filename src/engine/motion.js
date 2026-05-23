// motion.js — Smart cursor, magnetic buttons, split-text, stagger reveal, sticky pin
// One global module. No deps. Loads after content/themes, before app.jsx.
//
// Exposes:
//   window.Motion.init()                       — mount cursor + observers once
//   window.Motion.refresh()                    — rescan DOM (call after React mount)
//   window.Motion.setLabel(text)               — pin context label on cursor
//   window.Motion.clearLabel()
//
// Markup contracts (you opt in per element):
//   data-cursor="link|file|drag|read|copy|deploy"   — sets contextual label + state
//   data-cursor-label="..."                          — custom label string (overrides)
//   data-magnetic                                    — button magnetizes to cursor (12px max)
//   data-magnetic-strong                             — stronger pull (20px)
//   data-reveal                                       — stagger fade-up on enter view
//   data-reveal-words                                 — splits children text by words, staggers each
//   data-reveal-chars                                 — splits by chars (use sparingly)
//   data-reveal-delay="0.15"                          — extra delay in seconds
//   [data-pin]                                        — sticky-pin parent until in-view ends

(function () {
  "use strict";
  if (window.Motion) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = matchMedia("(hover: none)").matches || ("ontouchstart" in window && innerWidth < 900);

  // ── Tuning constants
  const CURSOR_LERP = 0.28;        // base position smoothing
  const RING_LERP = 0.16;
  const RING_MORPH_LERP = 0.22;    // ring width / height / radius / offset lerp on magnetic hover
  const IDLE_TIMEOUT_MS = 1800;
  const TRAIL_LENGTH = 6;          // last N positions kept for the velocity trail
  const TRAIL_VELOCITY_ON = 520;   // px/s — fade in trail above this speed
  const TRAIL_VELOCITY_OFF = 280;  // px/s — fully fade out trail below this speed
  const TRAIL_OPACITY_LERP = 0.18;
  const RIPPLE_DURATION_MS = 620;
  const RIPPLE_MAX_RADIUS_PX = 64;
  const RING_DEFAULT_SIZE_PX = 28;
  const SCROLL_GLANCE_VELOCITY_PX_S = 900;
  const SCROLL_GLANCE_VISIBLE_MS = 900;
  const VELOCITY_SAMPLE_MS = 120;  // window over which we estimate cursor velocity
  const LABEL_TEXT_MAX_LEN = 16;

  // ── State
  let cursorEl = null, cursorDot = null, cursorRing = null, cursorH = null, cursorV = null, cursorLabelEl = null;
  let trailEl = null;              // separate SVG for velocity trail (body child)
  let glanceEl = null;             // floating label shown on fast scroll
  let coords = { x: -100, y: -100 }, target = { x: -100, y: -100 };
  let ringScale = 1, ringScaleTarget = 1;
  let labelText = "", currentMode = "default";
  let magnets = [];
  let raf = 0;
  let lastMoveAt = 0;
  let idleTimer = 0;

  // Velocity / trail state
  const trailHistory = [];         // { x, y, t }
  let cursorVelocity = 0;          // px/s, smoothed
  let trailOpacity = 0;
  let trailOpacityTarget = 0;

  // Magnetic deform state — when hovering an element, the ring "captures" it
  // by lerping its size/border-radius/offset toward the target rect.
  let morphActive = false;
  let morphTargetRect = null;      // { offsetX, offsetY, w, h, radius }
  const morphCurrent = { offsetX: 0, offsetY: 0, w: RING_DEFAULT_SIZE_PX, h: RING_DEFAULT_SIZE_PX, radius: 50 };
  const morphTarget  = { offsetX: 0, offsetY: 0, w: RING_DEFAULT_SIZE_PX, h: RING_DEFAULT_SIZE_PX, radius: 50 };

  // Scroll-glance state
  let scrollGlanceUntil = 0;
  let scrollGlanceLabel = "";
  let scrollGlanceFadeRaf = 0;

  // ── Cursor build — creates 3 detached elements on the body:
  //   sc-cursor   — the ring + dot + label, follows cursor via translate
  //   sc-trail    — SVG polyline behind the cursor at high velocity
  //   sc-glance   — floating section label shown during fast scroll
  function buildCursor() {
    if (isTouch) return;

    cursorEl = document.createElement("div");
    cursorEl.className = "sc-cursor";
    cursorEl.setAttribute("aria-hidden", "true");
    cursorEl.innerHTML = `
      <div class="sc-cross sc-cross-h"></div>
      <div class="sc-cross sc-cross-v"></div>
      <div class="sc-ring"></div>
      <div class="sc-dot"></div>
      <div class="sc-label"><span class="sc-label-key"></span><span class="sc-label-val"></span></div>
      <div class="sc-coords"></div>
    `;
    document.body.appendChild(cursorEl);
    cursorDot = cursorEl.querySelector(".sc-dot");
    cursorRing = cursorEl.querySelector(".sc-ring");
    cursorH = cursorEl.querySelector(".sc-cross-h");
    cursorV = cursorEl.querySelector(".sc-cross-v");
    cursorLabelEl = cursorEl.querySelector(".sc-label");
    const coordsEl = cursorEl.querySelector(".sc-coords");

    // Trail — a tiny SVG that draws a fading polyline of recent positions.
    // Fixed at the viewport, never transformed — points are absolute coords.
    trailEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    trailEl.setAttribute("class", "sc-trail");
    trailEl.setAttribute("aria-hidden", "true");
    const trailLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    trailLine.setAttribute("class", "sc-trail-line");
    trailLine.setAttribute("fill", "none");
    trailEl.appendChild(trailLine);
    document.body.appendChild(trailEl);

    // Floating glance label.
    glanceEl = document.createElement("div");
    glanceEl.className = "sc-glance";
    glanceEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(glanceEl);

    window.addEventListener("mousemove", (e) => {
      target.x = e.clientX; target.y = e.clientY;
      coordsEl.textContent = `x:${String(e.clientX).padStart(4,"0")}  y:${String(e.clientY).padStart(4,"0")}`;
      lastMoveAt = performance.now();
      // Record raw position for velocity / trail (separate from smoothed coords).
      trailHistory.push({ x: e.clientX, y: e.clientY, t: lastMoveAt });
      while (trailHistory.length > TRAIL_LENGTH) trailHistory.shift();
      if (cursorEl.classList.contains("is-idle")) cursorEl.classList.remove("is-idle");
      if (idleTimer) { window.clearTimeout(idleTimer); idleTimer = 0; }
      idleTimer = window.setTimeout(() => {
        if (cursorEl) cursorEl.classList.add("is-idle");
      }, IDLE_TIMEOUT_MS);
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    window.addEventListener("mousedown", (e) => {
      cursorEl.classList.add("is-down");
    });
    // mouseup → restore visual + spawn ripple at the actual mouse pos
    window.addEventListener("mouseup", (e) => {
      cursorEl.classList.remove("is-down");
      spawnRipple(e.clientX, e.clientY);
    });
    document.addEventListener("mouseleave", () => cursorEl.classList.add("is-out"));
    document.addEventListener("mouseenter", () => cursorEl.classList.remove("is-out"));

    document.body.classList.add("has-smart-cursor");
    bindScrollGlance();
  }

  // ── Click ripple — a short-lived expanding ring rendered at click position.
  // Created and appended fresh, removed after its CSS animation completes; no
  // mutation observer needed since the element auto-destructs on `animationend`.
  function spawnRipple(clientX, clientY) {
    if (!cursorEl) return;
    const r = document.createElement("div");
    r.className = "sc-ripple";
    r.style.left = `${clientX}px`;
    r.style.top  = `${clientY}px`;
    r.style.setProperty("--sc-ripple-max", `${RIPPLE_MAX_RADIUS_PX}px`);
    r.style.setProperty("--sc-ripple-dur", `${RIPPLE_DURATION_MS}ms`);
    r.addEventListener("animationend", () => { r.remove(); }, { once: true });
    // Safety net: in case animationend never fires (very rare), GC after duration.
    window.setTimeout(() => { if (r.isConnected) r.remove(); }, RIPPLE_DURATION_MS + 400);
    document.body.appendChild(r);
  }

  // ── Section glance — shows a floating label near the cursor when the user
  // is scrolling fast, so they don't lose their place in a long page.
  function bindScrollGlance() {
    let lastScrollY = window.scrollY;
    let lastScrollAt = performance.now();
    let lastSectionId = "";

    function onScroll() {
      // Keep magnetic morph attached to its element when content scrolls under it.
      refreshMorphIfNeeded();
      if (!raf && morphElCurrent) raf = requestAnimationFrame(tick);

      const now = performance.now();
      const dt = Math.max(8, now - lastScrollAt);
      const dy = window.scrollY - lastScrollY;
      const velocity = Math.abs(dy) / (dt / 1000);
      lastScrollY = window.scrollY;
      lastScrollAt = now;
      if (velocity < SCROLL_GLANCE_VELOCITY_PX_S) return;

      // Find the section nearest viewport center.
      const sections = document.querySelectorAll("section[data-section]");
      const vCenter = window.innerHeight / 2;
      let bestId = lastSectionId;
      let bestDist = Infinity;
      sections.forEach((s) => {
        const rect = s.getBoundingClientRect();
        const sCenter = rect.top + rect.height / 2;
        const dist = Math.abs(sCenter - vCenter);
        if (dist < bestDist) { bestDist = dist; bestId = s.getAttribute("data-section") || ""; }
      });
      if (!bestId || bestId === lastSectionId) {
        // even same section — refresh the glance window
        scrollGlanceUntil = now + SCROLL_GLANCE_VISIBLE_MS;
        return;
      }
      lastSectionId = bestId;
      scrollGlanceLabel = `↓ ${bestId}`;
      scrollGlanceUntil = now + SCROLL_GLANCE_VISIBLE_MS;
      if (glanceEl) {
        glanceEl.textContent = scrollGlanceLabel;
        glanceEl.classList.add("is-on");
      }
      if (scrollGlanceFadeRaf) { window.clearTimeout(scrollGlanceFadeRaf); }
      scrollGlanceFadeRaf = window.setTimeout(() => {
        if (glanceEl) glanceEl.classList.remove("is-on");
      }, SCROLL_GLANCE_VISIBLE_MS);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function tick() {
    raf = 0;
    coords.x += (target.x - coords.x) * CURSOR_LERP;
    coords.y += (target.y - coords.y) * CURSOR_LERP;
    ringScale += (ringScaleTarget - ringScale) * RING_LERP;
    if (cursorEl) {
      cursorEl.style.transform = `translate3d(${coords.x}px, ${coords.y}px, 0)`;
    }

    // ── Velocity (from raw history window) → trail opacity target
    cursorVelocity = computeRecentVelocity();
    if (cursorVelocity > TRAIL_VELOCITY_ON) trailOpacityTarget = 1;
    else if (cursorVelocity < TRAIL_VELOCITY_OFF) trailOpacityTarget = 0;
    trailOpacity += (trailOpacityTarget - trailOpacity) * TRAIL_OPACITY_LERP;

    // ── Update trail polyline + visibility
    if (trailEl && trailHistory.length >= 2) {
      // Build "points" from history. Newest at the cursor (end), oldest first.
      const pts = trailHistory.map((p) => `${p.x},${p.y}`).join(" ");
      const line = trailEl.firstElementChild;
      if (line) line.setAttribute("points", pts);
      trailEl.style.opacity = trailOpacity.toFixed(3);
    } else if (trailEl) {
      trailEl.style.opacity = "0";
    }

    // ── Magnetic morph: lerp ring to target rect (if hovering magnetic)
    morphCurrent.offsetX += (morphTarget.offsetX - morphCurrent.offsetX) * RING_MORPH_LERP;
    morphCurrent.offsetY += (morphTarget.offsetY - morphCurrent.offsetY) * RING_MORPH_LERP;
    morphCurrent.w       += (morphTarget.w - morphCurrent.w)             * RING_MORPH_LERP;
    morphCurrent.h       += (morphTarget.h - morphCurrent.h)             * RING_MORPH_LERP;
    morphCurrent.radius  += (morphTarget.radius - morphCurrent.radius)   * RING_MORPH_LERP;
    if (cursorRing) {
      // Apply size + radius + offset. Ring is positioned at cursor center via
      // negative margins (cursor.css), so offsetX/Y is an additional shift.
      const halfW = morphCurrent.w / 2;
      const halfH = morphCurrent.h / 2;
      cursorRing.style.width  = `${morphCurrent.w.toFixed(2)}px`;
      cursorRing.style.height = `${morphCurrent.h.toFixed(2)}px`;
      cursorRing.style.marginLeft = `${(-halfW).toFixed(2)}px`;
      cursorRing.style.marginTop  = `${(-halfH).toFixed(2)}px`;
      cursorRing.style.borderRadius = `${morphCurrent.radius.toFixed(1)}px`;
      cursorRing.style.transform = `translate(${morphCurrent.offsetX.toFixed(2)}px, ${morphCurrent.offsetY.toFixed(2)}px) scale(${ringScale.toFixed(3)})`;
    }

    // ── Magnetic pull on registered [data-magnetic] elements (existing behavior).
    for (const m of magnets) {
      const r = m.el.getBoundingClientRect();
      const cx = r.left + r.width/2, cy = r.top + r.height/2;
      const dx = target.x - cx, dy = target.y - cy;
      const dist = Math.hypot(dx, dy);
      const radius = Math.max(r.width, r.height) * 0.9;
      if (dist < radius) {
        const k = (1 - dist/radius) * m.strength;
        m.el.style.transform = `translate(${dx*k}px, ${dy*k}px)`;
      } else if (m._wasIn) {
        m.el.style.transform = "";
      }
      m._wasIn = dist < radius;
    }

    // ── Glance label follows cursor position when visible.
    if (glanceEl && performance.now() < scrollGlanceUntil) {
      glanceEl.style.transform = `translate(${(coords.x + 20).toFixed(0)}px, ${(coords.y + 20).toFixed(0)}px)`;
    }

    // ── Continue raf only while something is still animating.
    const stillMoving =
      Math.abs(target.x - coords.x) > 0.1 ||
      Math.abs(target.y - coords.y) > 0.1 ||
      Math.abs(ringScaleTarget - ringScale) > 0.01 ||
      Math.abs(morphTarget.w - morphCurrent.w) > 0.2 ||
      Math.abs(morphTarget.h - morphCurrent.h) > 0.2 ||
      Math.abs(morphTarget.offsetX - morphCurrent.offsetX) > 0.2 ||
      Math.abs(morphTarget.offsetY - morphCurrent.offsetY) > 0.2 ||
      Math.abs(trailOpacityTarget - trailOpacity) > 0.01 ||
      magnets.some(m => m._wasIn);
    if (stillMoving) raf = requestAnimationFrame(tick);
  }

  /** Estimate cursor speed (px/s) from the recent history window. */
  function computeRecentVelocity() {
    if (trailHistory.length < 2) return 0;
    const now = performance.now();
    // Drop samples older than VELOCITY_SAMPLE_MS for a meaningful instantaneous read.
    let i = trailHistory.length - 1;
    while (i > 0 && now - trailHistory[i - 1].t < VELOCITY_SAMPLE_MS) i--;
    const oldest = trailHistory[i];
    const newest = trailHistory[trailHistory.length - 1];
    const dx = newest.x - oldest.x;
    const dy = newest.y - oldest.y;
    const dt = Math.max(8, newest.t - oldest.t);
    return Math.hypot(dx, dy) / (dt / 1000);
  }

  function setMode(mode, label) {
    if (mode === currentMode && label === labelText) return;
    currentMode = mode;
    labelText = label || "";
    if (!cursorEl) return;
    cursorEl.setAttribute("data-mode", mode);
    const valEl = cursorLabelEl.querySelector(".sc-label-val");
    const keyEl = cursorLabelEl.querySelector(".sc-label-key");
    if (label) {
      const parts = label.split(":");
      if (parts.length > 1) {
        keyEl.textContent = parts[0] + ":";
        valEl.textContent = parts.slice(1).join(":").trim();
      } else {
        keyEl.textContent = "";
        valEl.textContent = label;
      }
      cursorEl.classList.add("has-label");
    } else {
      cursorEl.classList.remove("has-label");
    }
    ringScaleTarget = mode === "default" ? 1 : (mode === "link" ? 1.5 : mode === "drag" ? 2.2 : 1.7);
    if (!raf) raf = requestAnimationFrame(tick);
  }

  /** Update the ring-morph target to match a DOM element's rect + border-radius. */
  function setMorphTo(el) {
    if (!el) {
      morphActive = false;
      morphTarget.offsetX = 0;
      morphTarget.offsetY = 0;
      morphTarget.w = RING_DEFAULT_SIZE_PX;
      morphTarget.h = RING_DEFAULT_SIZE_PX;
      morphTarget.radius = 50;
      return;
    }
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // morphTarget.offset is added to cursor coords inside tick. The ring is
    // already centered at the cursor, so the offset has to bridge cursor → element.
    morphTarget.offsetX = cx - target.x;
    morphTarget.offsetY = cy - target.y;
    morphTarget.w = r.width + 14;
    morphTarget.h = r.height + 14;
    // Take the element's computed border-radius (in px); if it's circular (50%),
    // map to half the smaller dimension so the morph reads as a pill, not a star.
    const css = getComputedStyle(el);
    const rad = css.borderRadius;
    let radiusPx = parseFloat(rad);
    if (Number.isNaN(radiusPx)) radiusPx = 8;
    if (rad.indexOf("%") !== -1) radiusPx = Math.min(morphTarget.w, morphTarget.h) / 2;
    morphTarget.radius = radiusPx;
    morphActive = true;
  }

  // Re-sync morph offset every frame for a magnetic target (so it tracks the
  // element when the page scrolls without a mousemove).
  let morphElCurrent = null;
  function refreshMorphIfNeeded() {
    if (morphElCurrent) setMorphTo(morphElCurrent);
  }

  // ── Hover delegation: read [data-cursor] from any ancestor, OR auto-infer
  // from native interactive tags. Buttons borrow their text content as the
  // label. The morph target is set when the same element opts in via
  // [data-magnetic] or [data-cursor-deform].
  function bindHoverDelegation() {
    if (!cursorEl) return;
    const LABELS = {
      link: "→ open",
      file: "open file",
      drag: "drag · interact",
      read: "read",
      copy: "copy",
      deploy: "→ deploy",
      send: "send →",
      input: "type · esc to clear",
      tab: "switch",
    };

    function readableText(el) {
      const raw = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!raw) return "";
      return raw.length > LABEL_TEXT_MAX_LEN ? `${raw.slice(0, LABEL_TEXT_MAX_LEN - 1)}…` : raw;
    }

    function infer(el) {
      if (!el) return null;
      const explicit = el.closest("[data-cursor]");
      if (explicit) {
        return {
          el: explicit,
          mode: explicit.getAttribute("data-cursor"),
          label: explicit.getAttribute("data-cursor-label") || null,
        };
      }
      const interactive = el.closest("a, button, [role='button'], [role='tab'], input, textarea, select, label");
      if (!interactive) return null;
      const tag = interactive.tagName.toLowerCase();
      const role = interactive.getAttribute("role");
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return { el: interactive, mode: "input", label: null };
      }
      if (role === "tab") {
        const t = readableText(interactive);
        return { el: interactive, mode: "tab", label: t ? `switch · ${t}` : "switch" };
      }
      if (tag === "a") {
        const href = interactive.getAttribute("href") || "";
        const aria = interactive.getAttribute("aria-label") || "";
        if (href.startsWith("mailto:")) return { el: interactive, mode: "send", label: "send: email" };
        if (href.startsWith("#")) return { el: interactive, mode: "link", label: `→ ${href.slice(1)}` };
        return { el: interactive, mode: "link", label: aria ? `→ ${aria.slice(0, LABEL_TEXT_MAX_LEN)}` : "→ open" };
      }
      if (interactive.type === "submit") return { el: interactive, mode: "send", label: "send →" };
      // Generic button — borrow its text.
      const text = readableText(interactive);
      return { el: interactive, mode: "link", label: text || "click" };
    }

    document.addEventListener("mouseover", (e) => {
      const info = infer(e.target);
      if (!info) {
        setMode("default", "");
        morphElCurrent = null;
        setMorphTo(null);
        if (!raf) raf = requestAnimationFrame(tick);
        return;
      }
      setMode(info.mode, info.label || LABELS[info.mode] || "");
      // Morph the ring to capture the element if it opts in.
      const deformTarget = info.el.closest("[data-magnetic], [data-cursor-deform]");
      if (deformTarget) {
        morphElCurrent = deformTarget;
        setMorphTo(deformTarget);
      } else {
        morphElCurrent = null;
        setMorphTo(null);
      }
      if (!raf) raf = requestAnimationFrame(tick);
    });
    document.addEventListener("mouseout", (e) => {
      const next = e.relatedTarget && e.relatedTarget.nodeType === 1 ? infer(e.relatedTarget) : null;
      if (!next) {
        setMode("default", "");
        morphElCurrent = null;
        setMorphTo(null);
        if (!raf) raf = requestAnimationFrame(tick);
      }
    });
  }

  // ── Magnets
  function rebuildMagnets() {
    magnets = [];
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      if (isTouch) return;
      magnets.push({ el, strength: el.hasAttribute("data-magnetic-strong") ? 0.35 : 0.22 });
    });
    if (!raf && magnets.length) raf = requestAnimationFrame(tick);
  }

  // ── Spotlight: track mouse position over .card so the CSS radial-gradient
  // (using --mx / --my) follows the cursor. Delegated, single listener.
  function bindSpotlight() {
    if (isTouch) return;
    if (window.__sc_spotlight_bound) return;
    window.__sc_spotlight_bound = true;
    document.addEventListener("mousemove", (e) => {
      const card = e.target.closest && e.target.closest(".card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", x.toFixed(1) + "%");
      card.style.setProperty("--my", y.toFixed(1) + "%");
    }, { passive: true });
  }

  // ── Reveal pipeline.
  // Scroll-listener based for maximum compatibility (headless browsers and some
  // older mobile WebKit fire IntersectionObserver inconsistently). One rAF-throttled
  // scroll handler walks the pending set and reveals elements as they enter view.
  // Hidden state uses inline !important so we don't depend on author CSS, and
  // transition:none so the browser commits the hidden state instantly.
  const REVEAL_TRANSITION =
    "opacity .85s cubic-bezier(.2,.6,.18,1), transform .85s cubic-bezier(.2,.6,.18,1)";
  const REVEAL_OFFSET_PX = 60; // reveal slightly before fully entering viewport

  const pendingReveals = new Set();
  let pendingRaf = 0;

  function isInViewport(el, offset) {
    const r = el.getBoundingClientRect();
    const o = offset || 0;
    return r.top < (window.innerHeight - o) && r.bottom > o;
  }

  function revealTarget(el) {
    el.style.transition = REVEAL_TRANSITION;
    const delay = parseFloat(el.getAttribute("data-reveal-delay") || "0");
    if (delay) el.style.transitionDelay = `${delay}s`;
    // Force a reflow so the browser sees the new transition before the value
    // change, otherwise it batches both and the animation is skipped.
    void el.offsetWidth;
    el.style.setProperty("opacity", "1", "important");
    el.style.setProperty("transform", "translateY(0)", "important");
    el.classList.add("rv-in");
  }

  function checkPending() {
    pendingRaf = 0;
    pendingReveals.forEach((el) => {
      if (isInViewport(el, REVEAL_OFFSET_PX)) {
        revealTarget(el);
        pendingReveals.delete(el);
      }
    });
  }

  function scheduleCheck() {
    if (!pendingRaf && pendingReveals.size) {
      pendingRaf = requestAnimationFrame(checkPending);
    }
  }

  // Single global listeners — wired exactly once. Also poll every 250ms as a
  // safety net for environments where scroll events don't fire (some embedded
  // webviews, headless previews, momentum-scroll on iOS in specific states).
  // Polling stops automatically when the pending set is empty.
  if (!window.__sc_reveal_wired) {
    window.__sc_reveal_wired = true;
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck, { passive: true });
    setInterval(() => { if (pendingReveals.size) scheduleCheck(); }, 250);
  }

  function bindReveals() {
    const reveal = (el) => {
      el.classList.add("rv-bound");
      if (isInViewport(el, 0)) {
        // Already on-screen — show statically (no flash, no transition).
        el.classList.add("rv-in");
        return;
      }
      // Apply hidden state with NO transition so it commits instantly.
      el.style.transition = "none";
      el.style.setProperty("opacity", "0", "important");
      el.style.setProperty("transform", "translateY(14px)", "important");
      el.style.willChange = "opacity, transform";
      pendingReveals.add(el);
    };

    document.querySelectorAll("[data-reveal]:not(.rv-bound)").forEach((el) => reveal(el));
    document.querySelectorAll("[data-reveal-words]:not(.rv-split)").forEach((el) => {
      splitWords(el);
      el.classList.add("rv-split");
      reveal(el);
    });
    document.querySelectorAll("[data-reveal-chars]:not(.rv-split)").forEach((el) => {
      splitChars(el);
      el.classList.add("rv-split");
      reveal(el);
    });

    // Fire one check after binding so anything that became visible during binding
    // (e.g. layout shifts from font loading) gets revealed promptly.
    scheduleCheck();
  }

  function splitWords(el) {
    if (reduceMotion) return;
    const walk = (node) => {
      const kids = Array.from(node.childNodes);
      for (const k of kids) {
        if (k.nodeType === 3) {
          const frag = document.createDocumentFragment();
          const words = k.textContent.split(/(\s+)/);
          let idx = 0;
          for (const w of words) {
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); continue; }
            if (!w) continue;
            const span = document.createElement("span");
            span.className = "rv-w";
            span.style.setProperty("--rv-i", idx++);
            span.textContent = w;
            frag.appendChild(span);
          }
          node.replaceChild(frag, k);
        } else if (k.nodeType === 1 && !k.classList.contains("rv-w")) {
          walk(k);
        }
      }
    };
    walk(el);
  }

  function splitChars(el) {
    if (reduceMotion) return;
    const text = el.textContent;
    el.textContent = "";
    let idx = 0;
    for (const ch of text) {
      if (ch === " ") { el.appendChild(document.createTextNode(" ")); continue; }
      const span = document.createElement("span");
      span.className = "rv-c";
      span.style.setProperty("--rv-i", idx++);
      span.textContent = ch;
      el.appendChild(span);
    }
  }

  // ── Sticky pin (one section stays in place until scroll past)
  function bindPins() {
    document.querySelectorAll("[data-pin]:not(.pin-bound)").forEach((el) => {
      el.classList.add("pin-bound");
      // Pin behaviour is pure CSS (position: sticky on inner container);
      // We also expose progress as --pin-p so children can animate.
      const inner = el.querySelector(".pin-inner");
      if (!inner) return;
      const update = () => {
        const r = el.getBoundingClientRect();
        const range = r.height - innerHeight;
        if (range <= 0) return;
        const p = Math.max(0, Math.min(1, (0 - r.top) / range));
        el.style.setProperty("--pin-p", p.toFixed(4));
      };
      window.addEventListener("scroll", update, { passive: true });
      update();
    });
  }

  // ── Public API
  window.Motion = {
    init() {
      buildCursor();
      bindHoverDelegation();
      rebuildMagnets();
      bindReveals();
      bindPins();
      bindSpotlight();
    },
    refresh() {
      rebuildMagnets();
      bindReveals();
      bindPins();
    },
    // Force-check any pending reveal — useful for tests and odd webview environments.
    checkVisible() { scheduleCheck(); },
    setLabel(text) { setMode(currentMode === "default" ? "link" : currentMode, text); },
    clearLabel() { setMode("default", ""); },
  };
})();
