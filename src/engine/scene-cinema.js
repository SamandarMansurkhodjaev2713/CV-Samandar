// scene-cinema.js — interruptible navigation transactions for section cuts.
//
// Every accepted intent wins. A newer intent cancels the previous transition,
// lands on its own target and owns the URL. Every sm:cinema-start has exactly
// one sm:cinema-done, including rejection, background-tab, timeout and dispose.
(function () {
  "use strict";
  if (window.__SM_TEST_MODE) return;

  var ACTIVE_CLASS = "is-cinema-transitioning";
  var BODY_SECTION_ATTR = "data-active-section";
  var HARD_TIMEOUT_MS = 1800;
  var supportsVT = typeof document.startViewTransition === "function";
  var policy = window.__SM_MOTION_POLICY || window.__SM_PERF || null;
  var runtime = window.__SM_MOTION_RUNTIME || null;
  var active = null;
  var sequence = 0;
  var bound = false;
  var unsubscribePolicy = function () {};

  function reducedMotion() {
    if (policy && typeof policy.getState === "function") return !!policy.getState().reducedMotion;
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (error) { return false; }
  }

  function limitedMotion() {
    if (!policy || typeof policy.getState !== "function") return false;
    var state = policy.getState();
    return state.tier === "low" || state.saveData;
  }

  function performanceCut(target, id) {
    document.documentElement.classList.add("is-flying");
    instantScroll(target);
    setActiveSection(id);
    window.setTimeout(function () {
      document.documentElement.classList.remove("is-flying");
    }, 240);
  }

  function sectionId(value) {
    if (!value) return null;
    var id = String(value).charAt(0) === "#" ? String(value).slice(1) : String(value);
    try { return decodeURIComponent(id) || null; }
    catch (error) { return id || null; }
  }

  function targetFor(id) {
    return id ? document.getElementById(id) : null;
  }

  function setActiveSection(id) {
    if (document.body) document.body.setAttribute(BODY_SECTION_ATTR, id);
  }

  function instantScroll(target) {
    if (!target || typeof target.scrollIntoView !== "function") return;
    var previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    try {
      target.scrollIntoView({ behavior: "instant", block: "start", inline: "nearest" });
    } catch (error) {
      try { target.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" }); }
      catch (fallbackError) { /* URL and active marker still remain correct */ }
    } finally {
      document.documentElement.style.scrollBehavior = previous;
    }
  }

  function fallbackScroll(target, reduced) {
    if (reduced) {
      instantScroll(target);
      return;
    }
    try { target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" }); }
    catch (error) { instantScroll(target); }
  }

  function updateHistory(id, mode) {
    if (mode === "none") return;
    var hash = "#" + encodeURIComponent(id);
    if (window.location.hash === hash) return;
    try {
      if (mode === "replace") history.replaceState({ section: id }, "", hash);
      else history.pushState({ section: id }, "", hash);
    } catch (error) {
      // Sandboxed previews can reject history writes. Navigation still works.
    }
  }

  function emit(type, transaction, reason) {
    try {
      window.dispatchEvent(new CustomEvent(type, {
        detail: {
          token: transaction.token,
          id: transaction.id,
          source: transaction.source,
          reason: reason || null,
        },
      }));
    } catch (error) { /* optional event channel */ }
  }

  function skipNative(transaction) {
    var transition = transaction && transaction.transition;
    if (transition && typeof transition.skipTransition === "function") {
      try { transition.skipTransition(); } catch (error) { /* already settled */ }
    }
  }

  // `skipTransition()` is the normal interruption path when a newer navigation
  // intent wins. Chromium rejects the auxiliary `ready` lifecycle promise with
  // AbortError in that case even though `finished` is handled below. Observe the
  // auxiliary promises as well so an expected cancellation never leaks into the
  // console as an unhandled rejection.
  function observeNativeLifecycle(transition) {
    if (!transition) return;
    [transition.ready, transition.updateCallbackDone].forEach(function (promise) {
      if (promise && typeof promise.catch === "function") {
        promise.catch(function () { /* completion/recovery is owned by finished */ });
      }
    });
  }

  function finish(transaction, reason) {
    if (!transaction || transaction.finished) return;
    transaction.finished = true;
    if (transaction.timer) clearTimeout(transaction.timer);
    transaction.timer = 0;
    if (active === transaction) {
      active = null;
      document.documentElement.classList.remove(ACTIVE_CLASS);
      if (runtime) runtime.resume("cinema");
    }
    emit("sm:cinema-done", transaction, reason || "complete");
    transaction.resolve({ id: transaction.id, token: transaction.token, reason: reason || "complete" });
  }

  function cancelActive(reason) {
    if (!active) return;
    var previous = active;
    skipNative(previous);
    finish(previous, reason || "interrupted");
  }

  function begin(id, target, source) {
    cancelActive("superseded");
    var transaction = {
      token: ++sequence,
      id: id,
      target: target,
      source: source || "programmatic",
      transition: null,
      timer: 0,
      finished: false,
      resolve: null,
      promise: null,
    };
    transaction.promise = new Promise(function (resolve) { transaction.resolve = resolve; });
    active = transaction;
    document.documentElement.classList.add(ACTIVE_CLASS);
    if (runtime) runtime.suspend("cinema");
    emit("sm:cinema-start", transaction, "start");

    transaction.timer = setTimeout(function () {
      if (transaction.finished) return;
      skipNative(transaction);
      // The mutation callback may never have run in a broken implementation.
      instantScroll(target);
      setActiveSection(id);
      finish(transaction, "timeout");
    }, HARD_TIMEOUT_MS);

    try {
      transaction.transition = document.startViewTransition(function () {
        if (transaction.finished || active !== transaction) return;
        instantScroll(target);
        setActiveSection(id);
      });
      observeNativeLifecycle(transaction.transition);
      var completion = transaction.transition && transaction.transition.finished;
      Promise.resolve(completion).then(function () {
        finish(transaction, "complete");
      }, function () {
        // Interruption is expected. If this is still the active transaction,
        // recover to the requested final pose before releasing the shell.
        if (!transaction.finished) {
          instantScroll(target);
          setActiveSection(id);
          finish(transaction, active === transaction ? "rejected" : "superseded");
        }
      });
    } catch (error) {
      instantScroll(target);
      setActiveSection(id);
      finish(transaction, "start-error");
    }
    return transaction.promise;
  }

  function navigate(value, options) {
    options = options || {};
    var id = sectionId(value);
    var target = targetFor(id);
    if (!id || !target) return Promise.resolve({ id: id, reason: "missing-target" });

    // Publish viewport ownership before History or scrolling changes. The
    // first-load deep-link stabilizer listens to this event and yields to the
    // newer transaction even when navigation is invoked through the API rather
    // than a pointer/keyboard gesture.
    try {
      window.dispatchEvent(new CustomEvent("sm:navigation-intent", {
        detail: { id: id, source: options.source || "programmatic" },
      }));
    } catch (error) { /* optional coordination channel */ }

    updateHistory(id, options.history || "push");
    if (active && active.id === id && !active.finished) return active.promise;

    var reduced = reducedMotion();
    var limited = limitedMotion();
    if (!supportsVT || reduced || limited || options.instant) {
      cancelActive("fallback");
      if (limited && !reduced && !options.instant) performanceCut(target, id);
      else {
        fallbackScroll(target, reduced || options.instant);
        setActiveSection(id);
      }
      return Promise.resolve({ id: id, reason: reduced ? "reduced-motion" : limited ? "performance-cut" : "fallback" });
    }
    return begin(id, target, options.source || "programmatic");
  }

  function onClick(event) {
    if (event.defaultPrevented) return;
    if (event.button != null && event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor || anchor.hasAttribute("download") || anchor.getAttribute("target") === "_blank" || anchor.hasAttribute("data-no-cinema")) return;
    var href = anchor.getAttribute("href") || "";
    if (href.length < 2 || href.charAt(0) !== "#") return;
    var id = sectionId(href);
    if (!targetFor(id)) return;
    event.preventDefault();
    navigate(id, { history: "push", source: "anchor" });
  }

  function onPopState() {
    var id = sectionId(window.location.hash) || "hero";
    if (!targetFor(id)) return;
    navigate(id, { history: "none", source: "popstate" });
  }

  function onVisibilityChange() {
    if (document.hidden && active) {
      var transaction = active;
      skipNative(transaction);
      instantScroll(transaction.target);
      setActiveSection(transaction.id);
      finish(transaction, "hidden");
    }
  }

  function init() {
    if (bound) return;
    bound = true;
    document.addEventListener("click", onClick, false);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (policy && typeof policy.on === "function") {
      unsubscribePolicy = policy.on(function (tier, state) {
        if ((state.reducedMotion || state.saveData || tier === "low") && active) {
          var transaction = active;
          skipNative(transaction);
          instantScroll(transaction.target);
          setActiveSection(transaction.id);
          finish(transaction, "reduced-motion");
        }
      });
    }
    setActiveSection(sectionId(window.location.hash) || "hero");
  }

  function dispose() {
    if (bound) {
      document.removeEventListener("click", onClick, false);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      unsubscribePolicy();
      unsubscribePolicy = function () {};
      bound = false;
    }
    cancelActive("dispose");
    document.documentElement.classList.remove(ACTIVE_CLASS);
    if (runtime) runtime.resume("cinema");
  }

  window.SceneCinema = {
    init: init,
    dispose: dispose,
    navigate: navigate,
    isSupported: supportsVT,
    __debug: function () {
      return {
        active: active ? { token: active.token, id: active.id, source: active.source } : null,
        sequence: sequence,
        bound: bound,
        transitioning: document.documentElement.classList.contains(ACTIVE_CLASS),
        timeoutMs: HARD_TIMEOUT_MS,
      };
    },
  };
})();
