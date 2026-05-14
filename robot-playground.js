// robot-playground.js — Dashboard-style remote control for the hero robot.
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// v48 redesign: the previous version was a code-editor with a tiny mini face
// in the header. Users could write a DSL script but had nothing to LOOK at
// while doing so. The new version flips that: a big animated robot face is
// the visual centerpiece, big tactile preset buttons are the primary input,
// and the code editor is collapsed behind a "show script" toggle for users
// who want full DSL control.
//
// Security boundary is unchanged: NO eval / new Function. Scripts are parsed
// by strict regex → step list → dispatch CustomEvents on `window`. The Hero
// component listens for `robot-control` and forwards to the real Spline /
// fallback controller.
//
// DSL GRAMMAR (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
//   line     := comment | step
//   step     := exprCall | motionCall | waveCall | waitCall
//   exprCall := "robot." ("happy"|"think"|"sleep"|"surprise"|"idle") "()"
//   motionCall := "robot.motion(" number ")"        ; 0..2
//   waveCall := "robot.wave()"                      ; transient
//   waitCall := "wait(" int ")"                     ; ms, 0..5000
//
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
//   const pg = window.RobotPlayground.create(rootEl, opts)
//     opts.initialScript    — string to seed the editor
//     opts.onStatus         — (state: {kind, message, line?}) => void
//   pg.run()      → Promise<void>
//   pg.stop()
//   pg.dispose()
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────────────
  const ALLOWED_EXPRESSIONS = ["happy", "think", "sleep", "surprise", "idle"];

  const EXPRESSION_ALIAS = {
    happy: "happy",
    think: "thinking",
    sleep: "sleeping",
    surprise: "surprised",
    idle: "idle",
  };

  const WAIT_MIN_MS = 0;
  const WAIT_MAX_MS = 5000;
  const MOTION_MIN = 0;
  const MOTION_MAX = 2;
  const MAX_STEPS = 64;

  // Default script for the (now collapsible) editor.
  const DEFAULT_SCRIPT = [
    "// build your own sequence",
    "robot.happy()",
    "wait(700)",
    "robot.think()",
    "wait(700)",
    "robot.surprise()",
    "wait(500)",
    "robot.motion(1.4)",
    "robot.wave()",
    "wait(900)",
    "robot.idle()",
    "robot.motion(1)",
  ].join("\n");

  const REGEX_COMMENT = /^\/\/.*$/;
  const REGEX_EXPR    = /^robot\.(happy|think|sleep|surprise|idle)\(\)$/;
  const REGEX_WAVE    = /^robot\.wave\(\)$/;
  const REGEX_MOTION  = /^robot\.motion\((-?\d+(?:\.\d+)?)\)$/;
  const REGEX_WAIT    = /^wait\((\d+)\)$/;

  const CONTROL_EVENT = "robot-control";

  // Preset buttons. Each is an action plus a custom SVG icon path. No emoji
  // anywhere — SVG keeps theming consistent and respects the accent palette.
  // Action kinds:
  //   "expr"    — fire setExpression(value)
  //   "wave"    — cycle expression (Spline click)
  //   "motion"  — set motion (value 0..2)
  const PRESETS = [
    { id: "idle",     label: "idle",     kind: "expr",   value: "idle" },
    { id: "happy",    label: "happy",    kind: "expr",   value: "happy" },
    { id: "think",    label: "think",    kind: "expr",   value: "thinking" },
    { id: "surprise", label: "surprise", kind: "expr",   value: "surprised" },
    { id: "sleep",    label: "sleep",    kind: "expr",   value: "sleeping" },
    { id: "wave",     label: "wave",     kind: "wave",   value: null },
    { id: "slow",     label: "slow",     kind: "motion", value: 0.5 },
    { id: "fast",     label: "fast",     kind: "motion", value: 1.6 },
  ];

  // Custom SVG icons for each preset — drawn over a 24×24 viewBox. Style:
  // monoline 2px stroke, rounded caps/joins, currentColor so they inherit
  // the accent. Defined as path strings to keep the source compact.
  const PRESET_ICONS = {
    idle:     '<line x1="6"  y1="10" x2="18" y2="10" /><line x1="6" y1="14" x2="18" y2="14" />',
    happy:    '<circle cx="12" cy="12" r="8" /><path d="M9 14 Q12 17 15 14" /><circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none"/>',
    think:    '<circle cx="12" cy="11" r="7" /><path d="M10 9 Q11 7 13 8 Q15 9 13 11 L12 12 L12 13" /><circle cx="12" cy="16" r="0.8" fill="currentColor" stroke="none"/>',
    surprise: '<circle cx="12" cy="12" r="8" /><line x1="12" y1="7"  x2="12" y2="13" /><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/>',
    sleep:    '<path d="M19 13 A8 8 0 1 1 11 5 A6 6 0 0 0 19 13 z" /><path d="M7 8 L9 8 L7 11 L9 11" />',
    wave:     '<path d="M5 14 Q7 11 9 14 T13 14 T17 14 T21 14" /><line x1="18" y1="6" x2="21" y2="3" /><line x1="20" y1="9" x2="22" y2="7" />',
    slow:     '<circle cx="12" cy="12" r="8" /><polyline points="12,7 12,12 9,15" />',
    fast:     '<polygon points="5,4 11,12 5,20" fill="currentColor" stroke="none"/><polygon points="13,4 19,12 13,20" fill="currentColor" stroke="none"/>',
  };

  // ── Parser ─────────────────────────────────────────────────────────────
  function parse(text) {
    const steps = [];
    const errors = [];
    const lines = String(text == null ? "" : text).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.replace(/;\s*$/, "").trim();
      if (trimmed.length === 0) continue;
      if (REGEX_COMMENT.test(trimmed)) continue;

      let m;
      if ((m = REGEX_EXPR.exec(trimmed))) {
        steps.push({ kind: "expr", value: EXPRESSION_ALIAS[m[1]], line: i + 1 });
        continue;
      }
      if (REGEX_WAVE.test(trimmed)) {
        steps.push({ kind: "wave", line: i + 1 });
        continue;
      }
      if ((m = REGEX_MOTION.exec(trimmed))) {
        const v = parseFloat(m[1]);
        if (isNaN(v) || v < MOTION_MIN || v > MOTION_MAX) {
          errors.push({ line: i + 1, message: "motion() must be between " + MOTION_MIN + " and " + MOTION_MAX });
        } else {
          steps.push({ kind: "motion", value: v, line: i + 1 });
        }
        continue;
      }
      if ((m = REGEX_WAIT.exec(trimmed))) {
        const v = parseInt(m[1], 10);
        if (isNaN(v) || v < WAIT_MIN_MS || v > WAIT_MAX_MS) {
          errors.push({ line: i + 1, message: "wait() must be between " + WAIT_MIN_MS + " and " + WAIT_MAX_MS + " ms" });
        } else {
          steps.push({ kind: "wait", value: v, line: i + 1 });
        }
        continue;
      }
      errors.push({ line: i + 1, message: 'unknown statement: "' + rawLine.trim() + '"' });
      if (steps.length + errors.length > MAX_STEPS) {
        errors.push({ line: i + 1, message: "too many steps (cap " + MAX_STEPS + ")" });
        break;
      }
    }
    return { steps: steps, errors: errors };
  }

  // ── Executor ───────────────────────────────────────────────────────────
  function execute(steps, hooks) {
    return new Promise(function (resolve) {
      let i = 0;
      let pendingTimer = 0;

      function emit(kind, value) {
        try {
          window.dispatchEvent(new CustomEvent(CONTROL_EVENT, {
            detail: { kind: kind, value: value },
          }));
        } catch (err) {
          console.warn("[RobotPlayground] CustomEvent dispatch failed:", err && err.message);
        }
      }

      function next() {
        if (hooks.isCancelled()) { resolve(); return; }
        if (i >= steps.length) { resolve(); return; }
        const step = steps[i];
        if (typeof hooks.onBeforeStep === "function") {
          try { hooks.onBeforeStep(step, i, steps.length); }
          catch (err) { console.warn("[RobotPlayground] onBeforeStep threw:", err); }
        }
        i++;
        switch (step.kind) {
          case "expr":
            emit("expr", step.value);
            pendingTimer = window.setTimeout(next, 60);
            break;
          case "wave":
            emit("wave", null);
            pendingTimer = window.setTimeout(next, 80);
            break;
          case "motion":
            emit("motion", step.value);
            pendingTimer = window.setTimeout(next, 30);
            break;
          case "wait":
            pendingTimer = window.setTimeout(next, step.value);
            break;
          default:
            next();
        }
      }

      next();
      hooks.cancel = function () {
        if (pendingTimer) { window.clearTimeout(pendingTimer); pendingTimer = 0; }
        resolve();
      };
    });
  }

  // ── DOM scaffolding ────────────────────────────────────────────────────
  function buildPresetButton(preset) {
    const icon = PRESET_ICONS[preset.id] || "";
    return (
      '<button type="button" class="rpg-preset" data-preset-id="' + preset.id + '" aria-label="' + preset.label + '">' +
        '<span class="rpg-preset-ico" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
            icon +
          '</svg>' +
        '</span>' +
        '<span class="rpg-preset-label">' + preset.label + '</span>' +
      '</button>'
    );
  }

  // Build the BIG face SVG. Six mood-distinct visual treatments via data-mood.
  function buildFaceSvg() {
    return (
      '<svg class="rpg-face-svg" viewBox="0 0 120 120" aria-hidden="true">' +
        // Outer glow ring — pulses on every command via .rpg-face-ring is-pulsed.
        '<circle class="rpg-face-ring" cx="60" cy="62" r="52" fill="none" stroke="currentColor" stroke-width="1" stroke-opacity="0.25"/>' +
        // Antenna line + glowing tip.
        '<line class="rpg-face-antenna-line" x1="60" y1="22" x2="60" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<circle class="rpg-face-antenna" cx="60" cy="12" r="3" fill="currentColor"/>' +
        // Head — rounded square.
        '<rect class="rpg-face-head" x="22" y="22" width="76" height="64" rx="14" fill="rgba(20,18,17,0.95)" stroke="currentColor" stroke-width="2"/>' +
        // Eyes — two pills, animate per mood.
        '<g class="rpg-face-eyes" data-rpg-eyes>' +
          '<rect class="rpg-face-eye rpg-face-eye-l" x="38" y="44" width="12" height="9" rx="3" fill="currentColor"/>' +
          '<rect class="rpg-face-eye rpg-face-eye-r" x="70" y="44" width="12" height="9" rx="3" fill="currentColor"/>' +
        '</g>' +
        // Cheek blush (visible only when happy).
        '<g class="rpg-face-blush" aria-hidden="true">' +
          '<ellipse cx="34" cy="64" rx="4" ry="2" fill="currentColor" opacity="0.45"/>' +
          '<ellipse cx="86" cy="64" rx="4" ry="2" fill="currentColor" opacity="0.45"/>' +
        '</g>' +
        // Mouth path — d updated per mood.
        '<path class="rpg-face-mouth" data-rpg-mouth d="M48 70 Q60 74 72 70" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>' +
        // "Z Z" sleep glyphs (visible only when sleeping).
        '<g class="rpg-face-zzz" aria-hidden="true">' +
          '<text x="92" y="36" font-family="var(--f-mono)" font-size="9" fill="currentColor">z</text>' +
          '<text x="100" y="44" font-family="var(--f-mono)" font-size="7" fill="currentColor">z</text>' +
        '</g>' +
        // Thought-bubble dot (visible only when thinking).
        '<g class="rpg-face-bubble" aria-hidden="true">' +
          '<circle cx="92" cy="32" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
          '<circle cx="86" cy="38" r="1.8" fill="none" stroke="currentColor" stroke-width="1.2"/>' +
        '</g>' +
      '</svg>'
    );
  }

  const MOUTH_PATH_BY_MOOD = {
    idle:      "M48 70 Q60 74 72 70",
    happy:     "M46 67 Q60 80 74 67",
    thinking:  "M50 72 L70 72",
    sleeping:  "M50 72 Q60 68 70 72",
    surprised: "M53 68 Q60 76 67 68 Q60 74 53 68",
  };

  function build(rootEl, initialScript) {
    rootEl.classList.add("robot-playground", "rpg");
    rootEl.innerHTML =
      '<header class="rpg-head">' +
        '<div class="rpg-head-l">' +
          '<span class="rpg-icon" aria-hidden="true">⌘</span>' +
          '<span class="rpg-title">robot.playground</span>' +
          // Hero-robot connection badge — explicit visual link.
          '<a href="#hero" class="rpg-link mono" data-rpg-link aria-label="scroll to hero robot">' +
            '<span class="rpg-link-arrow" aria-hidden="true">↑</span>' +
            '<span>controls hero robot</span>' +
          '</a>' +
        '</div>' +
        '<div class="rpg-head-r">' +
          '<span class="rpg-badge" data-rpg-status>idle</span>' +
        '</div>' +
      '</header>' +

      // Stage: face + sidebar log. On mobile this becomes a vertical stack.
      '<div class="rpg-stage">' +
        '<div class="rpg-face" data-rpg-face data-mood="idle">' +
          // Particle orbits — three dots rotating around the face at
          // different radii / speeds. Pure CSS animation, GPU-composited.
          '<div class="rpg-orbits" aria-hidden="true">' +
            '<span class="rpg-orbit rpg-orbit-1"><i></i></span>' +
            '<span class="rpg-orbit rpg-orbit-2"><i></i></span>' +
            '<span class="rpg-orbit rpg-orbit-3"><i></i></span>' +
          '</div>' +
          buildFaceSvg() +
          '<div class="rpg-face-label mono" data-rpg-mood>idle · stand-by</div>' +
          // CTA below the face — the highest-affordance entry point.
          '<button type="button" class="rpg-demo-btn" data-rpg-demo>' +
            '<span class="rpg-demo-btn-pulse" aria-hidden="true"></span>' +
            '<span class="rpg-demo-btn-ico" aria-hidden="true">▶</span>' +
            '<span class="rpg-demo-btn-text">auto demo</span>' +
            '<span class="rpg-demo-btn-hint mono">try me</span>' +
          '</button>' +
        '</div>' +
        // Live action log — last 5 commands with elapsed time.
        '<div class="rpg-log" aria-live="polite">' +
          '<div class="rpg-log-head mono">' +
            '<span class="rpg-log-dot"></span>' +
            '<span>action log</span>' +
            '<span class="rpg-log-count" data-rpg-log-count>0</span>' +
          '</div>' +
          '<ol class="rpg-log-list" data-rpg-log-list>' +
            '<li class="rpg-log-empty mono">press a button to begin</li>' +
          '</ol>' +
        '</div>' +
      '</div>' +

      // Preset grid — 8 big tactile buttons.
      '<div class="rpg-presets" role="group" aria-label="quick controls">' +
        PRESETS.map(buildPresetButton).join("") +
      '</div>' +

      // Motion slider.
      '<div class="rpg-slider">' +
        '<label class="rpg-slider-label mono" for="rpg-motion">motion</label>' +
        '<input type="range" id="rpg-motion" class="rpg-slider-input" data-rpg-motion-slider min="0" max="2" step="0.1" value="1"/>' +
        '<output class="rpg-slider-value mono" data-rpg-motion-value>1.0×</output>' +
      '</div>' +

      // Collapsible script editor — hidden by default, toggle expands it.
      '<details class="rpg-script" data-rpg-script>' +
        '<summary class="rpg-script-summary">' +
          '<span class="rpg-script-chev" aria-hidden="true">▸</span>' +
          '<span class="rpg-script-title">advanced · script</span>' +
          '<span class="rpg-script-hint mono">DSL · 5 verbs · sandboxed</span>' +
        '</summary>' +
        '<div class="rpg-script-body">' +
          '<div class="rpg-script-editor-wrap">' +
            '<div class="rpg-script-gutter" data-rpg-gutter aria-hidden="true"></div>' +
            '<textarea class="rpg-script-editor mono" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" data-rpg-editor></textarea>' +
          '</div>' +
          '<div class="rpg-script-status mono" data-rpg-status-line>—</div>' +
          '<div class="rpg-script-actions">' +
            '<button type="button" class="rpg-btn rpg-btn-primary" data-rpg-run>' +
              '<span class="rpg-btn-ico" aria-hidden="true">▶</span>' +
              '<span>run sequence</span>' +
            '</button>' +
            '<button type="button" class="rpg-btn rpg-btn-ghost" data-rpg-stop disabled>' +
              '<span class="rpg-btn-ico" aria-hidden="true">■</span>' +
              '<span>stop</span>' +
            '</button>' +
            '<button type="button" class="rpg-btn rpg-btn-ghost" data-rpg-reset>' +
              '<span class="rpg-btn-ico" aria-hidden="true">↺</span>' +
              '<span>reset</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</details>';

    const editor = rootEl.querySelector("[data-rpg-editor]");
    if (editor) editor.value = initialScript;
    return {
      root: rootEl,
      face: rootEl.querySelector("[data-rpg-face]"),
      moodLabel: rootEl.querySelector("[data-rpg-mood]"),
      mouth: rootEl.querySelector("[data-rpg-mouth]"),
      eyes: rootEl.querySelector("[data-rpg-eyes]"),
      statusBadge: rootEl.querySelector("[data-rpg-status]"),
      statusLine: rootEl.querySelector("[data-rpg-status-line]"),
      editor: editor,
      gutter: rootEl.querySelector("[data-rpg-gutter]"),
      runBtn: rootEl.querySelector("[data-rpg-run]"),
      stopBtn: rootEl.querySelector("[data-rpg-stop]"),
      resetBtn: rootEl.querySelector("[data-rpg-reset]"),
      presets: Array.prototype.slice.call(rootEl.querySelectorAll("[data-preset-id]")),
      motionSlider: rootEl.querySelector("[data-rpg-motion-slider]"),
      motionValue: rootEl.querySelector("[data-rpg-motion-value]"),
      demoBtn: rootEl.querySelector("[data-rpg-demo]"),
      logList: rootEl.querySelector("[data-rpg-log-list]"),
      logCount: rootEl.querySelector("[data-rpg-log-count]"),
      heroLink: rootEl.querySelector("[data-rpg-link]"),
    };
  }

  // Demo sequence — runs an auto-showcase of moods to draw users in.
  const DEMO_SEQUENCE = [
    { kind: "expr", value: "happy",     pauseMs: 750 },
    { kind: "expr", value: "thinking",  pauseMs: 750 },
    { kind: "expr", value: "surprised", pauseMs: 600 },
    { kind: "motion", value: 1.6,       pauseMs: 200 },
    { kind: "wave",                     pauseMs: 900 },
    { kind: "expr", value: "idle",      pauseMs: 400 },
    { kind: "motion", value: 1.0,       pauseMs: 0   },
  ];

  // Log row entries: cap at LOG_MAX, each shows command + elapsed time.
  const LOG_MAX = 5;

  function logEntryHtml(text, when) {
    const elapsed = (Date.now() - when) / 1000;
    const elapsedStr = elapsed < 1 ? "now" : Math.floor(elapsed) + "s ago";
    return (
      '<li class="rpg-log-row" data-when="' + when + '">' +
        '<span class="rpg-log-arrow">›</span>' +
        '<span class="rpg-log-cmd mono">' + text + '</span>' +
        '<span class="rpg-log-time mono" data-rpg-log-time>' + elapsedStr + '</span>' +
      '</li>'
    );
  }
  function commandText(detail) {
    if (!detail) return "?";
    if (detail.kind === "expr" && detail.value)
      return "robot." + (detail.value === "thinking" ? "think" :
                          detail.value === "sleeping" ? "sleep" :
                          detail.value === "surprised" ? "surprise" :
                          detail.value) + "()";
    if (detail.kind === "wave")
      return "robot.wave()";
    if (detail.kind === "motion" && typeof detail.value === "number")
      return "robot.motion(" + detail.value.toFixed(1) + ")";
    return "?";
  }

  function updateFace(ui, mood) {
    if (!ui || !ui.face) return;
    const safe = (mood && MOUTH_PATH_BY_MOOD[mood]) ? mood : "idle";
    ui.face.setAttribute("data-mood", safe);
    if (ui.moodLabel) {
      ui.moodLabel.textContent = safe + " · " + (
        safe === "idle"      ? "stand-by"  :
        safe === "happy"     ? "all good"  :
        safe === "thinking"  ? "computing" :
        safe === "sleeping"  ? "off-duty"  :
        safe === "surprised" ? "alert"     : "active"
      );
    }
    if (ui.mouth) ui.mouth.setAttribute("d", MOUTH_PATH_BY_MOOD[safe]);
  }

  function pulseFaceRing(ui) {
    if (!ui || !ui.face) return;
    const ring = ui.face.querySelector(".rpg-face-ring");
    if (!ring) return;
    ring.classList.remove("is-pulsed");
    // Force reflow so the pulse class re-trigger animates.
    void ring.offsetWidth;
    ring.classList.add("is-pulsed");
  }

  function renderGutter(gutterEl, editor, activeLine) {
    if (!gutterEl || !editor) return;
    const lineCount = Math.max(1, editor.value.split(/\n/).length);
    let html = "";
    for (let i = 1; i <= lineCount; i++) {
      const cls = (i === activeLine) ? "rpg-script-gutter-line is-active" : "rpg-script-gutter-line";
      html += '<span class="' + cls + '">' + i + '</span>';
    }
    gutterEl.innerHTML = html;
  }

  // ── Factory ────────────────────────────────────────────────────────────
  function create(rootEl, opts) {
    const options = opts || {};
    if (!rootEl) {
      console.warn("[RobotPlayground] no rootEl, returning no-op.");
      return { run: function () { return Promise.resolve(); }, stop: function () {}, dispose: function () {} };
    }
    const initialScript = typeof options.initialScript === "string" ? options.initialScript : DEFAULT_SCRIPT;
    const ui = build(rootEl, initialScript);

    let cancelled = false;
    let running = false;
    let currentExecutionHooks = null;
    // Log state — array of {text, when:number} entries, newest first.
    const logEntries = [];
    // Auto-demo state — running flag + cancel chain via timers.
    let demoTimers = [];
    let demoRunning = false;

    function appendLog(text) {
      if (!ui.logList) return;
      const when = Date.now();
      logEntries.unshift({ text: text, when: when });
      if (logEntries.length > LOG_MAX) logEntries.length = LOG_MAX;
      // Re-render list.
      ui.logList.innerHTML = logEntries.map(function (e) {
        return logEntryHtml(e.text, e.when);
      }).join("");
      if (ui.logCount) ui.logCount.textContent = String(logEntries.length);
    }
    // Tick elapsed-time labels every second so "now" → "1s ago" → "2s ago".
    let logRefreshId = window.setInterval(function refreshLog() {
      if (!ui.logList || logEntries.length === 0) return;
      const rows = ui.logList.querySelectorAll("[data-rpg-log-time]");
      rows.forEach(function (row) {
        const parent = row.parentElement;
        if (!parent) return;
        const when = parseInt(parent.getAttribute("data-when") || "0", 10);
        if (!when) return;
        const elapsed = (Date.now() - when) / 1000;
        row.textContent = elapsed < 1 ? "now" : Math.floor(elapsed) + "s ago";
      });
    }, 1000);

    function stopDemo() {
      demoRunning = false;
      demoTimers.forEach(function (id) { window.clearTimeout(id); });
      demoTimers = [];
      if (ui.demoBtn) ui.demoBtn.classList.remove("is-running");
    }

    function runDemo() {
      if (demoRunning) { stopDemo(); return; }
      demoRunning = true;
      if (ui.demoBtn) ui.demoBtn.classList.add("is-running");
      setStatus({ kind: "running", message: "auto demo · " + DEMO_SEQUENCE.length + " steps" });
      let cumDelay = 0;
      DEMO_SEQUENCE.forEach(function (step, idx) {
        const id = window.setTimeout(function fire() {
          if (!demoRunning) return;
          try {
            window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: { kind: step.kind, value: step.value } }));
          } catch (err) {
            console.warn("[RobotPlayground] auto-demo dispatch failed:", err && err.message);
          }
          setStatus({ kind: "running", message: "demo · step " + (idx + 1) + "/" + DEMO_SEQUENCE.length });
          if (idx === DEMO_SEQUENCE.length - 1) {
            // Finalise after the last pause.
            const endId = window.setTimeout(function finish() {
              demoRunning = false;
              if (ui.demoBtn) ui.demoBtn.classList.remove("is-running");
              setStatus({ kind: "done", message: "demo complete · " + DEMO_SEQUENCE.length + " steps" });
            }, step.pauseMs);
            demoTimers.push(endId);
          }
        }, cumDelay);
        demoTimers.push(id);
        cumDelay += step.pauseMs;
      });
    }

    function setStatus(state) {
      const kind = state && state.kind ? state.kind : "idle";
      const message = state && state.message ? state.message : "—";
      if (ui.statusBadge) {
        ui.statusBadge.textContent = kind;
        ui.statusBadge.className = "rpg-badge rpg-badge--" + kind;
      }
      if (ui.statusLine) ui.statusLine.textContent = message;
      if (typeof options.onStatus === "function") {
        try { options.onStatus(state); }
        catch (err) { console.warn("[RobotPlayground] onStatus threw:", err); }
      }
    }

    function setRunning(v) {
      running = v;
      if (ui.runBtn) ui.runBtn.disabled = v;
      if (ui.stopBtn) ui.stopBtn.disabled = !v;
    }

    function onEditorInput() {
      renderGutter(ui.gutter, ui.editor, -1);
      setStatus({ kind: "idle", message: "ready · " + ui.editor.value.split(/\n/).length + " lines" });
    }
    if (ui.editor) {
      ui.editor.addEventListener("input", onEditorInput);
      renderGutter(ui.gutter, ui.editor, -1);
    }

    function onRunClick() { run(); }
    function onStopClick() { stop(); }
    function onResetClick() {
      stop();
      if (ui.editor) ui.editor.value = initialScript;
      onEditorInput();
    }

    function applyPreset(preset) {
      pulseFaceRing(ui);
      if (preset.kind === "expr") {
        try { window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: { kind: "expr", value: preset.value } })); }
        catch (err) { console.warn("[RobotPlayground] preset expr dispatch failed:", err && err.message); }
        updateFace(ui, preset.value);
        setStatus({ kind: "preset", message: "preset · " + preset.label });
        return;
      }
      if (preset.kind === "wave") {
        try { window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: { kind: "wave" } })); }
        catch (err) { console.warn("[RobotPlayground] preset wave dispatch failed:", err && err.message); }
        updateFace(ui, "happy");
        window.setTimeout(function () { updateFace(ui, "idle"); }, 700);
        setStatus({ kind: "preset", message: "preset · " + preset.label });
        return;
      }
      if (preset.kind === "motion") {
        try { window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: { kind: "motion", value: preset.value } })); }
        catch (err) { console.warn("[RobotPlayground] preset motion dispatch failed:", err && err.message); }
        if (ui.motionSlider) ui.motionSlider.value = String(preset.value);
        if (ui.motionValue) ui.motionValue.textContent = preset.value.toFixed(1) + "×";
        setStatus({ kind: "preset", message: "motion · " + preset.label + " (" + preset.value.toFixed(1) + "×)" });
      }
    }

    function onPresetClick(e) {
      const btn = e.currentTarget;
      const id = btn.getAttribute("data-preset-id");
      if (!id) return;
      const preset = PRESETS.find(function (p) { return p.id === id; });
      if (!preset) return;
      applyPreset(preset);
    }

    function onMotionSlider(e) {
      const v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      if (ui.motionValue) ui.motionValue.textContent = v.toFixed(1) + "×";
      try { window.dispatchEvent(new CustomEvent(CONTROL_EVENT, { detail: { kind: "motion", value: v } })); }
      catch (err) { console.warn("[RobotPlayground] motion slider dispatch failed:", err && err.message); }
      setStatus({ kind: "preset", message: "motion · " + v.toFixed(1) + "×" });
    }

    // External control events come from the hero (e.g. clicking the robot
    // itself emits an event indirectly) and our own emits during script
    // execution. We mirror every expression change into the big face SVG
    // AND append a row to the action log so the user sees a feedback trail.
    function onExternalControl(ev) {
      const detail = ev && ev.detail ? ev.detail : null;
      if (!detail) return;
      // Always log the command so the user has a visible feedback trail.
      appendLog(commandText(detail));
      if (detail.kind === "expr" && typeof detail.value === "string") {
        updateFace(ui, detail.value);
        pulseFaceRing(ui);
      } else if (detail.kind === "wave") {
        updateFace(ui, "happy");
        pulseFaceRing(ui);
        window.setTimeout(function () { updateFace(ui, "idle"); }, 700);
      } else if (detail.kind === "motion" && typeof detail.value === "number") {
        if (ui.motionSlider) ui.motionSlider.value = String(detail.value);
        if (ui.motionValue) ui.motionValue.textContent = detail.value.toFixed(1) + "×";
      }
    }
    window.addEventListener(CONTROL_EVENT, onExternalControl);

    function onDemoClick() { runDemo(); }

    if (ui.runBtn) ui.runBtn.addEventListener("click", onRunClick);
    if (ui.stopBtn) ui.stopBtn.addEventListener("click", onStopClick);
    if (ui.resetBtn) ui.resetBtn.addEventListener("click", onResetClick);
    if (ui.motionSlider) ui.motionSlider.addEventListener("input", onMotionSlider);
    if (ui.demoBtn) ui.demoBtn.addEventListener("click", onDemoClick);
    ui.presets.forEach(function (p) { p.addEventListener("click", onPresetClick); });

    function run() {
      if (running) return Promise.resolve();
      cancelled = false;
      const src = ui.editor ? ui.editor.value : initialScript;
      const parsed = parse(src);
      if (parsed.errors.length) {
        const first = parsed.errors[0];
        setStatus({ kind: "error", message: "line " + first.line + ": " + first.message, line: first.line });
        renderGutter(ui.gutter, ui.editor, first.line);
        return Promise.resolve();
      }
      if (!parsed.steps.length) {
        setStatus({ kind: "idle", message: "nothing to run" });
        return Promise.resolve();
      }
      setRunning(true);
      setStatus({ kind: "running", message: "step 1/" + parsed.steps.length });
      const hooks = {
        isCancelled: function () { return cancelled; },
        onBeforeStep: function (step, idx, total) {
          setStatus({ kind: "running", message: "step " + (idx + 1) + "/" + total + " · line " + step.line, line: step.line });
          renderGutter(ui.gutter, ui.editor, step.line);
        },
      };
      currentExecutionHooks = hooks;
      return execute(parsed.steps, hooks).then(function () {
        setRunning(false);
        currentExecutionHooks = null;
        if (cancelled) {
          setStatus({ kind: "stopped", message: "stopped" });
        } else {
          setStatus({ kind: "done", message: "done · " + parsed.steps.length + " steps" });
          renderGutter(ui.gutter, ui.editor, -1);
        }
      });
    }

    function stop() {
      cancelled = true;
      if (currentExecutionHooks && typeof currentExecutionHooks.cancel === "function") {
        try { currentExecutionHooks.cancel(); }
        catch (err) { console.warn("[RobotPlayground] cancel threw:", err && err.message); }
      }
    }

    function dispose() {
      stop();
      stopDemo();
      if (logRefreshId) { window.clearInterval(logRefreshId); logRefreshId = 0; }
      window.removeEventListener(CONTROL_EVENT, onExternalControl);
      if (ui.editor) ui.editor.removeEventListener("input", onEditorInput);
      if (ui.runBtn) ui.runBtn.removeEventListener("click", onRunClick);
      if (ui.stopBtn) ui.stopBtn.removeEventListener("click", onStopClick);
      if (ui.resetBtn) ui.resetBtn.removeEventListener("click", onResetClick);
      if (ui.motionSlider) ui.motionSlider.removeEventListener("input", onMotionSlider);
      if (ui.demoBtn) ui.demoBtn.removeEventListener("click", onDemoClick);
      ui.presets.forEach(function (p) { p.removeEventListener("click", onPresetClick); });
    }

    setStatus({ kind: "idle", message: "ready · choose a preset or open script" });
    updateFace(ui, "idle");

    return {
      run: run,
      stop: stop,
      dispose: dispose,
    };
  }

  window.RobotPlayground = { create: create, parse: parse };
})();
