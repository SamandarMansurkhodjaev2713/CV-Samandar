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

  // ── State
  const CURSOR_LERP = 0.28;        // 0..1 — higher = snappier follow
  const RING_LERP = 0.16;
  const IDLE_TIMEOUT_MS = 1800;    // ms of no movement before idle state kicks in
  let cursorEl = null, cursorDot = null, cursorRing = null, cursorH = null, cursorV = null, cursorLabelEl = null;
  let coords = { x: -100, y: -100 }, target = { x: -100, y: -100 };
  let ringScale = 1, ringScaleTarget = 1;
  let labelText = "", currentMode = "default";
  let magnets = [];
  let raf = 0;
  let lastMoveAt = 0;
  let idleTimer = 0;

  // ── Cursor build
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

    window.addEventListener("mousemove", (e) => {
      target.x = e.clientX; target.y = e.clientY;
      coordsEl.textContent = `x:${String(e.clientX).padStart(4,"0")}  y:${String(e.clientY).padStart(4,"0")}`;
      lastMoveAt = performance.now();
      if (cursorEl.classList.contains("is-idle")) cursorEl.classList.remove("is-idle");
      if (idleTimer) { window.clearTimeout(idleTimer); idleTimer = 0; }
      idleTimer = window.setTimeout(() => {
        if (cursorEl) cursorEl.classList.add("is-idle");
      }, IDLE_TIMEOUT_MS);
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    window.addEventListener("mousedown", () => cursorEl.classList.add("is-down"));
    window.addEventListener("mouseup", () => cursorEl.classList.remove("is-down"));
    document.addEventListener("mouseleave", () => cursorEl.classList.add("is-out"));
    document.addEventListener("mouseenter", () => cursorEl.classList.remove("is-out"));

    document.body.classList.add("has-smart-cursor");
  }

  function tick() {
    raf = 0;
    coords.x += (target.x - coords.x) * CURSOR_LERP;
    coords.y += (target.y - coords.y) * CURSOR_LERP;
    ringScale += (ringScaleTarget - ringScale) * RING_LERP;
    if (cursorEl) {
      cursorEl.style.transform = `translate3d(${coords.x}px, ${coords.y}px, 0)`;
      cursorRing.style.transform = `translate(-50%,-50%) scale(${ringScale})`;
    }
    // Update magnets
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
    if (Math.abs(target.x - coords.x) > 0.1 || Math.abs(target.y - coords.y) > 0.1 ||
        Math.abs(ringScaleTarget - ringScale) > 0.01 || magnets.some(m => m._wasIn)) {
      raf = requestAnimationFrame(tick);
    }
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

  // ── Hover delegation: read [data-cursor] from any ancestor.
  // Auto-detects common interactive elements (a, button, [role=button], input)
  // so callers don't need to annotate every clickable thing.
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
      input: "type",
      tab: "switch",
    };
    function infer(el) {
      if (!el) return null;
      // Walk to the nearest interactive ancestor; explicit data-cursor wins.
      const explicit = el.closest("[data-cursor]");
      if (explicit) return {
        el: explicit,
        mode: explicit.getAttribute("data-cursor"),
        label: explicit.getAttribute("data-cursor-label"),
      };
      const interactive = el.closest("a, button, [role='button'], [role='tab'], input, textarea, select, label");
      if (!interactive) return null;
      const tag = interactive.tagName.toLowerCase();
      const role = interactive.getAttribute("role");
      if (tag === "input" || tag === "textarea" || tag === "select") {
        return { el: interactive, mode: "input", label: "type" };
      }
      if (role === "tab") return { el: interactive, mode: "tab", label: "switch" };
      if (tag === "a") {
        const href = interactive.getAttribute("href") || "";
        if (href.startsWith("mailto:")) return { el: interactive, mode: "send", label: "send: email" };
        if (href.startsWith("#")) return { el: interactive, mode: "link", label: `→ ${href.slice(1)}` };
        return { el: interactive, mode: "link", label: "→ open" };
      }
      // Submit-like buttons get the "send" cursor.
      if (interactive.type === "submit") return { el: interactive, mode: "send", label: "send →" };
      return { el: interactive, mode: "link", label: "click" };
    }

    document.addEventListener("mouseover", (e) => {
      const info = infer(e.target);
      if (!info) { setMode("default", ""); return; }
      setMode(info.mode, info.label || LABELS[info.mode] || "");
    });
    document.addEventListener("mouseout", (e) => {
      const next = e.relatedTarget && e.relatedTarget.nodeType === 1 ? infer(e.relatedTarget) : null;
      if (!next) setMode("default", "");
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
