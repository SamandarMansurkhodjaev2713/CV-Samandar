// glide.js — inertial scrolling.
//
// The single cheapest thing that makes a site feel expensive: the wheel stops
// stepping the page and starts *carrying* it. One notch nudges a target, and
// the page eases toward that target over a few frames instead of jumping.
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS DRIVES REAL SCROLL, NOT A TRANSFORM
// ─────────────────────────────────────────────────────────────────────────────
// The usual implementation (Lenis and friends) translates a wrapper element and
// leaves the document itself unscrolled. That is smooth, but it BREAKS
// `position: sticky` — and sticky is the whole architecture of this page: the
// hero pins while the plates slide over it. A transform-based smoother would
// silently kill the site's structure.
//
// So this moves the REAL scroll position with `scrollTo` every frame. Sticky,
// IntersectionObserver, scroll-margin, the URL hash, native find-in-page and
// the scrollbar all keep working exactly as they do without it, because from
// the browser's point of view nothing unusual is happening — the page is just
// being scrolled very smoothly.
//
// Deliberately NOT active for:
//   • touch — native momentum is better than anything emulated, always
//   • reduced-motion — this is motion, and it was declined
//   • keyboard/space/page-keys — those must stay instant and predictable
// ════════════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var fine = false, reduced = false;
  try {
    fine = window.matchMedia("(pointer: fine)").matches;
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { /* opportunistic */ }
  if (!fine || reduced) return;

  var EASE = 0.115;        // per-frame approach — the "weight" of the page
  var WHEEL_GAIN = 1.05;   // slightly over 1 so a notch travels a familiar distance
  var SETTLE_PX = 0.6;     // below this we snap and stop the loop
  var MAX_STEP = 240;      // clamp one wheel event, so a trackpad flick can't launch the page

  var target = window.pageYOffset || 0;
  var raf = 0;
  var gliding = false;

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    gliding = false;
    document.documentElement.classList.remove("is-gliding");
  }

  function frame() {
    raf = 0;
    var current = window.pageYOffset || 0;
    var delta = target - current;

    if (Math.abs(delta) < SETTLE_PX) {
      window.scrollTo(0, target);
      stop();
      return;
    }
    window.scrollTo(0, current + delta * EASE);
    raf = requestAnimationFrame(frame);
  }

  function onWheel(e) {
    // Never fight a real gesture: pinch-zoom, horizontal intent, or a scroll
    // inside something that scrolls on its own (the project carousel, the
    // landing diagrams, the fullscreen menu).
    if (e.ctrlKey || e.defaultPrevented) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (scrollableAncestor(e.target)) return;
    // deltaMode 1 = lines, 2 = pages — normalise to pixels.
    var d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
    d = Math.max(-MAX_STEP, Math.min(MAX_STEP, d)) * WHEEL_GAIN;

    e.preventDefault();
    // Re-seed from the live position when starting: otherwise a native scroll
    // (scrollbar drag, anchor jump, find-in-page) would be yanked back.
    if (!gliding) target = window.pageYOffset || 0;
    target = Math.max(0, Math.min(maxScroll(), target + d));
    if (!gliding) {
      gliding = true;
      document.documentElement.classList.add("is-gliding");
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  // Walk up looking for an element that can consume this wheel itself.
  function scrollableAncestor(node) {
    while (node && node !== document.body && node.nodeType === 1) {
      var s;
      try { s = getComputedStyle(node); } catch (e) { return false; }
      var oy = s.overflowY, ox = s.overflowX;
      if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight + 1) return true;
      if ((ox === "auto" || ox === "scroll") && node.scrollWidth > node.clientWidth + 1) return true;
      node = node.parentElement;
    }
    return false;
  }

  window.addEventListener("wheel", onWheel, { passive: false });

  // Anything that moves the page by other means takes over cleanly.
  ["keydown", "touchstart", "pointerdown"].forEach(function (ev) {
    window.addEventListener(ev, stop, { passive: true });
  });
  window.addEventListener("resize", stop, { passive: true });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });

  window.__SM_GLIDE = {
    active: function () { return gliding; },
    stop: stop,
    // Test hook: nudge without synthesising a wheel event.
    nudge: function (px) {
      target = Math.max(0, Math.min(maxScroll(), (window.pageYOffset || 0) + px));
      gliding = true;
      if (!raf) raf = requestAnimationFrame(frame);
    },
  };
})();
