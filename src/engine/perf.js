// perf.js — the frame-budget governor.
//
// Every expensive effect on this site (image shaders, full-screen typographic
// pauses, kinetic type, the WebGL background) asks THIS module what it is
// allowed to spend. Instead of guessing from `navigator.hardwareConcurrency`
// — which lies constantly, especially on Android — we measure the frames the
// device is actually delivering and publish a tier from that.
//
//   html[data-perf="high"]  — everything on
//   html[data-perf="mid"]   — one shader at a time, shorter pauses
//   html[data-perf="low"]   — no shaders, static imagery, motion trimmed
//
// Design rules that make this safe rather than another thing that can jank:
//
//  • ASYMMETRIC HYSTERESIS. Dropping a tier takes ~1s of bad frames; earning
//    one back takes ~4s of good ones. A site that flickers between quality
//    levels looks broken in a way that no single effect ever would.
//  • THE SAMPLER SLEEPS. A permanent rAF loop just to hold a stopwatch is
//    exactly the kind of cost this module exists to prevent. It measures in
//    bursts, stops once the tier has been stable, and wakes on scroll or
//    resize — the moments when jank is both likely and visible.
//  • CONSERVATIVE START. Touch devices boot at "mid" and can EARN "high".
//    The first two seconds are the worst possible moment to be over-ambitious:
//    fonts, React and the Spline scene are all still landing.
//  • reduced-motion pins "low" permanently and never samples at all.
//
// Consumers: subscribe via window.__SM_PERF.on(fn) or read the attribute.
// The attribute is the contract — CSS can gate on it with zero JS.
(function () {
  "use strict";

  if (window.__SM_TEST_MODE) {
    document.documentElement.setAttribute("data-perf", "low");
    window.__SM_PERF = {
      tier: "low",
      allows: function () { return false; },
      shaderBudget: function () { return 0; },
      on: function (fn) { if (typeof fn === "function") fn("low"); },
      __set: function () {},
    };
    return;
  }

  var TIERS = ["low", "mid", "high"];

  // Frame-time thresholds in ms. 22ms ≈ 45fps — the point where scrolling
  // starts to feel "not smooth" rather than "slow"; 15ms ≈ 66fps is a device
  // comfortably ahead of a 60Hz budget and able to afford more.
  var BAD_FRAME_MS = 22;
  var GOOD_FRAME_MS = 15;
  var DOWNGRADE_AFTER_MS = 1000;   // sustained badness before dropping
  var UPGRADE_AFTER_MS = 4000;     // sustained goodness before climbing
  var SETTLE_MS = 2500;            // ignore the first frames (boot noise)
  var IDLE_STOP_MS = 6000;         // stop sampling once nothing has changed
  var SPIKE_MS = 80;               // ignore single stalls (GC, tab switch, layout of a new section)

  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* opportunistic */ }

  var coarse = false;
  try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (e) { /* opportunistic */ }

  var tier = reduced ? "low" : (coarse ? "mid" : "high");
  var listeners = [];
  var raf = 0;
  var lastTs = 0;
  var badSince = 0;
  var goodSince = 0;
  var quietSince = 0;
  var startedAt = 0;

  function apply(next) {
    if (next === tier) return;
    tier = next;
    document.documentElement.setAttribute("data-perf", tier);
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](tier); } catch (e) { /* one bad consumer must not stop the rest */ }
    }
  }

  function step(down) {
    var i = TIERS.indexOf(tier);
    var next = TIERS[Math.max(0, Math.min(TIERS.length - 1, i + (down ? -1 : 1)))];
    if (next !== tier) {
      apply(next);
      // A tier change invalidates both streaks — the new level needs its own
      // evidence before it moves again.
      badSince = 0; goodSince = 0;
    }
  }

  function frame(ts) {
    raf = 0;
    if (document.hidden) { lastTs = 0; return; } // don't measure a backgrounded tab
    if (!lastTs) { lastTs = ts; raf = requestAnimationFrame(frame); return; }

    var dt = ts - lastTs;
    lastTs = ts;

    // Boot noise and one-off stalls are not evidence about the device.
    if (ts - startedAt > SETTLE_MS && dt < SPIKE_MS) {
      if (dt > BAD_FRAME_MS) {
        if (!badSince) badSince = ts;
        goodSince = 0;
        if (ts - badSince > DOWNGRADE_AFTER_MS) step(true);
      } else if (dt < GOOD_FRAME_MS) {
        if (!goodSince) goodSince = ts;
        badSince = 0;
        if (ts - goodSince > UPGRADE_AFTER_MS) step(false);
      } else {
        badSince = 0; goodSince = 0; // the comfortable middle — no evidence either way
      }
    }

    // Sleep once the picture has been stable for a while. Scroll/resize wake us.
    if (!badSince && !goodSince) {
      if (!quietSince) quietSince = ts;
      if (ts - quietSince > IDLE_STOP_MS) { lastTs = 0; return; }
    } else {
      quietSince = 0;
    }

    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (reduced || raf || document.hidden) return;
    lastTs = 0; quietSince = 0;
    raf = requestAnimationFrame(frame);
  }

  document.documentElement.setAttribute("data-perf", tier);

  if (!reduced) {
    startedAt = (window.performance && performance.now) ? performance.now() : 0;
    wake();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; lastTs = 0; }
      else wake();
    });
  }

  window.__SM_PERF = {
    get tier() { return tier; },
    // True when the caller may spend on `cost`: "shader" | "motion" | "heavy".
    allows: function (cost) {
      if (cost === "shader") return tier === "high" || tier === "mid";
      if (cost === "heavy") return tier === "high";
      return tier !== "low";
    },
    // How many simultaneous shader instances the device should host.
    shaderBudget: function () { return tier === "high" ? 8 : tier === "mid" ? 1 : 0; },
    on: function (fn) { if (typeof fn === "function") { listeners.push(fn); fn(tier); } },
    // Test hook — lets verification pin a tier without a slow device.
    __set: function (t) { if (TIERS.indexOf(t) !== -1) apply(t); },
  };
})();
