// perf.js — one reactive motion/performance policy for the entire site.
//
// Hardware hints are only a starting hypothesis. The policy combines the
// user's explicit preferences, connection hints, viewport/pointer class and
// measured frame delivery, then publishes one state object to every effect.
//
// Public contract:
//   window.__SM_PERF === window.__SM_MOTION_POLICY
//   .tier                         "low" | "mid" | "high"
//   .state                        immutable snapshot
//   .getState()                   fresh snapshot
//   .allows(cost)                 "motion" | "shader" | "heavy"
//   .shaderBudget()               0 | 1 | 2 simultaneous contexts
//   .on(fn) / .subscribe(fn)      returns an unsubscribe function
//   .wake(reason)                 request a short measurement burst
//   .destroy()                    remove every observer/listener/RAF
//
// Compatibility:
//   window.getDeviceTier() remains as a thin reader while legacy consumers are
//   migrated. It no longer performs a second, contradictory hardware guess.
(function () {
  "use strict";

  var root = document.documentElement;
  var TIERS = ["low", "mid", "high"];
  var BAD_FRAME_MS = 24;           // below ~42 FPS for a sustained period
  var GOOD_FRAME_MS = 19.5;        // stable 51+ FPS, valid on ordinary 60 Hz
  var DOWNGRADE_AFTER_MS = 900;
  var UPGRADE_AFTER_MS = 4200;
  var SETTLE_MS = 2200;
  var BURST_IDLE_MS = 5200;
  // Ignore only resume/debugger-scale gaps. Frames in the 90–500 ms range are
  // catastrophic delivery, not harmless outliers, and must lower the tier.
  var SPIKE_MS = 500;
  var LONG_TASK_WINDOW_MS = 5000;
  var TEST_MODE = !!window.__SM_TEST_MODE;

  function safeMedia(query) {
    try {
      if (typeof window.matchMedia === "function") return window.matchMedia(query);
    } catch (error) { /* capability probe */ }
    return {
      matches: false,
      addEventListener: function () {},
      removeEventListener: function () {},
      addListener: function () {},
      removeListener: function () {},
    };
  }

  var motionMedia = safeMedia("(prefers-reduced-motion: reduce)");
  var coarseMedia = safeMedia("(pointer: coarse)");
  var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  var listeners = [];
  var cleanup = [];
  var raf = 0;
  var lastFrameAt = 0;
  var samplerStartedAt = 0;
  var quietSince = 0;
  var badSince = 0;
  var goodSince = 0;
  var fpsSamples = [];
  var longTasks = [];
  var longTaskObserver = null;
  var destroyed = false;
  var forcedTier = TEST_MODE ? "low" : null;
  var resizeQueued = false;
  var resizeRaf = 0;

  function viewportClass() {
    var width = Math.max(root.clientWidth || 0, window.innerWidth || 0);
    if (width < 640) return "phone";
    if (width < 1024) return "tablet";
    return "desktop";
  }

  function initialTier() {
    if (motionMedia.matches || (connection && connection.saveData)) return "low";
    return coarseMedia.matches ? "mid" : "high";
  }

  var state = {
    tier: initialTier(),
    reducedMotion: !!motionMedia.matches,
    documentVisible: !document.hidden,
    saveData: !!(connection && connection.saveData),
    pointerClass: coarseMedia.matches ? "coarse" : "fine",
    viewportClass: viewportClass(),
    measuredFps: null,
    longTaskPressure: false,
  };
  if (forcedTier) state.tier = forcedTier;

  function cloneState() {
    return {
      tier: state.tier,
      reducedMotion: state.reducedMotion,
      documentVisible: state.documentVisible,
      saveData: state.saveData,
      pointerClass: state.pointerClass,
      viewportClass: state.viewportClass,
      measuredFps: state.measuredFps,
      longTaskPressure: state.longTaskPressure,
    };
  }

  function applyAttributes() {
    root.setAttribute("data-perf", state.tier);
    root.setAttribute("data-motion-policy", state.reducedMotion ? "reduced" : "full");
    root.setAttribute("data-pointer", state.pointerClass);
    root.setAttribute("data-viewport", state.viewportClass);
    if (state.tier === "low" || state.reducedMotion || state.saveData) root.setAttribute("data-motion-lite", "");
    else root.removeAttribute("data-motion-lite");
    if (state.saveData) root.setAttribute("data-save-data", "");
    else root.removeAttribute("data-save-data");
  }

  function notify(reason) {
    applyAttributes();
    var snapshot = cloneState();
    for (var i = 0; i < listeners.length; i += 1) {
      try {
        // The tier remains the first argument for legacy subscribers.
        listeners[i](snapshot.tier, snapshot, reason || "state");
      } catch (error) {
        // One decorative consumer must never break the policy for the rest.
      }
    }
    try {
      window.dispatchEvent(new CustomEvent("sm:motion-policy", {
        detail: { state: snapshot, reason: reason || "state" },
      }));
    } catch (eventError) { /* optional event channel */ }
  }

  function setState(patch, reason) {
    var changed = false;
    Object.keys(patch).forEach(function (key) {
      if (state[key] !== patch[key]) {
        state[key] = patch[key];
        changed = true;
      }
    });
    if (changed) notify(reason);
    return changed;
  }

  function constrainedTier(requested) {
    if (forcedTier) return forcedTier;
    if (state.reducedMotion || state.saveData) return "low";
    return TIERS.indexOf(requested) === -1 ? state.tier : requested;
  }

  function setTier(next, reason) {
    next = constrainedTier(next);
    if (next === state.tier) return false;
    badSince = 0;
    goodSince = 0;
    return setState({ tier: next }, reason || "tier");
  }

  function stepTier(direction, reason) {
    var index = TIERS.indexOf(state.tier);
    var next = TIERS[Math.max(0, Math.min(TIERS.length - 1, index + direction))];
    var changed = setTier(next, reason);
    // A sustained good signal at `high`, or bad signal at `low`, cannot move
    // any further. Clear the pressure window so the burst sampler is allowed
    // to become quiet instead of keeping a permanent RAF alive.
    if (!changed && next === state.tier) {
      badSince = 0;
      goodSince = 0;
    }
    return changed;
  }

  function pruneLongTasks(now) {
    while (longTasks.length && now - longTasks[0] > LONG_TASK_WINDOW_MS) longTasks.shift();
    var pressured = longTasks.length >= 2;
    if (pressured !== state.longTaskPressure) {
      setState({ longTaskPressure: pressured }, "long-task-pressure");
    }
    if (pressured && !forcedTier && !state.reducedMotion && !state.saveData) {
      stepTier(-1, "long-task-downgrade");
      longTasks.length = 0;
    }
  }

  function measuredFps() {
    if (!fpsSamples.length) return null;
    var sum = 0;
    for (var i = 0; i < fpsSamples.length; i += 1) sum += fpsSamples[i];
    var average = sum / fpsSamples.length;
    return Math.round(1000 / Math.max(1, average));
  }

  function sampleFrame(now) {
    raf = 0;
    if (destroyed || document.hidden || state.reducedMotion || state.saveData) {
      lastFrameAt = 0;
      return;
    }

    if (!lastFrameAt) {
      lastFrameAt = now;
      raf = window.requestAnimationFrame(sampleFrame);
      return;
    }

    var delta = now - lastFrameAt;
    lastFrameAt = now;
    if (delta > 0 && delta < SPIKE_MS) {
      fpsSamples.push(delta);
      if (fpsSamples.length > 90) fpsSamples.shift();

      if (now - samplerStartedAt > SETTLE_MS && !forcedTier) {
        if (delta > BAD_FRAME_MS) {
          if (state.tier === "low") {
            badSince = 0;
            goodSince = 0;
          } else {
            if (!badSince) badSince = now;
            goodSince = 0;
            if (now - badSince >= DOWNGRADE_AFTER_MS) stepTier(-1, "frame-budget-downgrade");
          }
        } else if (delta <= GOOD_FRAME_MS) {
          if (state.tier === "high") {
            badSince = 0;
            goodSince = 0;
          } else {
            if (!goodSince) goodSince = now;
            badSince = 0;
            if (now - goodSince >= UPGRADE_AFTER_MS) stepTier(1, "frame-budget-upgrade");
          }
        } else {
          badSince = 0;
          goodSince = 0;
        }
      }
    }

    pruneLongTasks(now);
    var fps = measuredFps();
    if (fps !== state.measuredFps && (fpsSamples.length % 15 === 0 || state.measuredFps === null)) {
      setState({ measuredFps: fps }, "frame-sample");
    }

    if (!badSince && !goodSince) {
      if (!quietSince) quietSince = now;
      if (now - quietSince >= BURST_IDLE_MS) {
        lastFrameAt = 0;
        return;
      }
    } else {
      quietSince = 0;
    }
    raf = window.requestAnimationFrame(sampleFrame);
  }

  function wake() {
    if (destroyed || TEST_MODE || state.reducedMotion || state.saveData || document.hidden || raf) return;
    lastFrameAt = 0;
    quietSince = 0;
    samplerStartedAt = performance.now ? performance.now() : Date.now();
    raf = window.requestAnimationFrame(sampleFrame);
  }

  function bind(target, type, handler, options) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, handler, options);
    cleanup.push(function () { target.removeEventListener(type, handler, options); });
  }

  function bindMedia(media, handler) {
    if (media.addEventListener) {
      media.addEventListener("change", handler);
      cleanup.push(function () { media.removeEventListener("change", handler); });
    } else if (media.addListener) {
      media.addListener(handler);
      cleanup.push(function () { media.removeListener(handler); });
    }
  }

  function onMotionPreference() {
    var reduced = !!motionMedia.matches;
    var next = reduced ? "low" : (state.saveData ? "low" : (coarseMedia.matches ? "mid" : "high"));
    // Preference is authoritative and therefore may override a previous test pin
    // only in production; tests keep their deterministic forced tier.
    setState({ reducedMotion: reduced, tier: forcedTier || (reduced ? "low" : next) }, "motion-preference");
    if (reduced && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      lastFrameAt = 0;
    } else {
      wake("motion-preference");
    }
  }

  function onPointerClass() {
    var pointer = coarseMedia.matches ? "coarse" : "fine";
    var patch = { pointerClass: pointer };
    if (!forcedTier && !state.reducedMotion && !state.saveData && state.measuredFps === null) {
      patch.tier = pointer === "coarse" ? "mid" : "high";
    }
    setState(patch, "pointer-class");
    wake("pointer-class");
  }

  function onConnectionChange() {
    var saveData = !!(connection && connection.saveData);
    var patch = { saveData: saveData };
    if (saveData) patch.tier = "low";
    else if (!forcedTier && !state.reducedMotion) patch.tier = state.pointerClass === "coarse" ? "mid" : "high";
    setState(patch, "connection");
    wake("connection");
  }

  function onVisibilityChange() {
    var visible = !document.hidden;
    setState({ documentVisible: visible }, "visibility");
    if (!visible && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      lastFrameAt = 0;
    } else if (visible) {
      wake("visibility");
    }
  }

  function onResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      resizeQueued = false;
      if (destroyed) return;
      setState({ viewportClass: viewportClass() }, "viewport");
      wake("viewport");
    });
  }

  applyAttributes();
  bindMedia(motionMedia, onMotionPreference);
  bindMedia(coarseMedia, onPointerClass);
  bind(document, "visibilitychange", onVisibilityChange);
  bind(window, "resize", onResize, { passive: true });
  bind(window, "orientationchange", onResize, { passive: true });
  if (connection && connection.addEventListener) bind(connection, "change", onConnectionChange);

  if (!TEST_MODE && typeof PerformanceObserver === "function") {
    try {
      longTaskObserver = new PerformanceObserver(function (list) {
        var now = performance.now ? performance.now() : Date.now();
        list.getEntries().forEach(function (entry) {
          if (entry.duration >= 50) longTasks.push(now);
        });
        pruneLongTasks(now);
      });
      longTaskObserver.observe({ type: "longtask", buffered: true });
    } catch (error) {
      longTaskObserver = null;
    }
  }

  function subscribe(fn) {
    if (typeof fn !== "function" || destroyed) return function () {};
    listeners.push(fn);
    try { fn(state.tier, cloneState(), "subscribe"); } catch (error) { /* consumer-owned */ }
    var active = true;
    return function unsubscribe() {
      if (!active) return;
      active = false;
      var index = listeners.indexOf(fn);
      if (index !== -1) listeners.splice(index, 1);
    };
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = 0;
    resizeQueued = false;
    if (longTaskObserver) {
      try { longTaskObserver.disconnect(); } catch (error) { /* optional */ }
      longTaskObserver = null;
    }
    while (cleanup.length) {
      try { cleanup.pop()(); } catch (error) { /* best-effort teardown */ }
    }
    listeners.length = 0;
  }

  var api = {
    get tier() { return state.tier; },
    get state() { return cloneState(); },
    getState: cloneState,
    allows: function (cost) {
      if (!state.documentVisible) return false;
      if (cost === "shader") return !state.reducedMotion && !state.saveData && state.tier !== "low";
      if (cost === "heavy") return !state.reducedMotion && !state.saveData && state.tier === "high";
      return !state.reducedMotion && state.tier !== "low";
    },
    shaderBudget: function () {
      if (!state.documentVisible || state.reducedMotion || state.saveData) return 0;
      return state.tier === "high" ? 2 : state.tier === "mid" ? 1 : 0;
    },
    on: subscribe,
    subscribe: subscribe,
    wake: wake,
    destroy: destroy,
    // Deterministic verification hook. Production has no caller for this.
    __set: function (next) {
      if (TIERS.indexOf(next) === -1) return;
      forcedTier = next;
      setState({ tier: next }, "test-tier");
    },
    __release: function () {
      forcedTier = null;
      setTier(initialTier(), "test-tier-release");
      wake("test-tier-release");
    },
    __debug: function () {
      return {
        subscriberCount: listeners.length,
        sampling: !!raf,
        destroyed: destroyed,
        forcedTier: forcedTier,
        longTaskCount: longTasks.length,
      };
    },
  };

  window.__SM_PERF = api;
  window.__SM_MOTION_POLICY = api;
  window.getDeviceTier = function () { return state.tier; };
  wake("boot");
})();
