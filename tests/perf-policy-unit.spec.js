"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { test, expect } = require("@playwright/test");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "engine", "perf.js"), "utf8");

function createHarness() {
  let now = 0;
  let serial = 0;
  const frames = new Map();
  const attributes = new Map();
  const noop = () => {};
  const root = {
    clientWidth: 1440,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
  };
  const document = {
    documentElement: root,
    hidden: false,
    addEventListener: noop,
    removeEventListener: noop,
  };
  const window = {
    innerWidth: 1440,
    __SM_TEST_MODE: false,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    addEventListener: noop,
    removeEventListener: noop,
    dispatchEvent: noop,
    requestAnimationFrame(callback) {
      const id = ++serial;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const context = {
    window,
    document,
    navigator: {},
    performance: { now: () => now },
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
    PerformanceObserver: undefined,
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    Date,
    Math,
    Object,
    Array,
    Error,
  };
  vm.runInNewContext(source, context, { filename: "perf.js" });

  return {
    policy: window.__SM_MOTION_POLICY,
    attributes,
    run(step, duration) {
      const end = now + duration;
      while (frames.size && now < end) {
        now += step;
        const next = frames.entries().next().value;
        frames.delete(next[0]);
        next[1](now);
      }
      return frames.size;
    },
    queued: () => frames.size,
  };
}

test("FPS burst sleeps at the high-tier good-frame boundary", () => {
  const harness = createHarness();
  expect(harness.policy.tier).toBe("high");
  harness.run(16.67, 13000);
  expect(harness.queued()).toBe(0);
  expect(harness.policy.__debug().sampling).toBe(false);
  expect(harness.policy.tier).toBe("high");
});

test("FPS burst reaches low tier and sleeps at the bad-frame boundary", () => {
  const harness = createHarness();
  harness.run(25, 12500);
  expect(harness.policy.tier).toBe("low");
  expect(harness.queued()).toBe(0);
  expect(harness.policy.__debug().sampling).toBe(false);
  expect(harness.attributes.has("data-motion-lite")).toBe(true);
});
