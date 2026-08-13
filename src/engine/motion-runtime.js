// motion-runtime.js — one frame scheduler and one input stream for motion work.
//
// Subscribers never install their own scroll/pointer/resize listeners. A frame
// is processed in strict phases so layout reads cannot be interleaved with DOM
// writes by accident:
//
//   input snapshot → measure → compute → mutate → render
//
// The scheduler sleeps when no subscriber is dirty or continuous, stops in a
// hidden tab, and lets the central motion policy disable continuous movement
// without changing semantic content.
(function () {
  "use strict";

  var policy = window.__SM_MOTION_POLICY || window.__SM_PERF || null;
  var subscribers = [];
  var byId = Object.create(null);
  var cleanup = [];
  var raf = 0;
  var reducedFrameFallback = 0;
  var lastFrameAt = 0;
  var lastFrameReason = "none";
  var scheduledReason = "none";
  var frameCount = 0;
  var dirty = true;
  var destroyed = false;
  var suspendedReasons = Object.create(null);
  var input = {
    scrollX: window.scrollX || window.pageXOffset || 0,
    scrollY: window.scrollY || window.pageYOffset || 0,
    previousScrollY: window.scrollY || window.pageYOffset || 0,
    scrollDeltaY: 0,
    scrollVelocity: 0,
    pointerX: Math.round((window.innerWidth || 0) / 2),
    pointerY: Math.round((window.innerHeight || 0) / 2),
    pointerType: "none",
    pointerActive: false,
    viewportWidth: window.innerWidth || document.documentElement.clientWidth || 0,
    viewportHeight: window.innerHeight || document.documentElement.clientHeight || 0,
    resized: true,
    scrolled: false,
    pointerMoved: false,
    reason: "boot",
  };
  var pending = {
    scrollX: input.scrollX,
    scrollY: input.scrollY,
    pointerX: input.pointerX,
    pointerY: input.pointerY,
    pointerType: input.pointerType,
    pointerActive: input.pointerActive,
    viewportWidth: input.viewportWidth,
    viewportHeight: input.viewportHeight,
    resized: true,
    scrolled: false,
    pointerMoved: false,
    reason: "boot",
  };

  function policyState() {
    if (policy && typeof policy.getState === "function") return policy.getState();
    return {
      tier: "high",
      reducedMotion: false,
      documentVisible: !document.hidden,
      saveData: false,
      pointerClass: "fine",
      viewportClass: "desktop",
      measuredFps: null,
      longTaskPressure: false,
    };
  }

  function isSuspended() {
    return Object.keys(suspendedReasons).length > 0;
  }

  function sortSubscribers() {
    subscribers.sort(function (a, b) {
      return (a.priority || 0) - (b.priority || 0);
    });
  }

  function enabled(subscriber, context) {
    if (!subscriber || subscriber.disposed) return false;
    if (typeof subscriber.enabled !== "function") return subscriber.enabled !== false;
    try { return subscriber.enabled(context) !== false; }
    catch (error) { return false; }
  }

  function wantsContinuous(subscriber, context) {
    if (!enabled(subscriber, context)) return false;
    var value = subscriber.continuous;
    if (typeof value === "function") {
      try { value = value(context); } catch (error) { value = false; }
    }
    return !!value;
  }

  function hasContinuousWork(context) {
    if (context.policy.reducedMotion || !context.policy.documentVisible || isSuspended()) return false;
    for (var i = 0; i < subscribers.length; i += 1) {
      if (wantsContinuous(subscribers[i], context)) return true;
    }
    return false;
  }

  function schedule() {
    if (destroyed || raf || document.hidden || isSuspended()) return;
    scheduledReason = pending.reason || "unspecified";
    raf = requestAnimationFrame(runFrame);
    if (policyState().reducedMotion && !reducedFrameFallback) {
      // Some visible cold-start contexts can delay their first RAF far beyond
      // the reduced-motion final-pose budget. Deliver that one frame through a
      // bounded fallback; this is not a loop and is cancelled by a real RAF.
      reducedFrameFallback = window.setTimeout(function () {
        reducedFrameFallback = 0;
        if (!raf || destroyed || document.hidden || isSuspended()) return;
        cancelAnimationFrame(raf);
        raf = 0;
        runFrame(performance.now());
      }, 120);
    }
  }

  function wake(reason) {
    if (destroyed) return;
    dirty = true;
    if (reason) pending.reason = reason;
    schedule();
  }

  function snapshotInput(now, delta) {
    var previousY = input.scrollY;
    input.previousScrollY = previousY;
    input.scrollX = pending.scrollX;
    input.scrollY = pending.scrollY;
    input.scrollDeltaY = pending.scrolled ? pending.scrollY - previousY : 0;
    var instantaneous = delta > 0 ? input.scrollDeltaY / delta : 0;
    input.scrollVelocity = input.scrollVelocity * 0.72 + instantaneous * 0.28;
    if (!pending.scrolled) input.scrollVelocity *= 0.82;
    input.pointerX = pending.pointerX;
    input.pointerY = pending.pointerY;
    input.pointerType = pending.pointerType;
    input.pointerActive = pending.pointerActive;
    input.viewportWidth = pending.viewportWidth;
    input.viewportHeight = pending.viewportHeight;
    input.resized = pending.resized;
    input.scrolled = pending.scrolled;
    input.pointerMoved = pending.pointerMoved;
    input.reason = pending.reason;
    pending.resized = false;
    pending.scrolled = false;
    pending.pointerMoved = false;
    pending.reason = "idle";
    return input;
  }

  function runPhase(name, context) {
    for (var i = 0; i < subscribers.length; i += 1) {
      var subscriber = subscribers[i];
      if (!enabled(subscriber, context) || typeof subscriber[name] !== "function") continue;
      try {
        subscriber[name](context);
      } catch (error) {
        subscriber.errorCount = (subscriber.errorCount || 0) + 1;
        try {
          window.dispatchEvent(new CustomEvent("sm:motion-runtime-error", {
            detail: { id: subscriber.id, phase: name, error: error },
          }));
        } catch (eventError) { /* optional diagnostics */ }
        // A repeatedly broken decoration is disabled; the page stays usable.
        if (subscriber.errorCount >= 3) subscriber.enabled = false;
      }
    }
  }

  function runFrame(now) {
    raf = 0;
    if (reducedFrameFallback) {
      window.clearTimeout(reducedFrameFallback);
      reducedFrameFallback = 0;
    }
    lastFrameReason = scheduledReason;
    scheduledReason = "none";
    if (destroyed || document.hidden || isSuspended()) {
      lastFrameAt = 0;
      return;
    }

    var delta = lastFrameAt ? Math.min(64, Math.max(0, now - lastFrameAt)) : 16.667;
    lastFrameAt = now;
    frameCount += 1;
    var state = policyState();
    var context = {
      now: now,
      delta: delta,
      deltaSeconds: delta / 1000,
      frame: frameCount,
      input: snapshotInput(now, delta),
      policy: state,
      runtime: api,
    };

    dirty = false;
    runPhase("measure", context);
    runPhase("compute", context);
    runPhase("mutate", context);
    runPhase("render", context);

    if (state.reducedMotion) {
      // Reduced motion is edge-triggered: one external wake may render one
      // readable final pose, but a subscriber cannot request another frame
      // from inside that frame and accidentally recreate a continuous loop.
      // A later real input event can still call wake() and get its own frame.
      dirty = false;
      lastFrameAt = 0;
    } else if (dirty || hasContinuousWork(context)) schedule();
    else lastFrameAt = 0;
  }

  function subscribe(definition) {
    if (!definition || typeof definition !== "object") throw new TypeError("MotionRuntime.subscribe expects a definition object");
    var id = String(definition.id || "motion-" + (subscribers.length + 1));
    if (byId[id]) throw new Error("MotionRuntime subscriber id already exists: " + id);
    var subscriber = {
      id: id,
      priority: Number(definition.priority) || 0,
      enabled: definition.enabled,
      continuous: definition.continuous,
      measure: definition.measure,
      compute: definition.compute,
      mutate: definition.mutate,
      render: definition.render,
      dispose: definition.dispose,
      errorCount: 0,
      disposed: false,
    };
    subscribers.push(subscriber);
    byId[id] = subscriber;
    sortSubscribers();
    wake("subscribe:" + id);
    var active = true;
    return function unsubscribe() {
      if (!active) return;
      active = false;
      subscriber.disposed = true;
      var index = subscribers.indexOf(subscriber);
      if (index !== -1) subscribers.splice(index, 1);
      delete byId[id];
      if (typeof subscriber.dispose === "function") {
        try { subscriber.dispose(); } catch (error) { /* consumer cleanup */ }
      }
    };
  }

  function update(id, patch) {
    var subscriber = byId[id];
    if (!subscriber || !patch) return false;
    ["priority", "enabled", "continuous", "measure", "compute", "mutate", "render"].forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) subscriber[key] = patch[key];
    });
    sortSubscribers();
    wake("update:" + id);
    return true;
  }

  function suspend(reason) {
    reason = String(reason || "manual");
    suspendedReasons[reason] = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (reducedFrameFallback) window.clearTimeout(reducedFrameFallback);
    reducedFrameFallback = 0;
    lastFrameAt = 0;
  }

  function resume(reason) {
    reason = String(reason || "manual");
    delete suspendedReasons[reason];
    if (!isSuspended()) wake("resume:" + reason);
  }

  function bind(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    cleanup.push(function () { target.removeEventListener(type, handler, options); });
  }

  function onScroll() {
    pending.scrollX = window.scrollX || window.pageXOffset || 0;
    pending.scrollY = window.scrollY || window.pageYOffset || 0;
    pending.scrolled = true;
    if (policy && typeof policy.wake === "function") policy.wake("scroll");
    wake("scroll");
  }

  function onPointerMove(event) {
    pending.pointerX = event.clientX;
    pending.pointerY = event.clientY;
    pending.pointerType = event.pointerType || "mouse";
    pending.pointerActive = true;
    pending.pointerMoved = true;
    if (policy && typeof policy.wake === "function") policy.wake("pointer");
    wake("pointer");
  }

  function onPointerLeave() {
    pending.pointerActive = false;
    pending.pointerMoved = true;
    wake("pointer-leave");
  }

  function onResize() {
    pending.viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    pending.viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    pending.resized = true;
    if (policy && typeof policy.wake === "function") policy.wake("resize");
    wake("resize");
  }

  function onVisibility() {
    if (document.hidden) suspend("visibility");
    else resume("visibility");
  }

  var unsubscribePolicy = function () {};
  if (policy && typeof policy.on === "function") {
    unsubscribePolicy = policy.on(function (tier, state, reason) {
      if (!state.documentVisible) suspend("policy-visibility");
      else resume("policy-visibility");
      wake("policy:" + reason);
    });
  }

  bind(window, "scroll", onScroll, { passive: true });
  bind(window, "pointermove", onPointerMove, { passive: true });
  bind(window, "pointerleave", onPointerLeave, { passive: true });
  bind(window, "resize", onResize, { passive: true });
  bind(window, "orientationchange", onResize, { passive: true });
  bind(document, "visibilitychange", onVisibility);

  function dispose() {
    if (destroyed) return;
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (reducedFrameFallback) window.clearTimeout(reducedFrameFallback);
    reducedFrameFallback = 0;
    while (subscribers.length) {
      var subscriber = subscribers.pop();
      subscriber.disposed = true;
      if (typeof subscriber.dispose === "function") {
        try { subscriber.dispose(); } catch (error) { /* best effort */ }
      }
    }
    byId = Object.create(null);
    while (cleanup.length) {
      try { cleanup.pop()(); } catch (error) { /* best effort */ }
    }
    unsubscribePolicy();
  }

  var api = {
    subscribe: subscribe,
    update: update,
    wake: wake,
    suspend: suspend,
    resume: resume,
    dispose: dispose,
    get input() { return input; },
    get policy() { return policyState(); },
    __debug: function () {
      return {
        subscriberCount: subscribers.length,
        subscriberIds: subscribers.map(function (subscriber) { return subscriber.id; }),
        frameCount: frameCount,
        scheduled: !!raf,
        scheduledReason: scheduledReason,
        lastFrameReason: lastFrameReason,
        pendingReason: pending.reason,
        dirty: dirty,
        suspended: Object.keys(suspendedReasons),
        destroyed: destroyed,
      };
    },
  };

  window.__SM_MOTION_RUNTIME = api;
  wake("boot");
})();
