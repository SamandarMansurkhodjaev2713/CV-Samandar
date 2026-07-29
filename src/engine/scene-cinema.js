// scene-cinema.js — View Transitions API integration for nav-anchored
// section navigation. Native cross-fade + blur between sections when the
// user clicks a nav link, giving the page a "film cut" feel.
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// Plain `scrollIntoView({behavior:'smooth'})` is functional but flat — every
// nav click looks the same. The 2025-baseline View Transitions API
// (Chrome 111+, Edge 111+, Safari 18+, Firefox 138+) lets us cross-fade
// between section "shots" by:
//   1. snapshotting the current viewport,
//   2. running a sync callback (instant scroll + state mutation),
//   3. snapshotting the new viewport,
//   4. cross-fading both via auto-generated CSS animations.
//
// We intercept clicks on `a[href^="#"]` (excluding `#`), and on `popstate`,
// to drive the transition. Existing `IntersectionObserver` listeners in
// `app.jsx` (`useScrollEngine`) keep working — they only react to actual
// scroll, which still happens inside our VT callback.
//
// BROWSER SUPPORT
// ─────────────────────────────────────────────────────────────────────────────
// `'startViewTransition' in document` → progressive enhancement. Older
// browsers fall back to native smooth-scroll. `prefers-reduced-motion: reduce`
// users skip the transition entirely (instant jump).
//
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
//   window.SceneCinema.init()       → bind global click + popstate handlers
//   window.SceneCinema.dispose()    → unbind handlers, cancel active VT
//   window.SceneCinema.navigate(id) → trigger a transition programmatically
//   window.SceneCinema.isSupported  → boolean, true if VT API present
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";
  if (window.__SM_TEST_MODE) return;

  // ── Configuration ──────────────────────────────────────────────────────
  // Time between accepted nav clicks. Below this we drop subsequent clicks
  // so a fast double-tap doesn't queue two transitions (which the API
  // serialises but visually looks janky).
  const NAV_DEBOUNCE_MS = 220;

  // Cooldown after a transition completes before the next one starts. Keeps
  // the page from looking strobed if the user clicks every nav link in a row.
  const POST_TRANSITION_COOLDOWN_MS = 120;

  // CSS class added to <html> while a transition is running. Lets stylesheets
  // pin-and-disable any rAF-driven backgrounds (bg-fx, etc.) for a clean shot.
  const ACTIVE_CLASS = "is-cinema-transitioning";

  // Marker we add to <body> so CSS can use [data-active-section="X"] for
  // section-keyed view-transition-name pairs.
  const BODY_SECTION_ATTR = "data-active-section";

  // The reduced-motion media query — we cache the MediaQueryList so we can
  // both read it synchronously and listen for changes.
  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

  // ── State ──────────────────────────────────────────────────────────────
  const supportsVT = typeof document !== "undefined" && typeof document.startViewTransition === "function";
  const motionMedia = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia(MEDIA_REDUCED_MOTION)
    : { matches: false, addEventListener: function () {}, removeEventListener: function () {} };

  let lastNavAt = 0;
  let activeTransition = null;
  let bound = false;
  let clickHandler = null;
  let popHandler = null;
  let motionListener = null;

  // ── Helpers ────────────────────────────────────────────────────────────
  function shouldSkipMotion() {
    return motionMedia.matches === true;
  }

  function getSectionId(hashOrId) {
    if (!hashOrId) return null;
    const id = hashOrId.charAt(0) === "#" ? hashOrId.slice(1) : hashOrId;
    return id || null;
  }

  function resolveTarget(id) {
    if (!id) return null;
    try {
      return document.getElementById(id);
    } catch (err) {
      console.warn("[SceneCinema] resolveTarget failed for id=", id, err);
      return null;
    }
  }

  /**
   * Hard-instant scroll to a target element. The project's CSS sets
   * `html { scroll-behavior: smooth }` which would make `behavior:'auto'`
   * resolve to smooth and defeat View Transitions capture (the cross-fade
   * needs the scroll to land *before* the VT API snapshots the "new"
   * frame). We temporarily override the inline style for the duration of
   * the scroll, then restore. `behavior:'instant'` is the spec keyword
   * for force-instant scrolls and is supported in Chrome 80+, Firefox
   * 109+, Safari 15.4+ — the same baseline as VT itself.
   * @param {HTMLElement} el
   */
  function instantScrollIntoView(el) {
    if (!el || typeof el.scrollIntoView !== "function") return;
    const htmlEl = document.documentElement;
    const prevBehavior = htmlEl.style.scrollBehavior;
    htmlEl.style.scrollBehavior = "auto";
    try {
      // Prefer the explicit "instant" keyword; fall back to "auto" (now safe
      // because we just overrode the CSS).
      el.scrollIntoView({ behavior: "instant", block: "start", inline: "nearest" });
    } catch (err) {
      // Older Safari may not accept "instant" — auto + the inline override
      // above gets us the same effect.
      try { el.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" }); }
      catch (err2) { console.warn("[SceneCinema] instantScrollIntoView fallback failed:", err2 && err2.message); }
    } finally {
      htmlEl.style.scrollBehavior = prevBehavior;
    }
  }

  /**
   * Trigger a View Transitions–driven navigation. Falls back to native
   * smooth scroll if VT is unsupported or motion is reduced. Idempotent
   * when called twice in rapid succession (returns early on debounce).
   * @param {string} id  Section id (without the `#`)
   * @returns {Promise<void>}
   */
  function navigate(id) {
    const target = resolveTarget(id);
    if (!target) return Promise.resolve();

    const now = Date.now();
    if (now - lastNavAt < NAV_DEBOUNCE_MS) return Promise.resolve();
    lastNavAt = now;

    // Always reflect the chosen section in the URL so deep links work.
    try {
      if (window.location.hash !== "#" + id) {
        history.pushState({ section: id }, "", "#" + id);
      }
    } catch (err) {
      // Some sandboxed contexts forbid history mutations; fine to ignore.
      console.warn("[SceneCinema] history.pushState refused:", err && err.message);
    }

    // Fallback path: no VT, or user wants reduced motion.
    if (!supportsVT || shouldSkipMotion()) {
      const behavior = shouldSkipMotion() ? "auto" : "smooth";
      try {
        target.scrollIntoView({ behavior: behavior, block: "start", inline: "nearest" });
      } catch (err) {
        console.warn("[SceneCinema] scrollIntoView fallback failed:", err && err.message);
      }
      document.body.setAttribute(BODY_SECTION_ATTR, id);
      return Promise.resolve();
    }

    // Cancel any in-flight transition so the new one starts immediately.
    if (activeTransition && typeof activeTransition.skipTransition === "function") {
      try { activeTransition.skipTransition(); }
      catch (err) { console.warn("[SceneCinema] skipTransition failed:", err && err.message); }
    }

    document.documentElement.classList.add(ACTIVE_CLASS);
    try { window.dispatchEvent(new CustomEvent("sm:cinema-start")); } catch (eventErr) { /* optional */ }

    const transition = document.startViewTransition(function applyMutation() {
      // Inside the callback all DOM mutations are synchronous. The browser
      // captures the OLD state just before this runs, then the NEW state
      // right after — so the scroll position change becomes the "cut".
      instantScrollIntoView(target);
      document.body.setAttribute(BODY_SECTION_ATTR, id);
    });
    activeTransition = transition;

    // When the cross-fade ends, drop the marker class. `finished` resolves
    // after the animation phase; `ready` resolves earlier (after capture).
    return transition.finished
      .catch(function onTransitionError(err) {
        // VT can reject when interrupted by another startViewTransition; that
        // is not an error condition for us — but unexpected rejects are.
        console.warn("[SceneCinema] transition rejected:", err && err.message);
      })
      .then(function onTransitionDone() {
        if (activeTransition === transition) {
          activeTransition = null;
          document.documentElement.classList.remove(ACTIVE_CLASS);
          try { window.dispatchEvent(new CustomEvent("sm:cinema-done")); } catch (eventErr) { /* optional */ }
        }
        // Hold a short cooldown so the next click doesn't immediately start
        // another transition mid-frame — feels less strobed.
        return new Promise(function (resolve) {
          window.setTimeout(resolve, POST_TRANSITION_COOLDOWN_MS);
        });
      });
  }

  // ── Event handlers ─────────────────────────────────────────────────────
  function onAnchorClick(event) {
    // Respect modifier-clicks (open in new tab, etc.) and non-primary buttons.
    if (event.defaultPrevented) return;
    if (event.button != null && event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    if (href.length < 2 || href.charAt(0) !== "#") return;

    const id = getSectionId(href);
    if (!id) return;
    const target = resolveTarget(id);
    if (!target) return;

    event.preventDefault();
    navigate(id);
  }

  function onPopState(event) {
    // Browser back/forward: animate to the new hash section.
    const id = getSectionId(window.location.hash);
    if (!id) return;
    if (!resolveTarget(id)) return;
    // popstate is implicit — no new history entry. Bypass the pushState in
    // navigate() by calling the same animated path but without adding history.
    if (shouldSkipMotion() || !supportsVT) {
      const target = resolveTarget(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      document.body.setAttribute(BODY_SECTION_ATTR, id);
      return;
    }
    if (activeTransition && typeof activeTransition.skipTransition === "function") {
      try { activeTransition.skipTransition(); }
      catch (err) { console.warn("[SceneCinema] popstate skip failed:", err && err.message); }
    }
    document.documentElement.classList.add(ACTIVE_CLASS);
    try { window.dispatchEvent(new CustomEvent("sm:cinema-start")); } catch (eventErr) { /* optional */ }
    const transition = document.startViewTransition(function () {
      const target = resolveTarget(id);
      if (target) instantScrollIntoView(target);
      document.body.setAttribute(BODY_SECTION_ATTR, id);
    });
    activeTransition = transition;
    transition.finished
      .catch(function (err) { console.warn("[SceneCinema] popstate transition rejected:", err && err.message); })
      .then(function () {
        if (activeTransition === transition) {
          activeTransition = null;
          document.documentElement.classList.remove(ACTIVE_CLASS);
          try { window.dispatchEvent(new CustomEvent("sm:cinema-done")); } catch (eventErr) { /* optional */ }
        }
      });
  }

  function onMotionChange() {
    // No state to update — the navigate() function re-reads the media query
    // on each call. This handler exists to clear any in-flight transition
    // if the user toggles reduced-motion mid-transition.
    if (motionMedia.matches && activeTransition && typeof activeTransition.skipTransition === "function") {
      try { activeTransition.skipTransition(); }
      catch (err) { console.warn("[SceneCinema] motion change skip failed:", err && err.message); }
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────
  /**
   * Wire up the global click + popstate listeners. Safe to call multiple
   * times — re-binding is a no-op.
   */
  function init() {
    if (bound) return;
    bound = true;
    clickHandler = onAnchorClick;
    popHandler = onPopState;
    motionListener = onMotionChange;
    // Bubble phase is intentional: React handlers get first refusal. If a
    // component already called preventDefault() and delegated to navigate(),
    // onAnchorClick exits via event.defaultPrevented, so one click can never
    // start two competing scroll/transition transactions.
    document.addEventListener("click", clickHandler, false);
    window.addEventListener("popstate", popHandler);
    if (motionMedia.addEventListener) motionMedia.addEventListener("change", motionListener);
    else if (motionMedia.addListener) motionMedia.addListener(motionListener);

    // Set initial active-section marker based on the current URL hash, so
    // CSS rules keyed on `body[data-active-section]` don't see undefined.
    const initialId = getSectionId(window.location.hash) || "hero";
    document.body.setAttribute(BODY_SECTION_ATTR, initialId);
  }

  function dispose() {
    if (!bound) return;
    bound = false;
    if (clickHandler) document.removeEventListener("click", clickHandler, false);
    if (popHandler) window.removeEventListener("popstate", popHandler);
    if (motionListener) {
      if (motionMedia.removeEventListener) motionMedia.removeEventListener("change", motionListener);
      else if (motionMedia.removeListener) motionMedia.removeListener(motionListener);
    }
    clickHandler = null;
    popHandler = null;
    motionListener = null;
    const wasTransitioning = !!activeTransition || document.documentElement.classList.contains(ACTIVE_CLASS);
    if (activeTransition && typeof activeTransition.skipTransition === "function") {
      try { activeTransition.skipTransition(); }
      catch (err) { console.warn("[SceneCinema] dispose skip failed:", err && err.message); }
    }
    activeTransition = null;
    document.documentElement.classList.remove(ACTIVE_CLASS);
    // Consumers pause expensive rendering on cinema-start. Always balance that
    // event if teardown interrupts the transition, otherwise a remount can
    // inherit a permanently paused background or robot.
    if (wasTransitioning) {
      try { window.dispatchEvent(new CustomEvent("sm:cinema-done")); } catch (eventErr) { /* optional */ }
    }
  }

  window.SceneCinema = {
    init: init,
    dispose: dispose,
    navigate: navigate,
    isSupported: supportsVT,
  };
})();
