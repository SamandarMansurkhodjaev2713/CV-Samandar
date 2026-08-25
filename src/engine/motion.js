// motion.js — authored interaction layer on top of the shared MotionRuntime.
//
// There are no private RAF loops, permanent polls or module-owned scroll /
// pointer / resize listeners. Runtime phases own all per-frame reads and writes.
(function () {
  "use strict";
  if (window.__SM_TEST_MODE || window.Motion) return;

  var policy = window.__SM_MOTION_POLICY || window.__SM_PERF || null;
  var runtime = window.__SM_MOTION_RUNTIME || null;
  var initialized = false;
  var cleanup = [];
  var timers = [];
  var runtimeCleanup = [];
  var unsubscribePolicy = function () {};
  var revealObserver = null;
  var sectionObserver = null;
  var centerObserver = null;
  var parallaxObserver = null;
  var motionZoneObserver = null;
  var pendingReveals = new Set();
  var pendingSections = new Set();
  var visibleParallax = new Set();
  var motionZones = new Set();
  var magnets = [];
  var pinHosts = [];
  var parallaxElements = [];
  var pinMeasurements = [];
  var parallaxMeasurements = [];
  var motionZoneMeasurements = [];
  var visiblePendingReveals = [];
  var visiblePendingSections = [];
  var magnetMeasurements = [];
  var layoutDirty = true;
  var spotlightElement = null;
  var spotlightRect = null;
  var morphElement = null;
  var morphRect = null;
  var currentCenterCard = null;
  var lastFallbackSweepAt = 0;

  var cursor = null;
  var cursorRing = null;
  var cursorLabel = null;
  var cursorCoords = null;
  var cursorMode = "default";
  var cursorText = "";
  var cursorSection = "";
  var cursorAccent = "";
  var cursorPosition = { x: -100, y: -100 };
  var cursorTarget = { x: -100, y: -100 };
  var ring = { width: 28, height: 28, radius: 50, offsetX: 0, offsetY: 0, scale: 1 };
  var ringTarget = { width: 28, height: 28, radius: 50, offsetX: 0, offsetY: 0, scale: 1 };
  var cursorMoving = false;

  function currentPolicy() {
    if (policy && typeof policy.getState === "function") return policy.getState();
    var reduced = false;
    try { reduced = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (error) { /* fallback */ }
    return {
      tier: "high",
      reducedMotion: reduced,
      pointerClass: matchMedia("(pointer: coarse)").matches ? "coarse" : "fine",
      documentVisible: !document.hidden,
    };
  }

  function shouldUseCursor() {
    var state = currentPolicy();
    return state.pointerClass === "fine" && !state.reducedMotion && state.viewportClass !== "phone";
  }

  function listen(target, type, handler, options) {
    if (!target || !target.addEventListener) return;
    target.addEventListener(type, handler, options);
    cleanup.push(function () { target.removeEventListener(type, handler, options); });
  }

  function later(handler, delay) {
    var timer = setTimeout(function () {
      var index = timers.indexOf(timer);
      if (index !== -1) timers.splice(index, 1);
      handler();
    }, delay);
    timers.push(timer);
    return timer;
  }

  function isVisible(element, margin) {
    if (!element || !element.isConnected) return false;
    var rect = element.getBoundingClientRect();
    var extra = margin || 0;
    return rect.bottom >= -extra && rect.top <= (window.innerHeight || 0) + extra;
  }

  function splitWords(element) {
    if (!element || element.classList.contains("rv-split")) return;
    function walk(node) {
      Array.from(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var fragment = document.createDocumentFragment();
          var index = 0;
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              fragment.appendChild(document.createTextNode(part));
              return;
            }
            var span = document.createElement("span");
            span.className = "rv-w";
            span.style.setProperty("--rv-i", index++);
            span.textContent = part;
            fragment.appendChild(span);
          });
          node.replaceChild(fragment, child);
        } else if (child.nodeType === 1 && !child.classList.contains("rv-w")) {
          walk(child);
        }
      });
    }
    walk(element);
    element.classList.add("rv-split");
  }

  function splitChars(element) {
    if (!element || element.classList.contains("rv-split")) return;
    var text = element.textContent;
    element.textContent = "";
    var index = 0;
    Array.from(text).forEach(function (character) {
      if (character === " ") {
        element.appendChild(document.createTextNode(" "));
        return;
      }
      var span = document.createElement("span");
      span.className = "rv-c";
      span.style.setProperty("--rv-i", index++);
      span.textContent = character;
      element.appendChild(span);
    });
    element.classList.add("rv-split");
  }

  function reveal(element, fast) {
    if (!element) return;
    if (fast) element.classList.add("rv-fast");
    element.classList.add("rv-in");
    pendingReveals.delete(element);
    if (revealObserver) revealObserver.unobserve(element);
  }

  function enterSection(element) {
    if (!element) return;
    element.classList.add("sec-in");
    pendingSections.delete(element);
    if (sectionObserver) sectionObserver.unobserve(element);
  }

  function revealEverything() {
    pendingReveals.forEach(function (element) { reveal(element, true); });
    pendingSections.forEach(enterSection);
  }

  function buildObservers() {
    if (!("IntersectionObserver" in window)) return;
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) reveal(entry.target, Math.abs(runtime ? runtime.input.scrollVelocity : 0) > 1.6);
      });
    }, { rootMargin: "0px 0px 300px 0px", threshold: 0.01 });

    sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) enterSection(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.01 });
  }

  function refreshMotionZones() {
    if (!("IntersectionObserver" in window)) return;
    if (!motionZoneObserver) {
      document.documentElement.classList.add("motion-zones");
      motionZoneObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          // A queued pre-scroll IO record can arrive after a programmatic
          // scroll under CPU pressure. Confirm the live geometry before
          // pausing a section so a stale `false` never freezes visible motion.
          var margin = (window.innerHeight || 0) * 0.65;
          entry.target.classList.toggle("is-motion-near", entry.isIntersecting || isVisible(entry.target, margin));
        });
      }, { rootMargin: "65% 0px 65% 0px", threshold: 0 });
    }
    document.querySelectorAll("section[data-section]").forEach(function (section) {
      if (motionZones.has(section)) return;
      motionZones.add(section);
      section.classList.toggle("is-motion-near", isVisible(section, (window.innerHeight || 0) * 0.65));
      motionZoneObserver.observe(section);
    });
  }

  function bindRevealElements() {
    var state = currentPolicy();
    document.querySelectorAll("[data-reveal]:not(.rv-bound), [data-reveal-words]:not(.rv-bound), [data-reveal-chars]:not(.rv-bound)")
      .forEach(function (element) {
        if (element.hasAttribute("data-reveal-words") && !state.reducedMotion) splitWords(element);
        if (element.hasAttribute("data-reveal-chars") && !state.reducedMotion) splitChars(element);
        element.classList.add("rv-bound");
        if (state.reducedMotion || isVisible(element, 0) || !revealObserver) {
          reveal(element, false);
          return;
        }
        pendingReveals.add(element);
        revealObserver.observe(element);
      });

    document.querySelectorAll("section[data-enter]:not(.sec-bound)").forEach(function (element) {
      element.classList.add("sec-bound");
      if (state.reducedMotion || isVisible(element, 0) || !sectionObserver) {
        enterSection(element);
        return;
      }
      pendingSections.add(element);
      sectionObserver.observe(element);
    });
  }

  function buildCursor() {
    if (cursor || !shouldUseCursor()) return;
    cursor = document.createElement("div");
    cursor.className = "sc-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = [
      '<div class="sc-cross sc-cross-h"></div>',
      '<div class="sc-cross sc-cross-v"></div>',
      '<div class="sc-ring"></div>',
      '<div class="sc-caliper"><i></i><i></i><b></b></div>',
      '<div class="sc-dot"></div>',
      '<div class="sc-label"><span class="sc-label-key"></span><span class="sc-label-val"></span></div>',
      '<div class="sc-coords"></div>',
    ].join("");
    document.body.appendChild(cursor);
    cursorRing = cursor.querySelector(".sc-ring");
    cursorLabel = cursor.querySelector(".sc-label");
    cursorCoords = cursor.querySelector(".sc-coords");
    document.body.classList.add("has-smart-cursor");
    cursorMoving = true;
    if (runtime) runtime.wake("cursor-build");
  }

  function removeCursor() {
    if (cursor && cursor.parentNode) cursor.parentNode.removeChild(cursor);
    cursor = null;
    cursorRing = null;
    cursorLabel = null;
    cursorCoords = null;
    morphElement = null;
    morphRect = null;
    cursorMoving = false;
    document.body.classList.remove("has-smart-cursor");
    magnets.forEach(function (magnet) {
      magnet.element.style.removeProperty("--mag-x");
      magnet.element.style.removeProperty("--mag-y");
    });
  }

  function readableText(element) {
    // innerText excludes responsive/a11y copies hidden by CSS. textContent
    // concatenated desktop + mobile labels and produced broken cursor text.
    var source = element ? (element.innerText || element.textContent || "") : "";
    var value = source.replace(/\s+/g, " ").trim();
    return value.length > 20 ? value.slice(0, 19) + "…" : value;
  }

  function cursorInfo(target) {
    if (!target || !target.closest) return null;
    var explicit = target.closest("[data-cursor]");
    if (explicit) {
      var visibleLabel = readableText(explicit);
      return {
        element: explicit,
        mode: explicit.getAttribute("data-cursor") || "link",
        // Visible UI copy is already localized and is the truthful action
        // name. Legacy data labels may be English even inside RU/UZ pages.
        label: visibleLabel || explicit.getAttribute("data-cursor-label") || "",
      };
    }
    var interactive = target.closest("a, button, [role='button'], [role='tab'], input, textarea, select");
    if (!interactive) return null;
    var tag = interactive.tagName.toLowerCase();
    var mode = tag === "input" || tag === "textarea" || tag === "select" ? "input"
      : interactive.getAttribute("role") === "tab" ? "tab"
      : interactive.type === "submit" ? "send"
      : "link";
    return { element: interactive, mode: mode, label: readableText(interactive) };
  }

  function setCursorMode(mode, label) {
    cursorMode = mode || "default";
    cursorText = label || "";
    ringTarget.scale = cursorMode === "default" ? 1 : cursorMode === "drag" ? 2.1 : 1.55;
    if (!cursor) return;
    cursor.setAttribute("data-mode", cursorMode);
    var key = cursorLabel && cursorLabel.querySelector(".sc-label-key");
    var value = cursorLabel && cursorLabel.querySelector(".sc-label-val");
    if (key && value) {
      var parts = cursorText.split(":");
      var language = (document.documentElement.lang || "ru").slice(0, 2);
      var actionSets = {
        ru: { link: "ОТКРЫТЬ", drag: "ДВИГАТЬ", file: "ФАЙЛ", copy: "КОПИРОВАТЬ", send: "ОТПРАВИТЬ", input: "ВВОД", tab: "ВЫБРАТЬ", target: "ПРОВЕРИТЬ" },
        en: { link: "OPEN", drag: "MOVE", file: "FILE", copy: "COPY", send: "SEND", input: "INPUT", tab: "SELECT", target: "INSPECT" },
        uz: { link: "OCHISH", drag: "SURISH", file: "FAYL", copy: "NUSXA", send: "YUBORISH", input: "KIRITISH", tab: "TANLASH", target: "TEKSHIRISH" },
      };
      var actionNames = actionSets[language] || actionSets.ru;
      key.textContent = (parts.length > 1
        ? parts.shift().toUpperCase()
        : (actionNames[cursorMode] || "VERIFY")) + " //";
      value.textContent = parts.length ? parts.join(":").trim() : cursorText;
    }
    cursor.classList.toggle("has-label", Boolean(cursorText));
    cursorMoving = true;
    if (runtime) runtime.wake("cursor-mode");
  }

  function spawnRipple(x, y) {
    if (!cursor) return;
    var ripple = document.createElement("div");
    ripple.className = "sc-ripple";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    ripple.style.setProperty("--sc-ripple-max", "64px");
    ripple.style.setProperty("--sc-ripple-dur", "620ms");
    document.body.appendChild(ripple);
    function remove() {
      if (ripple.isConnected) ripple.remove();
    }
    ripple.addEventListener("animationend", remove, { once: true });
    later(remove, 1100);
  }

  function onPointerOver(event) {
    if (!cursor) return;
    var info = cursorInfo(event.target);
    var section = event.target && event.target.closest ? event.target.closest("section[data-section]") : null;
    cursorSection = section ? (section.id || section.getAttribute("data-section") || "") : "";
    if (!info) {
      setCursorMode("default", "");
      morphElement = null;
    } else {
      setCursorMode(info.mode, info.label);
      morphElement = info.element.closest("[data-magnetic], [data-cursor-deform]");
    }
    spotlightElement = event.target && event.target.closest
      ? event.target.closest(".card, .proj-card")
      : null;
    var accentOwner = spotlightElement || (info && info.element);
    cursorAccent = accentOwner && accentOwner.isConnected
      ? getComputedStyle(accentOwner).getPropertyValue("--proj-accent").trim()
      : "";
    cursor.style.color = cursorAccent || "";
    cursorMoving = true;
    if (runtime) runtime.wake("pointer-over");
  }

  function onPointerOut(event) {
    if (!event.relatedTarget || !cursorInfo(event.relatedTarget)) {
      setCursorMode("default", "");
      morphElement = null;
      cursorAccent = "";
      if (cursor) cursor.style.color = "";
    }
    if (spotlightElement && (!event.relatedTarget || !spotlightElement.contains(event.relatedTarget))) {
      spotlightElement = null;
      spotlightRect = null;
    }
  }

  function onPointerDown() {
    if (cursor) cursor.classList.add("is-down");
  }

  function onPointerUp(event) {
    if (cursor) cursor.classList.remove("is-down");
    var navigationControl = event.target && event.target.closest
      ? event.target.closest(".nav-burger, .nav-menu-close")
      : null;
    if (!navigationControl) spawnRipple(event.clientX, event.clientY);
  }

  function onPointerLeave() {
    if (cursor) cursor.classList.add("is-out");
  }

  function onPointerEnter() {
    if (cursor) cursor.classList.remove("is-out");
  }

  function refreshInteractiveElements() {
    var state = currentPolicy();
    var lite = state.reducedMotion || state.tier === "low";
    magnets = [];
    if (shouldUseCursor() && !lite) {
      document.querySelectorAll("[data-magnetic]").forEach(function (element) {
        magnets.push({
          element: element,
          strength: element.hasAttribute("data-magnetic-strong") ? 0.35 : 0.22,
          x: 0,
          y: 0,
          active: false,
        });
      });
    }
    var allPinHosts = Array.from(document.querySelectorAll("[data-pin]"));
    var allParallaxElements = Array.from(document.querySelectorAll("[data-plx]"));
    if (lite) {
      allPinHosts.forEach(function (element) { element.style.removeProperty("--pin-p"); });
      allParallaxElements.forEach(function (element) { element.style.removeProperty("--plx"); });
    }
    pinHosts = lite ? [] : allPinHosts;
    pinHosts.forEach(function (element) { element.classList.add("pin-bound"); });
    parallaxElements = lite ? [] : allParallaxElements;
    visibleParallax.clear();
    if (parallaxObserver) parallaxObserver.disconnect();
    parallaxObserver = null;
    if (!state.reducedMotion && "IntersectionObserver" in window) {
      parallaxObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visibleParallax.add(entry.target);
          else visibleParallax.delete(entry.target);
        });
        layoutDirty = true;
        if (runtime) runtime.wake("parallax-visibility");
      }, { rootMargin: "220px 0px 220px 0px", threshold: 0 });
      parallaxElements.forEach(function (element) { parallaxObserver.observe(element); });
    } else if (!state.reducedMotion) {
      parallaxElements.forEach(function (element) { visibleParallax.add(element); });
    }
    layoutDirty = true;
    if (runtime) runtime.wake("motion-refresh");
  }

  function measureCursor(context) {
    if (!cursor) return;
    cursorTarget.x = context.input.pointerX;
    cursorTarget.y = context.input.pointerY;
    if (morphElement && morphElement.isConnected) {
      var rect = morphElement.getBoundingClientRect();
      var radius = parseFloat(getComputedStyle(morphElement).borderRadius);
      morphRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        radius: Number.isFinite(radius) ? radius : 8,
      };
    } else {
      morphRect = null;
    }
    if (!magnetMeasurements.length || context.input.scrolled || context.input.resized || layoutDirty) {
      magnetMeasurements = magnets.map(function (magnet) {
        if (!magnet.element.isConnected) return null;
        var rect = magnet.element.getBoundingClientRect();
        return { magnet: magnet, rect: rect };
      });
    }
    spotlightRect = spotlightElement && spotlightElement.isConnected
      ? spotlightElement.getBoundingClientRect()
      : null;
  }

  function computeCursor(context) {
    if (!cursor) return;
    var positionEase = 1 - Math.exp(-context.deltaSeconds * 18);
    var ringEase = 1 - Math.exp(-context.deltaSeconds * 13);
    cursorPosition.x += (cursorTarget.x - cursorPosition.x) * positionEase;
    cursorPosition.y += (cursorTarget.y - cursorPosition.y) * positionEase;

    if (morphRect && morphRect.width && morphRect.height) {
      ringTarget.width = morphRect.width + 14;
      ringTarget.height = morphRect.height + 14;
      ringTarget.radius = morphRect.radius;
      ringTarget.offsetX = morphRect.left + morphRect.width / 2 - cursorTarget.x;
      ringTarget.offsetY = morphRect.top + morphRect.height / 2 - cursorTarget.y;
    } else {
      ringTarget.width = 28;
      ringTarget.height = 28;
      ringTarget.radius = 50;
      ringTarget.offsetX = 0;
      ringTarget.offsetY = 0;
    }
    Object.keys(ring).forEach(function (key) {
      ring[key] += (ringTarget[key] - ring[key]) * ringEase;
    });

    var magnetsMoving = false;
    magnetMeasurements.forEach(function (measurement) {
      if (!measurement) return;
      var magnet = measurement.magnet;
      var rect = measurement.rect;
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = cursorTarget.x - cx;
      var dy = cursorTarget.y - cy;
      var distance = Math.hypot(dx, dy);
      var radius = Math.max(rect.width, rect.height) * 0.9;
      var active = distance < radius;
      var factor = active ? (1 - distance / radius) * magnet.strength : 0;
      var nextX = dx * factor;
      var nextY = dy * factor;
      magnetsMoving = magnetsMoving || Math.abs(nextX - magnet.x) > 0.02 || Math.abs(nextY - magnet.y) > 0.02;
      magnet.active = active;
      magnet.x = nextX;
      magnet.y = nextY;
    });

    cursorMoving =
      Math.abs(cursorTarget.x - cursorPosition.x) > 0.1 ||
      Math.abs(cursorTarget.y - cursorPosition.y) > 0.1 ||
      Math.abs(ring.width - ringTarget.width) > 0.2 ||
      Math.abs(ring.height - ringTarget.height) > 0.2 ||
      Math.abs(ring.radius - ringTarget.radius) > 0.2 ||
      Math.abs(ring.offsetX - ringTarget.offsetX) > 0.2 ||
      Math.abs(ring.offsetY - ringTarget.offsetY) > 0.2 ||
      Math.abs(ring.scale - ringTarget.scale) > 0.01 ||
      magnetsMoving;
  }

  function mutateCursor(context) {
    if (!cursor) return;
    cursor.style.transform = "translate3d(" + cursorPosition.x.toFixed(2) + "px," + cursorPosition.y.toFixed(2) + "px,0)";
    // Keep the contextual proof label inside the viewport without measuring
    // it on every frame. The fixed maximum width is part of the CSS contract.
    var viewportWidth = context.input.viewportWidth || window.innerWidth || 1;
    var viewportHeight = context.input.viewportHeight || window.innerHeight || 1;
    cursor.classList.toggle("label-left", cursorTarget.x > viewportWidth - 270);
    // Reserve the bottom proof rail and mobile browser chrome instead of
    // waiting until the label is technically outside the viewport.
    cursor.classList.toggle("label-up", cursorTarget.y > viewportHeight - 150);
    if (cursorCoords) {
      cursorCoords.textContent = morphRect
        ? (cursorSection ? "#" + cursorSection.toUpperCase() + " · " : "") +
          Math.round(morphRect.width) + "×" + Math.round(morphRect.height)
        : "X" + String(Math.round(cursorTarget.x)).padStart(4, "0") +
          " / Y" + String(Math.round(cursorTarget.y)).padStart(4, "0");
    }
    if (cursorRing) {
      cursorRing.style.width = ring.width.toFixed(2) + "px";
      cursorRing.style.height = ring.height.toFixed(2) + "px";
      cursorRing.style.marginLeft = (-ring.width / 2).toFixed(2) + "px";
      cursorRing.style.marginTop = (-ring.height / 2).toFixed(2) + "px";
      cursorRing.style.borderRadius = ring.radius.toFixed(1) + "px";
      cursorRing.style.setProperty("--sc-ring-x", ring.offsetX.toFixed(2) + "px");
      cursorRing.style.setProperty("--sc-ring-y", ring.offsetY.toFixed(2) + "px");
      cursorRing.style.setProperty("--sc-ring-scale", ring.scale.toFixed(3));
    }
    magnetMeasurements.forEach(function (measurement) {
      if (!measurement) return;
      measurement.magnet.element.style.setProperty("--mag-x", measurement.magnet.x.toFixed(2) + "px");
      measurement.magnet.element.style.setProperty("--mag-y", measurement.magnet.y.toFixed(2) + "px");
    });
    if (spotlightElement && spotlightRect && spotlightRect.width && spotlightRect.height) {
      var x = ((context.input.pointerX - spotlightRect.left) / spotlightRect.width) * 100;
      var y = ((context.input.pointerY - spotlightRect.top) / spotlightRect.height) * 100;
      spotlightElement.style.setProperty("--mx", Math.max(0, Math.min(100, x)).toFixed(1) + "%");
      spotlightElement.style.setProperty("--my", Math.max(0, Math.min(100, y)).toFixed(1) + "%");
    }
  }

  function measureLayout(context) {
    if (!layoutDirty && !context.input.scrolled && !context.input.resized) return;
    var height = context.input.viewportHeight || window.innerHeight || 1;
    var lite = context.policy.reducedMotion || context.policy.tier === "low";
    // Once the low-tier final pose has been published there is no scroll-owned
    // layout work left: pin/parallax are disabled, reveals are complete and
    // motion-zone proximity is maintained by IntersectionObserver. Returning
    // here removes a periodic all-section getBoundingClientRect sweep that was
    // visible as a 50-80 ms hitch on mobile Chromium.
    if (lite && !layoutDirty && !context.input.resized) {
      pinMeasurements = [];
      parallaxMeasurements = [];
      motionZoneMeasurements = [];
      visiblePendingReveals = [];
      visiblePendingSections = [];
      return;
    }
    if (lite) {
      pinMeasurements = [];
      parallaxMeasurements = [];
    } else {
      pinMeasurements = pinHosts.map(function (element) {
        if (!element.isConnected) return null;
        var rect = element.getBoundingClientRect();
        var range = rect.height - height;
        return {
          element: element,
          value: range > 0 ? Math.max(0, Math.min(1, -rect.top / range)) : 0,
        };
      });
      parallaxMeasurements = Array.from(visibleParallax).map(function (element) {
        if (!element.isConnected) return null;
        var rect = element.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > height + 100) return null;
        var speed = parseFloat(element.getAttribute("data-plx")) || 0.05;
        return {
          element: element,
          value: -(rect.top + rect.height / 2 - height / 2) * speed,
        };
      });
    }
    // IntersectionObserver remains the low-cost primary path. This shared
    // geometry pass is only a bounded fallback for throttled/delayed observer
    // delivery. Reading every chapter on every scroll frame forced avoidable
    // layout work precisely on constrained devices, after the policy had
    // already removed their decorative transforms.
    var sweepInterval = 96;
    var sweepDue = layoutDirty || context.input.resized || (!lite && context.now - lastFallbackSweepAt >= sweepInterval);
    motionZoneMeasurements = [];
    visiblePendingReveals = [];
    visiblePendingSections = [];
    if (sweepDue) {
      lastFallbackSweepAt = context.now;
      var zoneMargin = height * 0.65;
      motionZoneMeasurements = Array.from(motionZones).map(function (element) {
        if (!element.isConnected) return null;
        var rect = element.getBoundingClientRect();
        return { element: element, near: rect.bottom >= -zoneMargin && rect.top <= height + zoneMargin };
      });
      pendingReveals.forEach(function (element) {
        if (isVisible(element, 220)) visiblePendingReveals.push(element);
      });
      pendingSections.forEach(function (element) {
        if (isVisible(element, 220)) visiblePendingSections.push(element);
      });
    }
    layoutDirty = false;
  }

  function mutateLayout() {
    pinMeasurements.forEach(function (measurement) {
      if (measurement) measurement.element.style.setProperty("--pin-p", measurement.value.toFixed(4));
    });
    if (!currentPolicy().reducedMotion) {
      parallaxMeasurements.forEach(function (measurement) {
        if (measurement) measurement.element.style.setProperty("--plx", measurement.value.toFixed(1) + "px");
      });
    }
    motionZoneMeasurements.forEach(function (measurement) {
      if (measurement) measurement.element.classList.toggle("is-motion-near", measurement.near);
    });
    visiblePendingReveals.forEach(function (element) { reveal(element, true); });
    visiblePendingSections.forEach(enterSection);
  }

  function buildCenterStage() {
    if (centerObserver) {
      centerObserver.disconnect();
      centerObserver = null;
    }
    currentCenterCard = null;
    var state = currentPolicy();
    if (state.pointerClass !== "coarse" || state.reducedMotion || !("IntersectionObserver" in window)) return;
    centerObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("in-focus", entry.isIntersecting);
        if (entry.isIntersecting) {
          currentCenterCard = entry.target;
          try {
            window.dispatchEvent(new CustomEvent("sm:focus-card", { detail: { el: entry.target } }));
          } catch (error) { /* optional */ }
        } else if (currentCenterCard === entry.target) {
          currentCenterCard = null;
          try { window.dispatchEvent(new CustomEvent("sm:focus-card", { detail: { el: null } })); }
          catch (error) { /* optional */ }
        }
      });
    }, { rootMargin: "-38% 0px -38% 0px", threshold: 0 });
    document.querySelectorAll(".proj-card").forEach(function (card) { centerObserver.observe(card); });
  }

  function onPolicyChange(tier, state) {
    // Reduced-motion publishes every final pose immediately. Low tier keeps
    // observer-driven chapter entry (one cheap fade), but the layout pass below
    // never performs fallback document sweeps during active scrolling.
    if (state.reducedMotion) revealEverything();
    if (shouldUseCursor()) buildCursor();
    else removeCursor();
    refreshInteractiveElements();
    buildCenterStage();
  }

  function refresh() {
    if (!initialized) return;
    refreshMotionZones();
    bindRevealElements();
    refreshInteractiveElements();
    buildCenterStage();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    buildObservers();
    buildCursor();
    listen(document, "pointerover", onPointerOver, { passive: true });
    listen(document, "pointerout", onPointerOut, { passive: true });
    listen(window, "pointerdown", onPointerDown, { passive: true });
    listen(window, "pointerup", onPointerUp, { passive: true });
    listen(document, "pointerleave", onPointerLeave, { passive: true });
    listen(document, "pointerenter", onPointerEnter, { passive: true });

    if (runtime) {
      runtimeCleanup.push(runtime.subscribe({
        id: "authored-cursor",
        priority: 20,
        enabled: function () { return Boolean(cursor); },
        continuous: function () { return cursorMoving; },
        measure: measureCursor,
        compute: computeCursor,
        mutate: mutateCursor,
      }));
      runtimeCleanup.push(runtime.subscribe({
        id: "scroll-composition",
        priority: 30,
        continuous: false,
        measure: measureLayout,
        mutate: mutateLayout,
      }));
    }
    if (policy && typeof policy.on === "function") unsubscribePolicy = policy.on(onPolicyChange);
    refresh();
  }

  function dispose() {
    if (!initialized) return;
    initialized = false;
    unsubscribePolicy();
    unsubscribePolicy = function () {};
    while (runtimeCleanup.length) runtimeCleanup.pop()();
    while (cleanup.length) {
      try { cleanup.pop()(); } catch (error) { /* best effort */ }
    }
    while (timers.length) clearTimeout(timers.pop());
    if (revealObserver) revealObserver.disconnect();
    if (sectionObserver) sectionObserver.disconnect();
    if (centerObserver) centerObserver.disconnect();
    if (parallaxObserver) parallaxObserver.disconnect();
    if (motionZoneObserver) motionZoneObserver.disconnect();
    revealObserver = null;
    sectionObserver = null;
    centerObserver = null;
    parallaxObserver = null;
    motionZoneObserver = null;
    motionZones.forEach(function (section) { section.classList.remove("is-motion-near"); });
    motionZones.clear();
    document.documentElement.classList.remove("motion-zones");
    revealEverything();
    pendingReveals.clear();
    pendingSections.clear();
    removeCursor();
    magnets = [];
    pinHosts = [];
    parallaxElements = [];
    visibleParallax.clear();
    pinMeasurements = [];
    parallaxMeasurements = [];
    motionZoneMeasurements = [];
    visiblePendingReveals = [];
    visiblePendingSections = [];
    magnetMeasurements = [];
    lastFallbackSweepAt = 0;
    spotlightElement = null;
    spotlightRect = null;
    morphElement = null;
    morphRect = null;
  }

  window.Motion = {
    init: init,
    refresh: refresh,
    dispose: dispose,
    checkVisible: function () {
      pendingReveals.forEach(function (element) {
        if (isVisible(element, 220)) reveal(element, true);
      });
      pendingSections.forEach(function (element) {
        if (isVisible(element, 220)) enterSection(element);
      });
    },
    plxTick: function () {
      layoutDirty = true;
      if (runtime) runtime.wake("manual-parallax");
    },
    setLabel: function (text) { setCursorMode(cursorMode === "default" ? "link" : cursorMode, text); },
    clearLabel: function () { setCursorMode("default", ""); },
    __debug: function () {
      return {
        initialized: initialized,
        cursor: Boolean(cursor),
        cursorMoving: cursorMoving,
        magnets: magnets.length,
        measuredMagnets: magnetMeasurements.filter(Boolean).length,
        pins: pinHosts.length,
        parallax: parallaxElements.length,
        activeParallax: visibleParallax.size,
        motionZones: motionZones.size,
        activeMotionZones: document.querySelectorAll("section[data-section].is-motion-near").length,
        pendingReveals: pendingReveals.size,
        pendingSections: pendingSections.size,
        runtimeSubscribers: runtime
          ? runtime.__debug().subscriberIds.filter(function (id) {
              return id === "authored-cursor" || id === "scroll-composition";
            })
          : [],
      };
    },
  };
})();
