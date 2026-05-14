// cli-cinema.js — Looping animated terminal that plays real Claude Code
// sessions (token-streamed prompts, thinking dots, tool calls, completion).
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The Process section ALREADY has a CI-pipeline terminal. That demonstrates
// "I ship code". This new terminal demonstrates HOW the code gets written —
// a 20s loop of `claude` CLI sessions for real tasks from this very project,
// streaming character-by-character with the cadence of actual model output.
//
// Three sessions cycle in order. Each session walks through a list of
// typed "lines" — user prompt → thinking dots → tool calls → completion
// summary. After the last session, the playlist loops back to session 0.
//
// PERF
// ─────────────────────────────────────────────────────────────────────────────
// All state in one rAF — no per-line setInterval pile-up. Pauses on
// `visibilitychange` and when the host element leaves the viewport.
//
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────
//   const cli = window.CliCinema.create(rootEl, opts)
//     opts.sessions          — optional override of the playlist
//     opts.charDelayMin/Max  — typing cadence in ms
//   cli.pause()
//   cli.resume()
//   cli.dispose()
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  // ── Timing ─────────────────────────────────────────────────────────────
  // Token-stream cadence. Real Claude responses arrive in chunks of a few
  // characters at a time; we approximate by drawing 1 character every
  // ~25–55 ms with mild jitter. Faster than typewriter-realistic; slower
  // than "instant text dump".
  const CHAR_DELAY_MIN_MS = 18;
  const CHAR_DELAY_MAX_MS = 46;
  const CHAR_JITTER_DECIMAL_PROB = 0.18; // chance any one char takes 2x as long

  // Pauses inserted between high-level "scenes" within a session.
  const PAUSE_AFTER_PROMPT_MS = 480;
  const PAUSE_AFTER_THINKING_DOT_MS = 320;
  const PAUSE_AFTER_TOOL_MS = 200;
  const PAUSE_AFTER_DONE_MS = 1800;

  // Inter-session fade pause.
  const SESSION_FADE_MS = 420;
  const INTER_SESSION_HOLD_MS = 700;

  // Caret blink (CSS-handled via class toggle).
  const CARET_BLINK_PERIOD_MS = 560;

  // Auto-scroll: when total content height exceeds the viewport-of-terminal,
  // scroll inner body so the latest line is visible.
  const AUTO_SCROLL_LERP = 0.25;

  // Reduced-motion: collapse everything to instant text dump + no caret.
  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

  // ── Default playlist ───────────────────────────────────────────────────
  // Each session = { title, steps: Array<step> }
  // step kinds: 'prompt' (user> text), 'thinking' (with durationMs),
  //             'tool' (with name + arg), 'output' (dim text), 'done' (final)
  // The texts mirror REAL sessions in this repo — that's the point.
  const DEFAULT_SESSIONS = [
    {
      title: "claude — drm-cv · cinema-transitions",
      steps: [
        { kind: "prompt", text: "Add cinema-style section transitions to Hero → Signal" },
        { kind: "thinking", durationMs: 1800 },
        { kind: "tool", name: "Read",  arg: "components-1.jsx" },
        { kind: "tool", name: "Glob",  arg: "*.css" },
        { kind: "tool", name: "Read",  arg: "bg-fx.js" },
        { kind: "tool", name: "Write", arg: "scene-cinema.js  (+312 lines)" },
        { kind: "tool", name: "Edit",  arg: "sections.css  (+86 lines)" },
        { kind: "tool", name: "Bash",  arg: "git diff --stat" },
        { kind: "output", text: "  3 files changed, 412 insertions(+), 4 deletions(-)" },
        { kind: "done", text: "✓ Done · 3 files · $0.18 · cached: 91%" },
      ],
    },
    {
      title: "claude — drm-cv · skills-constellation",
      steps: [
        { kind: "prompt", text: "Replace skills radar with a 3D constellation. Mobile too." },
        { kind: "thinking", durationMs: 2200 },
        { kind: "tool", name: "Read", arg: "components-1.jsx (Skills section)" },
        { kind: "tool", name: "Read", arg: "bg-fx.js" },
        { kind: "tool", name: "Glob", arg: "vendor/three*" },
        { kind: "tool", name: "Write", arg: "skills-constellation.js  (+474 lines)" },
        { kind: "tool", name: "Edit",  arg: "components-1.jsx · Skills()" },
        { kind: "tool", name: "Edit",  arg: "sections.css · .skills-stars" },
        { kind: "tool", name: "Bash",  arg: "python -m http.server 3000" },
        { kind: "output", text: "  Serving HTTP on 0.0.0.0 port 3000 …" },
        { kind: "done", text: "✓ Done · 4 files · $0.27 · cached: 88%" },
      ],
    },
    {
      title: "claude — drm-cv · pixel-dither",
      steps: [
        { kind: "prompt", text: "Pixel-dither reveal for project cards on viewport intersect" },
        { kind: "thinking", durationMs: 1400 },
        { kind: "tool", name: "Read", arg: "components-1.jsx (ProjectCard)" },
        { kind: "tool", name: "Write", arg: "pixel-dither.js  (+388 lines)" },
        { kind: "tool", name: "Edit",  arg: "components-1.jsx · attach()" },
        { kind: "tool", name: "Edit",  arg: "sections.css · .proj-dither-canvas" },
        { kind: "output", text: "  → Atkinson 6-neighbour distribution" },
        { kind: "output", text: "  → session-cached after first reveal" },
        { kind: "done", text: "✓ Done · 3 files · $0.14 · cached: 93%" },
      ],
    },
  ];

  // ── Helpers ────────────────────────────────────────────────────────────
  function randCharDelay() {
    let d = CHAR_DELAY_MIN_MS + Math.random() * (CHAR_DELAY_MAX_MS - CHAR_DELAY_MIN_MS);
    if (Math.random() < CHAR_JITTER_DECIMAL_PROB) d *= 2;
    return d | 0;
  }

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ── Factory ────────────────────────────────────────────────────────────
  function create(rootEl, opts) {
    const options = opts || {};
    if (!rootEl) {
      console.warn("[CliCinema] no rootEl, skipping.");
      return { pause: function () {}, resume: function () {}, dispose: function () {} };
    }
    const sessions = Array.isArray(options.sessions) && options.sessions.length ? options.sessions : DEFAULT_SESSIONS;
    const motionMedia = window.matchMedia ? window.matchMedia(MEDIA_REDUCED_MOTION) : { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    let prefersReducedMotion = motionMedia.matches;

    // ── DOM scaffolding ──────────────────────────────────────────────────
    rootEl.classList.add("cli-cinema");
    rootEl.innerHTML =
      '<div class="cli-cinema-head">' +
        '<div class="cli-cinema-dots"><i></i><i></i><i></i></div>' +
        '<span class="cli-cinema-title mono" data-cli-title></span>' +
        '<span class="cli-cinema-meta mono" data-cli-meta>session 1/3</span>' +
      '</div>' +
      '<div class="cli-cinema-body" data-cli-body>' +
        '<div class="cli-cinema-stream" data-cli-stream></div>' +
        '<div class="cli-cinema-caret-line">' +
          '<span class="cli-cinema-prompt-sym">›</span>' +
          '<span class="cli-cinema-caret" data-cli-caret>▌</span>' +
        '</div>' +
      '</div>';

    const titleEl = rootEl.querySelector("[data-cli-title]");
    const metaEl = rootEl.querySelector("[data-cli-meta]");
    const bodyEl = rootEl.querySelector("[data-cli-body]");
    const streamEl = rootEl.querySelector("[data-cli-stream]");
    const caretEl = rootEl.querySelector("[data-cli-caret]");

    // ── State machine ────────────────────────────────────────────────────
    let sessionIdx = 0;
    let stepIdx = 0;
    let charIdx = 0;     // for token-typed lines
    let phase = "session-begin"; // 'session-begin' | 'typing' | 'thinking' | 'paused-between' | 'fade-out' | 'fade-in'
    let phaseStartedAt = 0;
    let nextActionAt = 0;
    let currentLineEl = null;
    let thinkingDots = 0;
    let thinkingDuration = 0;
    let runningRaf = 0;
    let paused = false;
    let disposed = false;
    let inViewport = true;
    let documentVisible = !document.hidden;

    // Auto-scroll state.
    let targetScrollTop = 0;
    let currentScrollTop = 0;

    function appendLine(html, classes) {
      const div = document.createElement("div");
      div.className = "cli-cinema-line " + (classes || "");
      div.innerHTML = html;
      streamEl.appendChild(div);
      currentLineEl = div;
      // Update target scroll so latest line is visible.
      targetScrollTop = streamEl.scrollHeight;
      return div;
    }

    function clearStream() {
      streamEl.innerHTML = "";
      currentLineEl = null;
      targetScrollTop = 0;
      currentScrollTop = 0;
      bodyEl.scrollTop = 0;
    }

    function startSession(idx) {
      sessionIdx = idx % sessions.length;
      stepIdx = 0;
      charIdx = 0;
      const s = sessions[sessionIdx];
      titleEl.textContent = s.title || "claude";
      metaEl.textContent = "session " + (sessionIdx + 1) + "/" + sessions.length;
      // Initial prompt line shell.
      appendLine('<span class="cli-cinema-prompt">&gt; </span><span data-cli-current></span>', "is-prompt");
      phase = "typing";
      phaseStartedAt = performance.now();
      nextActionAt = phaseStartedAt;
    }

    function beginNextStep() {
      const session = sessions[sessionIdx];
      if (stepIdx >= session.steps.length) {
        // Session complete — fade out, then start the next one.
        phase = "fade-out";
        phaseStartedAt = performance.now();
        nextActionAt = phaseStartedAt + SESSION_FADE_MS;
        streamEl.classList.add("is-fading");
        return;
      }
      const step = session.steps[stepIdx];
      charIdx = 0;
      switch (step.kind) {
        case "prompt":
          // Append a fresh prompt line if previous was finalised already.
          if (!currentLineEl || !currentLineEl.classList.contains("is-prompt") || !currentLineEl.querySelector("[data-cli-current]")) {
            appendLine('<span class="cli-cinema-prompt">&gt; </span><span data-cli-current></span>', "is-prompt");
          }
          phase = "typing";
          nextActionAt = performance.now();
          break;
        case "thinking":
          appendLine('<span class="cli-cinema-thinking" data-cli-current>  Thinking</span><span class="cli-cinema-thinking-dots" data-cli-dots></span>', "is-thinking");
          phase = "thinking";
          thinkingDots = 0;
          thinkingDuration = step.durationMs || 1200;
          phaseStartedAt = performance.now();
          nextActionAt = phaseStartedAt + PAUSE_AFTER_THINKING_DOT_MS;
          break;
        case "tool":
          appendLine(
            '<span class="cli-cinema-tool-mark">  ⏺</span> ' +
            '<span class="cli-cinema-tool-name">' + escapeHTML(step.name) + '</span> ' +
            '<span class="cli-cinema-tool-arg">' + escapeHTML(step.arg) + '</span>',
            "is-tool"
          );
          phase = "tool-rest";
          nextActionAt = performance.now() + PAUSE_AFTER_TOOL_MS;
          break;
        case "output":
          appendLine('<span class="cli-cinema-output">' + escapeHTML(step.text) + '</span>', "is-output");
          phase = "tool-rest";
          nextActionAt = performance.now() + PAUSE_AFTER_TOOL_MS;
          break;
        case "done":
          appendLine('<span class="cli-cinema-done">' + escapeHTML(step.text) + '</span>', "is-done");
          phase = "done-hold";
          nextActionAt = performance.now() + PAUSE_AFTER_DONE_MS;
          break;
        default:
          // Unknown step — skip safely.
          phase = "tool-rest";
          nextActionAt = performance.now() + PAUSE_AFTER_TOOL_MS;
          stepIdx++;
          return;
      }
    }

    function advanceStep() {
      stepIdx++;
      beginNextStep();
    }

    function tick(now) {
      if (disposed) return;
      runningRaf = requestAnimationFrame(tick);
      if (paused || !inViewport || !documentVisible) return;

      // Reduced-motion path: render every step instantly with no typing.
      if (prefersReducedMotion) {
        if (phase === "typing") {
          const step = sessions[sessionIdx].steps[stepIdx];
          if (step && step.kind === "prompt") {
            const slot = currentLineEl ? currentLineEl.querySelector("[data-cli-current]") : null;
            if (slot) slot.textContent = step.text;
          }
          advanceStep();
          return;
        }
        if (phase === "thinking") { advanceStep(); return; }
        if (phase === "tool-rest" || phase === "done-hold") {
          if (now >= nextActionAt) advanceStep();
          return;
        }
        if (phase === "fade-out") {
          if (now >= nextActionAt) {
            streamEl.classList.remove("is-fading");
            clearStream();
            startSession(sessionIdx + 1);
          }
          return;
        }
        return;
      }

      // Auto-scroll lerp.
      currentScrollTop = currentScrollTop + (targetScrollTop - currentScrollTop) * AUTO_SCROLL_LERP;
      bodyEl.scrollTop = currentScrollTop;

      // Caret blink driven by elapsed time.
      const blinkOn = ((now / CARET_BLINK_PERIOD_MS) | 0) % 2 === 0;
      if (caretEl) caretEl.style.opacity = blinkOn ? "1" : "0";

      switch (phase) {
        case "typing": {
          if (now < nextActionAt) return;
          const step = sessions[sessionIdx].steps[stepIdx];
          if (!step || step.kind !== "prompt") { advanceStep(); return; }
          const slot = currentLineEl ? currentLineEl.querySelector("[data-cli-current]") : null;
          if (!slot) { advanceStep(); return; }
          if (charIdx < step.text.length) {
            charIdx++;
            slot.textContent = step.text.slice(0, charIdx);
            nextActionAt = now + randCharDelay();
          } else {
            // Prompt fully typed.
            nextActionAt = now + PAUSE_AFTER_PROMPT_MS;
            phase = "tool-rest";
          }
          break;
        }
        case "thinking": {
          // Animate dots while phase active until phaseStartedAt + thinkingDuration.
          const totalDots = 3;
          const dotsEl = currentLineEl ? currentLineEl.querySelector("[data-cli-dots]") : null;
          if (dotsEl) {
            const cycle = (((now - phaseStartedAt) / 280) | 0) % (totalDots + 1);
            let s = "";
            for (let i = 0; i < cycle; i++) s += ".";
            dotsEl.textContent = s;
          }
          if (now >= phaseStartedAt + thinkingDuration) {
            if (dotsEl) dotsEl.textContent = "... (" + (thinkingDuration / 1000).toFixed(1) + "s)";
            advanceStep();
          }
          break;
        }
        case "tool-rest":
        case "done-hold": {
          if (now >= nextActionAt) advanceStep();
          break;
        }
        case "fade-out": {
          // Fade is CSS-driven; we just wait then start the next session.
          if (now >= nextActionAt) {
            streamEl.classList.remove("is-fading");
            clearStream();
            // Hold a tiny beat before session 2 begins.
            phase = "paused-between";
            nextActionAt = now + INTER_SESSION_HOLD_MS;
          }
          break;
        }
        case "paused-between": {
          if (now >= nextActionAt) startSession(sessionIdx + 1);
          break;
        }
        default:
          // Idle.
          break;
      }
    }

    // ── Visibility hooks ─────────────────────────────────────────────────
    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.target === rootEl) inViewport = e.isIntersecting;
        });
      }, { threshold: [0, 0.1] });
      io.observe(rootEl);
    }
    function onVisibilityChange() { documentVisible = !document.hidden; }
    document.addEventListener("visibilitychange", onVisibilityChange);

    function onMotionChange(e) { prefersReducedMotion = e.matches; }
    if (motionMedia.addEventListener) motionMedia.addEventListener("change", onMotionChange);
    else if (motionMedia.addListener) motionMedia.addListener(onMotionChange);

    // ── Bootstrap ────────────────────────────────────────────────────────
    startSession(0);
    runningRaf = requestAnimationFrame(tick);

    return {
      pause: function () { paused = true; },
      resume: function () { paused = false; },
      dispose: function () {
        disposed = true;
        paused = true;
        if (runningRaf) cancelAnimationFrame(runningRaf);
        runningRaf = 0;
        if (io) io.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (motionMedia.removeEventListener) motionMedia.removeEventListener("change", onMotionChange);
        else if (motionMedia.removeListener) motionMedia.removeListener(onMotionChange);
      },
    };
  }

  window.CliCinema = { create: create };
})();
