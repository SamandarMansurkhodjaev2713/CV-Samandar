// Readiness-driven opening sequence.
//
// The head script paints a complete frame zero immediately and publishes
// window.__SM_INTRO. This module enriches that frame, but never treats elapsed
// time as proof that the application is ready. BUILD is the visual timeline;
// VERIFY waits for the mounted shell, critical fonts and the selected Hero
// media (or an explicit fallback); SHIP performs the reveal.
(function () {
  "use strict";

  var FIRST = {
    visualMs: 1750,
    minMs: 2100,
    skipMinMs: 1300,
    hardRevealMs: 2550,
    recoveryMs: 2750,
    revealMs: 420,
    holdMs: 90,
  };
  var REPEAT = {
    visualMs: 1050,
    minMs: 1350,
    skipMinMs: 900,
    hardRevealMs: 1650,
    recoveryMs: 1850,
    revealMs: 330,
    holdMs: 60,
  };
  var CORE_Y = 0.42;
  var PARTICLE_COUNT = 9;

  function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
  }

  function easeOutCubic(value) {
    var t = clamp01(value);
    return 1 - Math.pow(1 - t, 3);
  }

  function readRGB(name, fallback) {
    try {
      var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      var values = raw.split(/[\s,/]+/).map(Number).filter(function (value) {
        return !isNaN(value);
      });
      if (values.length >= 3) return values.slice(0, 3);
    } catch (error) { /* CSS is an enhancement, not a gate. */ }
    return fallback;
  }

  function run() {
    var intent = window.__SM_INTRO;
    var panel = intent && intent.panel;
    if (!intent || !panel || !panel.parentNode || intent.__started) return;
    intent.__started = true;

    if (intent.safety) {
      window.clearTimeout(intent.safety);
      intent.safety = 0;
    }

    var repeatVisit = false;
    try {
      repeatVisit = sessionStorage.getItem("sm-intro-seen") === "1";
      sessionStorage.setItem("sm-intro-seen", "1");
    } catch (error) { /* Storage may be unavailable. */ }

    var reduced = intent.mode === "reduced";
    var timing = repeatVisit ? REPEAT : FIRST;
    var createdAt = Number(intent.createdAt) || performance.now();
    var accent = readRGB("--accent-rgb", [217, 119, 87]);
    var accent2 = readRGB("--accent-2-rgb", [200, 155, 94]);

    var frameId = 0;
    var timerId = 0;
    var hardTimer = 0;
    var resizeHandler = null;
    var readinessHandler = null;
    var skipTimer = 0;
    var finished = false;
    var revealing = false;
    var skipRequested = false;
    var prepared = false;
    var displayed = -1;
    var logIndex = -1;
    var lastStatus = "";

    var boot;
    var percent;
    var progress;
    var state;
    var status;
    var proofSteps;
    var log;
    var clock;
    var skipButton;
    var canvas;
    var context;
    var particles;
    var width = 0;
    var height = 0;
    var dpr = 1;

    var BOOT_LINES = (function () {
      try {
        var lines = window.CONTENT && window.CONTENT.ru &&
          window.CONTENT.ru.hero && window.CONTENT.ru.hero.boot_lines;
        if (lines && lines.length) return lines.slice();
      } catch (error) { /* Use the stable fallback below. */ }
      return [
        "init product.system ... ok",
        "mount semantic.shell ... ok",
        "verify type.and.media ... ok",
        "bind quality.runtime ... ok",
        "ship READY",
      ];
    })();

    var BUILD_TAG = (function () {
      try {
        var script = document.querySelector('script[src*="?v="]');
        var match = script && String(script.src).match(/[?&]v=([^&]+)/);
        return match ? "BUILD " + match[1] : "BUILD 2026";
      } catch (error) {
        return "BUILD 2026";
      }
    })();

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function formatLine(value) {
      var text = String(value == null ? "" : value);
      var match = text.match(/^(.*?)(ok|READY|done)\s*$/);
      if (!match) return escapeHtml(text);
      return escapeHtml(match[1]) +
        '<span class="sm-boot-ok">' + escapeHtml(match[2]) + "</span>";
    }

    function formatClock(milliseconds) {
      var seconds = Math.max(0, Math.floor(milliseconds / 1000));
      return "T+00:" +
        String(Math.floor(seconds / 60) % 100).padStart(2, "0") + ":" +
        String(seconds % 60).padStart(2, "0");
    }

    function readiness() {
      var ready = intent.ready || {};
      return {
        shell: ready.shell === true,
        fonts: ready.fonts === true,
        hero: ready.hero === true,
      };
    }

    function isReady() {
      var ready = readiness();
      return ready.shell && ready.fonts && ready.hero;
    }

    function currentStatus(value) {
      var ready = readiness();
      if (value < 44) return "ASSEMBLING SYSTEM";
      if (!ready.shell) return "MOUNTING SHELL";
      if (!ready.fonts) return "VERIFYING TYPE";
      if (!ready.hero) return "CALIBRATING SCENE";
      if (value < 90) return "SYSTEMS VERIFIED";
      return "READY TO SHIP";
    }

    function setStatus(next) {
      if (!status || next === lastStatus) return;
      lastStatus = next;
      status.textContent = next;
    }

    function renderLog() {
      if (!log || logIndex < 0) return;
      var first = Math.max(0, logIndex - 2);
      var html = "";
      for (var index = first; index <= logIndex; index += 1) {
        html += '<div class="' + (index === logIndex ? "cur" : "on") + '">' +
          formatLine(BOOT_LINES[index]) + "</div>";
      }
      log.innerHTML = html;
    }

    function revealLogTo(index) {
      var next = Math.min(index, BOOT_LINES.length - 1);
      if (next <= logIndex) return;
      logIndex = next;
      renderLog();
    }

    function setLog(value) {
      if (BOOT_LINES.length < 2) return;
      var next = Math.floor(clamp01(value / 90) * (BOOT_LINES.length - 1));
      revealLogTo(Math.min(next, BOOT_LINES.length - 2));
    }

    function updateProof(value) {
      if (!proofSteps || !proofSteps.length) return;
      var active = value < 44 ? 0 : value < 90 ? 1 : 2;
      var ready = readiness();
      for (var index = 0; index < proofSteps.length; index += 1) {
        proofSteps[index].classList.toggle("is-active", index === active);
        var done = index < active;
        if (index === 1 && ready.shell && ready.fonts && ready.hero) done = true;
        if (revealing) done = true;
        proofSteps[index].classList.toggle("is-done", done);
      }
    }

    function setPercent(value) {
      var next = Math.round(Math.max(0, Math.min(100, value)));
      if (next === displayed) return;
      displayed = next;
      if (percent) percent.textContent = String(next).padStart(2, "0");
      if (progress) progress.style.width = next + "%";
      if (state && !revealing) {
        state.textContent = next < 44 ? "BUILD" : next < 90 ? "VERIFY" : "SHIP";
      }
      updateProof(next);
      setStatus(currentStatus(next));

      if (!prepared && next >= 78) {
        prepared = true;
        intent.prepared = true;
        try {
          window.dispatchEvent(new CustomEvent("sm:intro-prep"));
        } catch (error) { /* Optional animation hand-off. */ }
      }
    }

    function sizeParticles() {
      if (!canvas || !context) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function setupParticles() {
      if (!canvas) return;
      context = canvas.getContext("2d");
      if (!context) return;
      particles = new Array(PARTICLE_COUNT);
      for (var index = 0; index < PARTICLE_COUNT; index += 1) {
        particles[index] = {
          x: 0.14 + (((index * 37) % 71) / 100),
          y: 0.18 + (((index * 53) % 64) / 100),
          speed: 0.35 + (((index * 19) % 30) / 100),
          size: 0.8 + (((index * 29) % 14) / 10),
          warm: index % 4 === 0,
        };
      }
      sizeParticles();
      resizeHandler = sizeParticles;
      window.addEventListener("resize", resizeHandler, { passive: true });
    }

    function drawParticles(now) {
      if (!context || !particles) return;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = "lighter";
      for (var index = 0; index < particles.length; index += 1) {
        var particle = particles[index];
        var drift = Math.sin(now * 0.0004 * particle.speed + index) * 10;
        var rise = ((now * 0.000015 * particle.speed + particle.y) % 0.78);
        var x = particle.x * width + drift;
        var y = height * (0.9 - rise);
        var alpha = 0.12 + Math.sin(now * 0.001 + index) * 0.05;
        var color = particle.warm ? accent2 : accent;
        context.fillStyle = "rgba(" + color.join(",") + "," + alpha.toFixed(3) + ")";
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      context.globalCompositeOperation = "source-over";
    }

    function buildDom() {
      panel.removeAttribute("style");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-modal", "true");
      panel.setAttribute("aria-label", "Portfolio loading sequence");
      panel.setAttribute("aria-busy", "true");
      panel.innerHTML = "";
      panel.style.background =
        "linear-gradient(180deg, rgba(31,30,27,.96), #1F1E1B)," +
        "radial-gradient(circle at 68% 42%, rgba(" + accent.join(",") + ",.12), transparent 42%)";

      var instrument = document.createElement("div");
      instrument.className = "sm-boot-instrument";
      instrument.setAttribute("aria-hidden", "true");
      instrument.innerHTML =
        '<span class="sm-boot-aperture sm-boot-aperture--a"></span>' +
        '<span class="sm-boot-aperture sm-boot-aperture--b"></span>' +
        '<picture><source media="(max-width:760px)" srcset="assets/hero/responsive/proof-instrument-768.webp">' +
        '<img src="assets/hero/responsive/proof-instrument-1152.webp" width="1152" height="768" alt="" decoding="async"></picture>';
      panel.appendChild(instrument);

      if (!reduced) {
        canvas = document.createElement("canvas");
        canvas.className = "sm-boot-particles";
        canvas.setAttribute("aria-hidden", "true");
        panel.appendChild(canvas);
        setupParticles();

        var core = document.createElement("div");
        core.className = "sm-boot-core";
        core.style.top = (CORE_Y * 100).toFixed(1) + "%";
        core.setAttribute("aria-hidden", "true");
        core.innerHTML = "<b></b><i></i>";
        panel.appendChild(core);
      }

      boot = document.createElement("div");
      boot.className = "sm-boot";
      boot.style.top = (CORE_Y * 100).toFixed(1) + "%";
      boot.innerHTML =
        '<div class="sm-boot-label mono">SAMANDAR / PRODUCT LAB <span class="sm-boot-state">BUILD</span></div>' +
        '<div class="sm-boot-proof mono" aria-hidden="true"><span>BUILD</span><span>VERIFY</span><span>SHIP</span></div>' +
        '<div class="sm-boot-pct" aria-hidden="true"><span class="sm-boot-pct-n">00</span><span class="sm-boot-pct-sign">%</span></div>' +
        '<div class="sm-boot-line" aria-hidden="true"><i></i></div>' +
        '<div class="sm-boot-status mono" role="status" aria-live="polite">INITIALIZING</div>' +
        '<div class="sm-boot-log mono" aria-hidden="true"></div>';
      panel.appendChild(boot);

      percent = boot.querySelector(".sm-boot-pct-n");
      progress = boot.querySelector(".sm-boot-line > i");
      state = boot.querySelector(".sm-boot-state");
      status = boot.querySelector(".sm-boot-status");
      proofSteps = Array.prototype.slice.call(boot.querySelectorAll(".sm-boot-proof span"));
      log = boot.querySelector(".sm-boot-log");

      var telemetryLeft = document.createElement("div");
      telemetryLeft.className = "sm-boot-tele sm-boot-tele--l mono";
      telemetryLeft.setAttribute("aria-hidden", "true");
      telemetryLeft.innerHTML =
        "<div><b>TASHKENT</b> · UZ</div><div>41.31°N · 69.24°E · UTC+5</div>";
      panel.appendChild(telemetryLeft);

      var telemetryRight = document.createElement("div");
      telemetryRight.className = "sm-boot-tele sm-boot-tele--r mono";
      telemetryRight.setAttribute("aria-hidden", "true");
      telemetryRight.innerHTML =
        "<div>SM · " + escapeHtml(BUILD_TAG) + "</div>" +
        '<div class="sm-boot-clock"><b>T+00:00:00</b></div>';
      panel.appendChild(telemetryRight);
      clock = telemetryRight.querySelector(".sm-boot-clock b");

      skipButton = document.createElement("button");
      skipButton.className = "sm-boot-skip mono";
      skipButton.type = "button";
      skipButton.textContent = "SKIP INTRO";
      skipButton.setAttribute("aria-label", "Пропустить интро");
      skipButton.addEventListener("click", requestSkip);
      panel.appendChild(skipButton);
      skipTimer = window.setTimeout(function () {
        if (skipButton) skipButton.classList.add("is-visible");
      }, repeatVisit ? 450 : 760);
    }

    function requestSkip() {
      if (finished || revealing) return;
      skipRequested = true;
      panel.setAttribute("data-skip-requested", "true");
      setStatus(isReady() ? "READY TO SHIP" : "FINALIZING");
    }

    function onKeydown(event) {
      if (event.key === "Escape") requestSkip();
    }

    function onGesture() {
      var elapsed = performance.now() - createdAt;
      if (elapsed >= (repeatVisit ? 450 : 760)) requestSkip();
    }

    function attachListeners() {
      window.addEventListener("keydown", onKeydown, true);
      window.addEventListener("wheel", onGesture, { passive: true });
      window.addEventListener("touchstart", onGesture, { passive: true });
      readinessHandler = function () {
        updateProof(displayed < 0 ? 0 : displayed);
        setStatus(currentStatus(displayed < 0 ? 0 : displayed));
      };
      window.addEventListener("sm:intro-readiness", readinessHandler);
    }

    function detachListeners() {
      window.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("wheel", onGesture);
      window.removeEventListener("touchstart", onGesture);
      if (readinessHandler) {
        window.removeEventListener("sm:intro-readiness", readinessHandler);
        readinessHandler = null;
      }
      if (skipButton) skipButton.removeEventListener("click", requestSkip);
    }

    function stopDrivers() {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = 0;
      }
      if (hardTimer) {
        window.clearTimeout(hardTimer);
        hardTimer = 0;
      }
      if (skipTimer) {
        window.clearTimeout(skipTimer);
        skipTimer = 0;
      }
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
        resizeHandler = null;
      }
    }

    function teardown(reason) {
      if (finished) return;
      finished = true;
      intent.durationMs = Math.round(performance.now() - createdAt);
      stopDrivers();
      detachListeners();
      if (panel.parentNode) panel.remove();
      var inlineStyle = document.getElementById("sm-intro-frame-style");
      if (inlineStyle) inlineStyle.remove();
      if (typeof intent.release === "function") intent.release(reason || "complete");
      else {
        document.documentElement.classList.remove("intro-lock");
        document.documentElement.style.overflow = intent.previousOverflow || "";
        document.documentElement.removeAttribute("aria-busy");
        try {
          window.dispatchEvent(new CustomEvent("sm:intro-done"));
        } catch (error) { /* Optional channel. */ }
      }
    }

    function recover() {
      if (finished) return;
      finished = true;
      stopDrivers();
      detachListeners();
      if (typeof intent.recover === "function") {
        intent.recover("01");
      } else {
        teardown("recovery");
      }
    }

    function startReveal(reason) {
      if (finished || revealing) return;
      revealing = true;
      stopDrivers();
      detachListeners();
      intent.revealReason = reason;
      setPercent(100);
      revealLogTo(BOOT_LINES.length - 1);
      if (state) state.textContent = "ONLINE";
      setStatus("ONLINE");
      if (boot) boot.classList.add("is-online");
      updateProof(100);

      // A saturated host may deliver the readiness/deadline callback long
      // after its intended wall-clock moment. In that case another hold plus
      // curtain transition would only keep an invisible interaction shield
      // alive. Preserve the full authored exit during normal timing and cut
      // directly to the already-rendered Hero once the hard allowance passed.
      if (performance.now() - createdAt >= timing.recoveryMs + 650) {
        teardown((reason || "complete") + "-late-cut");
        return;
      }

      window.setTimeout(function () {
        if (reduced) {
          var finishReduced = function () { teardown(reason); };
          panel.addEventListener("transitionend", finishReduced, { once: true });
          panel.style.transition = "opacity .14s ease";
          panel.style.opacity = "0";
          window.setTimeout(finishReduced, 190);
          return;
        }

        // A real horizon shutter: the curtain collapses into the same visual
        // line that continues through Hero. clip-path is interpolated in both
        // Blink and WebKit, unlike the former one-frame radial mask swap.
        var finishReveal = function () { teardown(reason); };
        panel.addEventListener("transitionend", function onRevealEnd(event) {
          if (event.target === panel &&
              (event.propertyName === "clip-path" || event.propertyName === "-webkit-clip-path")) {
            finishReveal();
          }
        });
        panel.style.clipPath = "inset(0 0 0 0)";
        panel.style.webkitClipPath = "inset(0 0 0 0)";
        panel.getBoundingClientRect();
        panel.style.transition =
          "clip-path " + timing.revealMs + "ms cubic-bezier(.76,0,.24,1)," +
          "-webkit-clip-path " + timing.revealMs + "ms cubic-bezier(.76,0,.24,1)," +
          "opacity " + timing.revealMs + "ms ease";
        window.requestAnimationFrame(function () {
          panel.style.clipPath = "inset(50% 0 50% 0)";
          panel.style.webkitClipPath = "inset(50% 0 50% 0)";
          panel.style.opacity = "0.18";
        });
        window.setTimeout(finishReveal, timing.revealMs + 80);
      }, timing.holdMs);
    }

    function visualProgress(elapsed) {
      if (elapsed <= timing.visualMs) {
        return easeOutCubic(elapsed / timing.visualMs) * 90;
      }
      var creep = clamp01((elapsed - timing.visualMs) /
        Math.max(320, timing.hardRevealMs - timing.visualMs));
      return 90 + (6 * easeOutCubic(creep));
    }

    function tick(now) {
      if (finished || revealing) return;
      var elapsed = now - createdAt;
      var value = visualProgress(elapsed);
      setPercent(value);
      setLog(value);
      if (clock) clock.textContent = formatClock(elapsed);
      if (!reduced) drawParticles(now);

      var ready = isReady();
      var eligible = elapsed >= timing.minMs;
      var skipEligible = skipRequested && elapsed >= timing.skipMinMs;

      if (ready && (eligible || skipEligible)) {
        startReveal(skipEligible ? "skip-ready" : "ready");
        return;
      }

      if (elapsed >= timing.hardRevealMs && readiness().shell) {
        var readyState = readiness();
        if (!readyState.fonts) intent.fallback.fonts = true;
        if (!readyState.hero) intent.fallback.hero = true;
        startReveal("deadline-fallback");
        return;
      }

      if (elapsed >= timing.recoveryMs && !readiness().shell) {
        recover();
        return;
      }

      if (skipRequested && !ready) setStatus("FINALIZING");
      if (reduced) {
        timerId = window.setTimeout(function () {
          tick(performance.now());
        }, 60);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    try {
      buildDom();
      attachListeners();
      setPercent(0);
      setLog(0);
    } catch (error) {
      if (readiness().shell) teardown("setup-fallback");
      else recover();
      return;
    }

    var remainingRecovery = Math.max(50, timing.recoveryMs - (performance.now() - createdAt));
    hardTimer = window.setTimeout(function () {
      if (finished || revealing) return;
      if (readiness().shell) startReveal("wall-clock-fallback");
      else recover();
    }, remainingRecovery + 40);

    if (reduced) tick(performance.now());
    else frameId = window.requestAnimationFrame(tick);
  }

  window.SMIntro = { run: run };
  run();
})();
