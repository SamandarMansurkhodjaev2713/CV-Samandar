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
      target: "◎ explore",
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
  // Flick-scroll variant. During a fast scroll the reader outruns an .85s fade,
  // so content lands already-scrolled-past and reads as "the text didn't load".
  // Same easing, ~4x quicker, no stagger delay — the designed motion is intact
  // at reading speed and simply gets out of the way when nobody can see it.
  const REVEAL_TRANSITION_FAST =
    "opacity .22s cubic-bezier(.2,.6,.18,1), transform .22s cubic-bezier(.2,.6,.18,1)";
  const REVEAL_OFFSET_PX = 220; // start the reveal well before the element is on screen

  // ── Scroll velocity, sampled on a cheap passive listener (two reads + some
  // arithmetic; no layout is touched). Feeds the fast-path decision above.
  const FAST_SCROLL_PX_PER_MS = 1.6; // ≈ a deliberate flick, not normal reading
  let velLastY = window.pageYOffset || 0;
  let velLastT = 0;
  let scrollVel = 0;
  function sampleScrollVelocity() {
    const now = (window.performance && performance.now) ? performance.now() : Date.now();
    const y = window.pageYOffset || 0;
    const dt = now - velLastT;
    if (velLastT && dt > 0) {
      // Light smoothing so a single jumpy frame can't flip the mode.
      scrollVel = scrollVel * 0.6 + (Math.abs(y - velLastY) / dt) * 0.4;
    }
    velLastY = y;
    velLastT = now;
  }
  function isFastScroll() { return scrollVel > FAST_SCROLL_PX_PER_MS; }
  window.addEventListener("scroll", sampleScrollVelocity, { passive: true });

  const pendingReveals = new Set();
  let pendingRaf = 0;

  function isInViewport(el, offset) {
    const r = el.getBoundingClientRect();
    const o = offset || 0;
    return r.top < (window.innerHeight - o) && r.bottom > o;
  }

  function revealTarget(el) {
    // Flick-scrolling → snap it in. Also drop the authored stagger delay: a
    // 0.15s head start is a nice beat while reading and pure latency mid-flick.
    const fast = isFastScroll();
    // Promote only when the element is actually entering the viewport. The
    // previous eager promotion kept dozens of off-screen layers alive across
    // the 17k-pixel page and spent GPU memory for no visible benefit.
    el.style.willChange = "opacity, transform";
    el.style.transition = fast ? REVEAL_TRANSITION_FAST : REVEAL_TRANSITION;
    const delay = fast ? 0 : parseFloat(el.getAttribute("data-reveal-delay") || "0");
    if (delay) el.style.transitionDelay = `${delay}s`;
    // Force a reflow so the browser sees the new transition before the value
    // change, otherwise it batches both and the animation is skipped.
    void el.offsetWidth;
    el.style.setProperty("opacity", "1", "important");
    // Final pose is always the natural rest position (transform: none) — this
    // is where any directional/scaled `data-reveal-from` start pose resolves to.
    el.style.setProperty("transform", "none", "important");
    el.classList.add("rv-in");
    // Once the reveal transition finishes, hand styling control back to CSS:
    // strip the inline opacity/transform/transition/will-change so elements
    // that ALSO use the `transform` property for interaction (card tilt,
    // spotlight hover, the CV role hover) work again. We only do this AFTER
    // the reveal completes, so there's no mid-reveal flicker. transitionend
    // fires per-property; a timeout fallback covers interrupted/zero-duration
    // transitions and detached nodes.
    let cleaned = false;
    const cleanup = function () {
      if (cleaned) return;
      cleaned = true;
      el.removeEventListener("transitionend", onEnd);
      el.style.removeProperty("transition");
      el.style.removeProperty("transition-delay");
      el.style.removeProperty("opacity");
      el.style.removeProperty("transform");
      el.style.willChange = "auto";
    };
    function onEnd(e) {
      if (e.target === el && (e.propertyName === "transform" || e.propertyName === "opacity")) cleanup();
    }
    el.addEventListener("transitionend", onEnd);
    window.setTimeout(cleanup, 1200 + delay * 1000);
  }

  // Reveal an element that has entered view. Idempotent: whichever trigger
  // fires first (IntersectionObserver OR the scroll/poll fallback) wins, and
  // the other is a no-op. Word/char staggers animate purely through CSS
  // (`[data-reveal-words].rv-in .rv-w`), so for those we ONLY add `.rv-in` and
  // leave the per-word transition delays intact. Block reveals go through
  // revealTarget so each keeps its own `data-reveal-from` direction. Always
  // detaches the element from BOTH trackers so it never reveals twice.
  function triggerReveal(el) {
    if (el.classList.contains("rv-in")) { pendingReveals.delete(el); return; }
    if (el.hasAttribute("data-reveal-words") || el.hasAttribute("data-reveal-chars")) {
      // Per-word/char delays are CSS-driven (calc(var(--rv-i) * 36ms)), so a
      // long heading's last word can land ~1s late — invisible mid-flick.
      // `.rv-fast` collapses the stagger to a single quick pass (see cursor.css).
      if (isFastScroll()) el.classList.add("rv-fast");
      el.classList.add("rv-in");
    } else {
      revealTarget(el);
    }
    pendingReveals.delete(el);
    if (revealIO) revealIO.unobserve(el);
  }

  function checkPending() {
    pendingRaf = 0;
    pendingReveals.forEach((el) => {
      if (isInViewport(el, REVEAL_OFFSET_PX)) triggerReveal(el);
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
    // Poll calls checkPending DIRECTLY (not via scheduleCheck/rAF): in a
    // backgrounded or non-presented tab rAF can be throttled to ~0, which would
    // strand the rAF path — but setInterval still fires (clamped to ~1s). This
    // is the last-resort net under IntersectionObserver + the scroll listener.
    setInterval(() => { if (pendingReveals.size) checkPending(); }, 250);
  }

  // Reveal trigger — IntersectionObserver (primary) + scroll/poll (fallback).
  //
  // IO fires reliably on EVERY browser and its effect is plainly inspectable
  // (the `.rv-in` class + the inline transition revealTarget sets). It replaces
  // the native `animation-timeline: view()` approach, which is elegant but
  // silently no-ops if the engine never samples it — a failure mode that's
  // invisible to test tooling and bit us repeatedly. When IO is unavailable we
  // fall back to the rAF-throttled scroll listener + 250ms poll wired above.
  const revealIO = ("IntersectionObserver" in window)
    ? new IntersectionObserver(function (entries, obs) {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          triggerReveal(e.target);
          pendingReveals.delete(e.target);
          obs.unobserve(e.target);
        }
        // Pre-trigger: the old `-8%` bottom inset meant an element had to be
        // 8% INTO the viewport before its .85s fade even started, so at speed
        // it was still fading when it left again. A positive bottom margin
        // starts the reveal ~300px BEFORE the element scrolls into view, so it
        // is already settled by the time it is actually looked at.
      }, { rootMargin: "0px 0px 300px 0px", threshold: 0.01 })
    : null;

  function bindReveals() {
    // Arm an element to reveal on enter. `isStagger` elements (words/chars)
    // hide via their own .rv-w/.rv-c CSS, so we DON'T add an inline block-hide
    // for them — only [data-reveal] blocks get the inline `data-reveal-from`
    // start pose (which is what gives each its own direction).
    const bind = (el, isStagger) => {
      el.classList.add("rv-bound");
      // Reduced-motion OR already on-screen at bind → show immediately. Keeps
      // LCP text instant and never leaves the hero stuck hidden. (Reduced-motion
      // must not leave an off-screen !important transform inline — CSS can't
      // override inline !important.)
      if (reduceMotion || isInViewport(el, 0)) {
        el.classList.add("rv-in");
        return;
      }
      if (!isStagger) {
        // Hidden start pose, committed with NO transition so it paints instantly.
        el.style.transition = "none";
        el.style.setProperty("opacity", "0", "important");
        el.style.setProperty("transform", el.dataset.revealFrom || "translateY(48px) scale(.965)", "important");
      }
      // Register with BOTH triggers — IntersectionObserver (primary, precise)
      // and the scroll/poll set (fallback). triggerReveal is idempotent, so the
      // first to fire reveals and detaches from the other.
      if (revealIO) revealIO.observe(el);
      pendingReveals.add(el);
    };

    document.querySelectorAll("[data-reveal]:not(.rv-bound)").forEach((el) => bind(el, false));
    document.querySelectorAll("[data-reveal-words]:not(.rv-split)").forEach((el) => {
      if (!reduceMotion) { splitWords(el); el.classList.add("rv-split"); }
      bind(el, true);
    });
    document.querySelectorAll("[data-reveal-chars]:not(.rv-split)").forEach((el) => {
      if (!reduceMotion) { splitChars(el); el.classList.add("rv-split"); }
      bind(el, true);
    });

    // Fire one check so anything already in view via the scroll/poll fallback
    // (no-IO browsers) reveals promptly.
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

  // ── Scroll-progress pins — depth-handoff between two stacked sections.
  // Each [data-pin] host exposes `--pin-p` (0→1) as it scrolls through the
  // viewport; CSS uses it to recede the outgoing section and raise the
  // incoming one (transform/opacity only — NO sticky, so it's immune to the
  // `body{overflow-x:hidden}` scroll-container hazard).
  //
  // Perf-critical: ONE rAF-throttled global listener for ALL hosts, batched
  // read-then-write (all getBoundingClientRect reads first, then all style
  // writes) so we never interleave layout reads/writes per scroll event.
  // This is the guard against re-introducing the scroll jank fixed in v57.
  const pinHosts = [];
  let pinRaf = 0;
  function updatePins() {
    pinRaf = 0;
    const vh = window.innerHeight || 1;
    const progress = [];
    // Read phase — gather every rect before touching styles.
    for (let i = 0; i < pinHosts.length; i++) {
      const r = pinHosts[i].getBoundingClientRect();
      const range = r.height - vh;
      progress[i] = range > 0 ? Math.max(0, Math.min(1, (0 - r.top) / range)) : 0;
    }
    // Write phase. (Only Services→CV / Trust→Contact are driven from here now —
    // the Hero→Signal pair moved to native position:sticky, so its host no
    // longer carries data-pin and never reaches this loop.)
    for (let i = 0; i < pinHosts.length; i++) {
      pinHosts[i].style.setProperty("--pin-p", progress[i].toFixed(4));
    }
  }
  function schedulePins() {
    if (!pinRaf && pinHosts.length) pinRaf = requestAnimationFrame(updatePins);
  }
  function bindPins() {
    document.querySelectorAll("[data-pin]:not(.pin-bound)").forEach((el) => {
      el.classList.add("pin-bound");
      pinHosts.push(el);
    });
    if (pinHosts.length && !window.__sc_pins_wired) {
      window.__sc_pins_wired = true;
      window.addEventListener("scroll", schedulePins, { passive: true });
      window.addEventListener("resize", schedulePins, { passive: true });
    }
    schedulePins();
  }

  // ── Section entrance choreography ("каждая по-своему").
  // Each <section data-enter="..."> gets a one-shot signature envelope when it
  // first scrolls into view. A SEPARATE IntersectionObserver (sibling of the
  // reveal IO — never touches the reveal/pin pipelines) adds `.sec-in`; CSS
  // (cursor.css) maps the data-enter value → a GPU-only keyframe. Reduced-motion
  // OR already-on-screen at bind → reveal instantly (LCP-safe, no flash).
  // A direct-call scroll/poll fallback mirrors the reveal net so a headless tab
  // (innerHeight 0 + IO suspended) can't strand a section hidden. Verifiable:
  // correctness == presence of `.sec-in` (a synchronous DOM read).
  const pendingSectionEnters = new Set();
  function enterSection(el) {
    if (el.classList.contains("sec-in")) { pendingSectionEnters.delete(el); return; }
    el.classList.add("sec-in");
    pendingSectionEnters.delete(el);
    if (sectionEnterIO) sectionEnterIO.unobserve(el);
  }
  const sectionEnterIO = ("IntersectionObserver" in window)
    ? new IntersectionObserver(function (entries) {
        for (const e of entries) { if (e.isIntersecting) enterSection(e.target); }
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 })
    : null;
  function checkPendingSections() {
    pendingSectionEnters.forEach(function (el) {
      if (isInViewport(el, REVEAL_OFFSET_PX)) enterSection(el);
    });
  }
  function bindSectionEnters() {
    document.querySelectorAll("section[data-enter]:not(.sec-bound)").forEach(function (el) {
      el.classList.add("sec-bound");
      if (reduceMotion || isInViewport(el, 0)) { el.classList.add("sec-in"); return; }
      if (sectionEnterIO) sectionEnterIO.observe(el);
      pendingSectionEnters.add(el);   // poll fallback
    });
    if (pendingSectionEnters.size && !window.__sc_secenter_wired) {
      window.__sc_secenter_wired = true;
      window.addEventListener("scroll", checkPendingSections, { passive: true });
      window.addEventListener("resize", checkPendingSections, { passive: true });
      // Direct call (not rAF) so a throttled/hidden tab still resolves sections.
      setInterval(function () { if (pendingSectionEnters.size) checkPendingSections(); }, 250);
    }
  }

  // ── Public API
  // ── Parallax drift (stage 4). Elements carrying data-plx="0.05" get a CSS
  // var --plx proportional to their offset from the viewport centre; the
  // companion rule `[data-plx] { transform: translate3d(0, var(--plx), 0) }`
  // applies it. One rAF-throttled handler; elements are re-queried per frame
  // (11 nodes — cheaper than keeping a cache coherent across React re-renders,
  // which detach nodes on language switches). Reveal's inline transform wins
  // while an element is still entering; once reveal cleans itself up the
  // parallax rule takes over seamlessly.
  // ── Centre-stage (stage 6, touch only). Hover is dead on phones, so the
  // feed breathes a different way: the card passing through the middle band
  // of the viewport carries .in-focus — light, status, depth — and hands it
  // to the next card as you scroll. IntersectionObserver with a symmetric
  // ±38% inset ≈ "the middle 24% of the screen".
  function initCenterStage() {
    let coarse = false;
    try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (e) { /* opportunistic */ }
    if (!coarse || reduceMotion || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(function (entries) {
      for (const e of entries) e.target.classList.toggle("in-focus", e.isIntersecting);
    }, { rootMargin: "-38% 0px -38% 0px", threshold: 0 });
    function bind() {
      document.querySelectorAll(".proj-card:not(.cs-bound)").forEach(function (el) {
        el.classList.add("cs-bound");
        io.observe(el);
      });
    }
    bind();
    // Language re-renders replace the cards — re-bind opportunistically.
    window.addEventListener("sm:section", bind);
  }

  let plxFrame = null; // exposed via Motion.plxTick() — headless verification + manual kicks
  function initParallax() {
    if (reduceMotion) return;
    let raf = 0;
    function frame() {
      raf = 0;
      const vh = window.innerHeight;
      const els = document.querySelectorAll("[data-plx]");
      for (let i = 0; i < els.length; i++) {
        const el = els[i];
        const r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) continue;
        const speed = parseFloat(el.getAttribute("data-plx")) || 0.05;
        const fromCentre = r.top + r.height / 2 - vh / 2;
        el.style.setProperty("--plx", (-fromCentre * speed).toFixed(1) + "px");
      }
    }
    window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
    window.addEventListener("resize", function () { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
    plxFrame = frame;
    frame();
  }

  window.Motion = {
    init() {
      buildCursor();
      bindHoverDelegation();
      rebuildMagnets();
      bindReveals();
      bindSectionEnters();
      bindPins();
      bindSpotlight();
      initParallax();
      initCenterStage();
    },
    refresh() {
      rebuildMagnets();
      bindReveals();
      bindSectionEnters();
      bindPins();
    },
    // Force-check any pending reveal — useful for tests and odd webview environments.
    checkVisible() { scheduleCheck(); },
    // Synchronous parallax pass — same rationale (headless rAF is frozen).
    plxTick() { if (plxFrame) plxFrame(); },
    setLabel(text) { setMode(currentMode === "default" ? "link" : currentMode, text); },
    clearLabel() { setMode("default", ""); },
  };
})();
