// components.jsx — Section components for the Executive AI Code Lab portfolio
// Each section consumes the current i18n bundle (`t`) and renders its slice.

const { useEffect, useRef, useState, useMemo } = React;

// ── Reveal hook — just returns ref; delays set inline in JSX
function useRevealRoot(deps) {
  const rootRef = useRef(null);
  return rootRef;
}

// ── Reusable section header
function SecHead({ num, eyebrow, title, meta, em }) {
  // em: substring within title to render as italic accent
  let titleNode = title;
  if (em && title && title.includes(em)) {
    const i = title.indexOf(em);
    titleNode = (
      <>
        {title.slice(0, i)}
        <span className="em">{em}</span>
        {title.slice(i + em.length)}
      </>
    );
  }
  return (
    <header className="sec-head" data-reveal>
      <div>
        <div className="num">{num} · {eyebrow}</div>
        <h2 style={{ marginTop: 14 }}>{titleNode}</h2>
      </div>
      {meta ? <div className="sec-meta">{meta}</div> : null}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────
function Hero({ t, links }) {
  const ref = useRevealRoot([t]);
  const robotCanvasRef = useRef(null);
  const robotRef = useRef(null);
  // robotMood retained for the fallback robot's label, but the Spline robot
  // doesn't actually cycle moods — we leave the mood permanently "idle/online"
  // there and only update if the legacy fallback factory reports otherwise.
  // eslint-disable-next-line no-unused-vars
  const [robotMood, setRobotMood] = useState("idle");

  // Robot loading strategy:
  //   1. Prefer the Spline runtime (community asset "GENKUB - Greeting robot").
  //      It's an async dynamic import + scene download, so it takes time.
  //   2. We poll every ROBOT_POLL_MS for TWO global flags that robot-spline.js
  //      sets when the load resolves:
  //        - `window.__splineRobotLoaded = true`  → success, KEEP Spline,
  //          tear down the poll + watchdog so we never swap to legacy.
  //        - `window.__splineRobotFailed = <reason>` → load failed, swap to
  //          the hand-built robot.js so the hero is never empty.
  //   3. ROBOT_FALLBACK_MS is the "truly stuck" watchdog: if neither flag
  //      has fired by then (e.g. runtime fetched but `app.load` never
  //      resolves), assume the load is wedged and force the legacy robot.
  //      This MUST be generous enough that a normal load on slow 3G still
  //      wins — Spline's .splinecode bundles are 1–3 MB.
  // The split keeps the page robust against blocked CDNs / offline / 4xx
  // WITHOUT killing a successful-but-slow Spline load.
  useEffect(() => {
    if (!robotCanvasRef.current) return;
    const canvas = robotCanvasRef.current;
    const rootStyles = getComputedStyle(document.documentElement);
    const a1 = rootStyles.getPropertyValue("--accent").trim() || "#D97757";
    const a2 = rootStyles.getPropertyValue("--accent-2").trim() || "#C89B5E";
    // 12s watchdog: covers slow 3G + first-paint blocking on cold caches.
    // The previous 3.5s value was too aggressive and was killing successful
    // loads on mid-range mobile.
    const ROBOT_FALLBACK_MS = 12000;
    const ROBOT_POLL_MS = 400;

    let active = null;
    let fallbackTimer = 0;
    let pollTimer = 0;
    let swapped = false;

    function clearTimers() {
      if (pollTimer) { window.clearInterval(pollTimer); pollTimer = 0; }
      if (fallbackTimer) { window.clearTimeout(fallbackTimer); fallbackTimer = 0; }
    }

    function swapToLegacy() {
      if (swapped) return;
      swapped = true;
      clearTimers();
      // Dispose whatever Spline created (or partial controller).
      if (active && active.dispose) {
        try { active.dispose(); } catch (e) { /* opportunistic */ }
      }
      const legacy = window.RobotHead || window.Brain;
      if (!legacy || !legacy.create) return;
      active = legacy.create(canvas, {
        accent: a1, accent2: a2, motion: 1,
        onExpressionChange: function (n) { setRobotMood(n); },
      });
      robotRef.current = active;
    }

    // Device tier — weak hardware skips Spline entirely. Spline pulls a
    // multi-MB runtime from a CDN and runs a full second WebGL scene
    // alongside bg-fx; on a low-end device that is the single biggest
    // cause of the page "freezing". Low-tier devices go straight to the
    // lightweight hand-built fallback robot (no extra download — robot.js
    // reuses the already-loaded THREE global).
    const deviceTierLow =
      (typeof window.getDeviceTier === "function") && window.getDeviceTier() === "low";

    // First attempt — Spline runtime (skipped on low-tier devices).
    if (!deviceTierLow && window.RobotSpline && window.RobotSpline.create) {
      // Reset success/failure flags BEFORE creating the controller so a
      // stale value from a hot-reload or prior mount doesn't trick us.
      window.__splineRobotLoaded = false;
      window.__splineRobotFailed = null;

      active = window.RobotSpline.create(canvas, {
        accent: a1, accent2: a2, motion: 1,
        onExpressionChange: function (n) { setRobotMood(n); },
      });
      robotRef.current = active;

      // Poll for either outcome. Success → stop everything and keep Spline.
      // Failure → swap to legacy immediately (don't wait for the watchdog).
      pollTimer = window.setInterval(function poll() {
        if (swapped) { clearTimers(); return; }
        if (window.__splineRobotLoaded) {
          // Spline succeeded — we're done. Cancel the watchdog so it can't
          // fire later and clobber a working scene.
          clearTimers();
          return;
        }
        if (window.__splineRobotFailed) {
          swapToLegacy();
        }
      }, ROBOT_POLL_MS);

      // Final watchdog — ONLY swap if neither flag was set by the deadline,
      // meaning the load is silently wedged (no success, no error). A normal
      // success path will have cleared this timer via the poll() above.
      fallbackTimer = window.setTimeout(function watchdog() {
        fallbackTimer = 0;
        if (swapped) return;
        if (window.__splineRobotLoaded) return; // success raced the timer
        swapToLegacy();
      }, ROBOT_FALLBACK_MS);
    } else {
      // Either the robot-spline.js bundle never registered, or this is a
      // low-tier device — go straight to the lightweight legacy robot.
      swapToLegacy();
    }

    return function disposeRobot() {
      clearTimers();
      if (active && active.dispose) {
        try { active.dispose(); } catch (e) { /* opportunistic */ }
      }
    };
  }, []);

  // v53: retint the robot when the theme swaps so it matches the new
  // accent without a page reload. The robot.setAccent() method tints
  // emissive materials on the Spline scene + accent dots on the legacy
  // fallback robot. Listener cleans up on unmount.
  useEffect(() => {
    function onThemeChanged(ev) {
      const ctrl = robotRef.current;
      if (!ctrl || typeof ctrl.setAccent !== "function") return;
      const detail = ev && ev.detail ? ev.detail : null;
      if (!detail) return;
      try { ctrl.setAccent(detail.accent, detail.accent2); }
      catch (err) { console.warn("[Hero] robot setAccent on theme-changed failed:", err && err.message); }
    }
    window.addEventListener("theme-changed", onThemeChanged);
    return () => window.removeEventListener("theme-changed", onThemeChanged);
  }, []);

  function onRobotClick() {
    // Light haptic — Android only, iOS no-ops.
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) { /* opportunistic */ }
    }
    // Trigger Spline's built-in click event ("mouseDown" / "tap" reaction
    // defined in the source scene). For the legacy fallback robot, this
    // continues to cycle through expressions.
    if (robotRef.current && robotRef.current.cycleExpression) {
      robotRef.current.cycleExpression();
    }
  }

  return (
    <section data-section="hero" id="hero" className="hero" ref={ref}>
      <div className="shell hero-grid">
        <div className="hero-left">
          <div className="eyebrow" data-reveal>{t.hero.eyebrow}</div>

          <h1 className="hero-h1">
            {t.hero.title_lines.map((line, i) => (
              <span
                key={i}
                className={`hero-line ${i === 1 ? "italic-display" : ""}`}
                data-reveal-words
                data-reveal-delay={i * 0.08}
              >
                {line}
              </span>
            ))}
          </h1>

          <p className="hero-tagline" data-reveal-words data-reveal-delay="0.2">{t.hero.tagline}</p>

          <div className="hero-ctas" data-reveal data-reveal-delay="0.35">
            <a href="#contact" className="btn btn-primary" data-magnetic data-cursor="send" data-cursor-label="send → contact">
              {t.hero.cta_primary}
              <span className="arrow">→</span>
            </a>
            <a href="#projects" className="btn btn-ghost" data-magnetic data-cursor="link" data-cursor-label="→ projects">
              {t.hero.cta_secondary}
              <span className="arrow">↘</span>
            </a>
          </div>

          <div className="hero-meta" data-reveal data-reveal-delay="0.45">
            <div className="hero-status">
              <span className="status-dot" />
              <span className="mono">{t.hero.status}</span>
            </div>
            <div className="hero-links">
              <a href={`https://${links.github}`} target="_blank" rel="noopener noreferrer" className="hero-link" data-cursor="link" data-cursor-label="open: github">GitHub</a>
              <a href={`https://${links.telegram}`} target="_blank" rel="noopener noreferrer" className="hero-link" data-cursor="link" data-cursor-label="open: telegram">Telegram</a>
              <a href={`mailto:${links.email}`} className="hero-link" data-cursor="send" data-cursor-label="send: email">Email</a>
            </div>
          </div>
        </div>

        <aside className="hero-right" data-reveal data-reveal-delay="0.15">
          <div className="hero-robot" onClick={onRobotClick}>
            <canvas ref={robotCanvasRef} className="hero-robot-canvas" data-cursor="link" data-cursor-label="follow · interact" />
            {/* Watermark cover — Spline's free-tier "Built with Spline" badge
                renders into the WebGL frame (not the DOM), so CSS-hiding the
                element doesn't work. We mask the bottom-right corner with a
                gradient that fades to transparent toward the canvas center. */}
            <div className="hero-robot-wm-cover" aria-hidden="true" />
            <div className="hero-robot-meta mono">
              <span>core.ai</span>
              <span className="hero-robot-state">
                <span className="hero-robot-dot hero-robot-dot--idle" />online
              </span>
            </div>
            <div className="hero-robot-hint mono">tracks your cursor · click to greet</div>
          </div>
        </aside>
      </div>

      {/* Mobile-only scroll cue at the bottom of the takeover-hero. CSS hides it on desktop. */}
      <div className="hero-scroll-hint mono" aria-hidden="true">scroll</div>

      {/* Tech-stack marquee — fills the otherwise-empty bottom band of the hero
          and ties the section to the rest of the page with a single moving line. */}
      <div className="hero-marquee" aria-hidden="true">
        <div className="hero-marquee-track">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div className="hero-marquee-group mono" key={dup}>
              <span>TypeScript</span><span className="hero-marquee-sep">·</span>
              <span>React</span><span className="hero-marquee-sep">·</span>
              <span>Next.js</span><span className="hero-marquee-sep">·</span>
              <span>Node.js</span><span className="hero-marquee-sep">·</span>
              <span>Postgres</span><span className="hero-marquee-sep">·</span>
              <span>OpenAI</span><span className="hero-marquee-sep">·</span>
              <span>Anthropic</span><span className="hero-marquee-sep">·</span>
              <span>LangChain</span><span className="hero-marquee-sep">·</span>
              <span>n8n</span><span className="hero-marquee-sep">·</span>
              <span>Three.js</span><span className="hero-marquee-sep">·</span>
              <span>Telegram Bot API</span><span className="hero-marquee-sep">·</span>
              <span>Docker</span><span className="hero-marquee-sep">·</span>
              <span>Redis</span><span className="hero-marquee-sep">·</span>
              <span>RAG</span><span className="hero-marquee-sep">·</span>
              <span>Vector DBs</span><span className="hero-marquee-sep">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL — 6 status modules with live animated metric sparklines + tilt.
// Each card carries a randomized but deterministic data series so it always
// looks "alive" without a backend, and a per-card live counter that ticks up.
// ─────────────────────────────────────────────────────────────────────────────
function generateSparkline(seed, points) {
  // Cheap seeded pseudo-noise — same module always gets the same curve so the
  // graphs feel stable across re-renders. Math.random() would re-roll on every
  // mount which looks twitchy.
  const result = [];
  let s = seed;
  for (let i = 0; i < points; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = s / 233280;
    const t = i / (points - 1);
    const base = 0.4 + 0.35 * Math.sin(t * Math.PI * 2 + seed * 0.5);
    const v = Math.max(0.05, Math.min(0.95, base + noise * 0.35));
    result.push(v);
  }
  return result;
}

// 6 different SVG visualizations, one per Signal card. Same deterministic
// `sparkData` array drives all of them — only the rendering changes — so
// each card feels purposeful, not random.
// v49 — Six THEMATIC visualisations. Each viz is shape-matched to the
// service it represents, not just a generic sparkline-style chart:
//
//   layers     → Full-stack    : 3 stacked area curves (UI / API / data)
//   network    → AI Automation : 6 nodes + edges, pulse travels along them
//   stream     → Telegram bots : scrolling message bubbles (right-to-left)
//   grid       → Dashboards    : tile grid with per-cell brightness
//   wireframe  → Landing & Web : webpage skeleton outline with sweep
//   milestones → Product MVP   : 5-step roadmap with active pulse
//
// Order matches SIGNAL_VIZ_KINDS index → card index. Each viz takes the
// same `data` array (length N≈28, values 0..1) but renders a domain-aware
// shape. Pure SVG, no JS animation libs.
const SIGNAL_VIZ_KINDS = ["layers", "network", "stream", "grid", "wireframe", "milestones"];
const SIGNAL_UNITS = ["ops", "req/s", "msg", "tiles", "vis", "milestone"];

// Shared viewBox geometry. All viz scale to the same hosting box via the
// non-preserve aspect; per-viz code uses fractions of W/H.
const SIG_W = 100;
const SIG_H = 36;
const SIG_PAD = 1.5;

// Helper: extract `count` evenly-spaced samples from the live data array.
function sampleData(data, count) {
  const n = data.length;
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = data[Math.min(n - 1, Math.floor((i / Math.max(1, count - 1)) * (n - 1)))];
  }
  return out;
}

// ── 1. Layers — three stacked area curves (Full-stack). ─────────────────
// Top layer = UI, mid = API, bottom = data. Each is the same shape but
// offset vertically + dim. Reads as "the stack is alive across all tiers".
function renderLayers(data, index) {
  const N = data.length;
  const layerOffsets = [0.0, 0.18, 0.36]; // vertical Y-offset per layer (fraction of H)
  const layerOpacities = [0.85, 0.55, 0.32];
  const layerStrokes = [1.6, 1.2, 0.9];

  function buildPath(yOffset) {
    let d = "";
    for (let i = 0; i < N; i++) {
      const x = (i / (N - 1)) * (SIG_W - SIG_PAD * 2) + SIG_PAD;
      // Smoothed value via 3-point moving average so layers feel organic.
      const v0 = data[Math.max(0, i - 1)];
      const v1 = data[i];
      const v2 = data[Math.min(N - 1, i + 1)];
      const smoothed = (v0 + v1 + v2) / 3;
      const ySpan = SIG_H * 0.46;
      const y = SIG_H - SIG_PAD - yOffset * SIG_H - smoothed * ySpan;
      d += (i === 0 ? "M" : "L") + " " + x.toFixed(2) + " " + y.toFixed(2) + " ";
    }
    return d;
  }
  const gradId = `sig-layers-grad-${index}`;
  return (
    <svg viewBox={`0 0 ${SIG_W} ${SIG_H}`} preserveAspectRatio="none" className="signal-spark-svg" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.45" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {layerOffsets.map(function renderLayer(off, i) {
        const path = buildPath(off);
        const area = path + `L ${(SIG_W - SIG_PAD).toFixed(2)} ${(SIG_H - SIG_PAD).toFixed(2)} L ${SIG_PAD} ${(SIG_H - SIG_PAD).toFixed(2)} Z`;
        return (
          <g key={i}>
            <path d={area} fill={`url(#${gradId})`} opacity={layerOpacities[i] * 0.45} />
            <path d={path} fill="none" stroke="currentColor"
              strokeOpacity={layerOpacities[i]} strokeWidth={layerStrokes[i]}
              strokeLinecap="round" strokeLinejoin="round"
              className="signal-spark-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

// ── 2. Network — 6 nodes + edges, with traveling pulses (AI Automation).
// v51 fix: viewBox is now WIDER (200×64, aspect ~3.1:1) so circle nodes
// render closer to round. We also use `preserveAspectRatio="xMidYMid meet"`
// so the SVG scales uniformly — no horizontal stretch turning circles
// into ellipses. Coordinates use the new wider canvas.
const NETWORK_VIEWBOX_W = 200;
const NETWORK_VIEWBOX_H = 64;
const NETWORK_NODES = [
  // [x_frac, y_frac] — fractions of viewBox
  [0.10, 0.22], [0.10, 0.50], [0.10, 0.78],   // 3 inputs
  [0.50, 0.50],                                // hub
  [0.90, 0.32], [0.90, 0.70],                  // 2 outputs
];
const NETWORK_EDGES = [
  [0, 3], [1, 3], [2, 3], [3, 4], [3, 5],
];
function renderNetwork(data, index) {
  const x = function (p) { return (4 + p * (NETWORK_VIEWBOX_W - 8)).toFixed(2); };
  const y = function (p) { return (4 + p * (NETWORK_VIEWBOX_H - 8)).toFixed(2); };
  const last = data[data.length - 1];
  const activeInputIdx = Math.min(2, Math.floor(last * 3));
  const activeOutputIdx = (Math.floor(last * 7)) % 2;
  return (
    <svg viewBox={`0 0 ${NETWORK_VIEWBOX_W} ${NETWORK_VIEWBOX_H}`}
         preserveAspectRatio="xMidYMid meet" className="signal-spark-svg" aria-hidden="true">
      {NETWORK_EDGES.map(function renderEdge(e, i) {
        const a = NETWORK_NODES[e[0]];
        const b = NETWORK_NODES[e[1]];
        const isActive =
          (e[0] === activeInputIdx && e[1] === 3) ||
          (e[0] === 3 && e[1] === 4 + activeOutputIdx);
        return (
          <line key={i}
            x1={x(a[0])} y1={y(a[1])} x2={x(b[0])} y2={y(b[1])}
            stroke="currentColor"
            strokeOpacity={isActive ? "0.85" : "0.22"}
            strokeWidth={isActive ? "1.6" : "0.8"} />
        );
      })}
      {(function renderActivePulse() {
        const a = NETWORK_NODES[activeInputIdx];
        const b = NETWORK_NODES[3];
        return (
          <circle r="2.4" fill="currentColor">
            <animate attributeName="cx" from={x(a[0])} to={x(b[0])} dur="1.1s" repeatCount="indefinite" />
            <animate attributeName="cy" from={y(a[1])} to={y(b[1])} dur="1.1s" repeatCount="indefinite" />
          </circle>
        );
      })()}
      {NETWORK_NODES.map(function renderNode(p, i) {
        const isHub = i === 3;
        const isLit =
          i === activeInputIdx || i === 3 || i === 4 + activeOutputIdx;
        return (
          <g key={i}>
            <circle cx={x(p[0])} cy={y(p[1])}
              r={isHub ? "4.5" : "3"}
              fill="currentColor"
              opacity={isLit ? "1" : "0.45"} />
            {isHub && (
              <circle cx={x(p[0])} cy={y(p[1])}
                r="6.5" fill="none" stroke="currentColor"
                strokeOpacity="0.5" strokeWidth="0.8" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── 3. Stream — scrolling chat bubbles right-to-left (Telegram bots).
// 5 bubbles of varying widths. Position shifts each render based on the
// trailing index of `data` (so it appears to flow on the same clock as
// the live tick). Bubbles re-enter at the right.
function renderStream(data, index) {
  const bubbleCount = 5;
  const samples = sampleData(data, bubbleCount);
  const speed = 14;            // logical X units per data-index step
  // Use a stable "shift" derived from data length so all bubbles step
  // together on each live tick.
  const shift = (data.length % bubbleCount) * 4;
  const bubbles = [];
  for (let i = 0; i < bubbleCount; i++) {
    const widthFactor = 0.5 + samples[i] * 0.5;
    const w = (SIG_W - SIG_PAD * 2) * 0.22 * widthFactor;
    const x = (i / bubbleCount) * (SIG_W + 20) - shift;
    const y = SIG_PAD + 4 + ((i * 7) % 12);
    const h = 5;
    // Fade bubbles near the left edge so they "leave" gracefully.
    const fade = x < 8 ? Math.max(0.2, x / 8) : (x > SIG_W - w ? Math.max(0.2, (SIG_W - x) / w) : 1);
    bubbles.push(
      <g key={i} opacity={fade.toFixed(2)}>
        <rect x={x.toFixed(2)} y={y.toFixed(2)}
          width={w.toFixed(2)} height={h.toFixed(2)} rx="2.5"
          fill="currentColor" opacity={(0.4 + samples[i] * 0.5).toFixed(2)} />
        {/* "Tail" pointer on the right side of each bubble */}
        <path
          d={`M ${(x + w).toFixed(2)} ${(y + h - 1).toFixed(2)} L ${(x + w + 2).toFixed(2)} ${(y + h - 0.5).toFixed(2)} L ${(x + w - 0.5).toFixed(2)} ${(y + h).toFixed(2)} Z`}
          fill="currentColor" opacity="0.55" />
      </g>
    );
  }
  return (
    <svg viewBox={`0 0 ${SIG_W} ${SIG_H}`} preserveAspectRatio="none" className="signal-spark-svg" aria-hidden="true">
      {bubbles}
      {/* Subtle baseline line, suggests "feed" track */}
      <line x1={SIG_PAD} y1={(SIG_H - 3).toFixed(2)}
            x2={(SIG_W - SIG_PAD).toFixed(2)} y2={(SIG_H - 3).toFixed(2)}
            stroke="currentColor" strokeOpacity="0.12" strokeWidth="0.4" strokeDasharray="1.5 2" />
    </svg>
  );
}

// ── 4. Grid — tile dashboard (Dashboards).
// 18 cells (6×3). Brightness per cell = corresponding data value.
function renderGrid(data, index) {
  const cols = 6;
  const rows = 3;
  const samples = sampleData(data, cols * rows);
  const cellW = (SIG_W - SIG_PAD * 2) / cols * 0.86;
  const cellH = (SIG_H - SIG_PAD * 2) / rows * 0.82;
  const slotW = (SIG_W - SIG_PAD * 2) / cols;
  const slotH = (SIG_H - SIG_PAD * 2) / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const v = samples[i];
      const x = SIG_PAD + c * slotW + (slotW - cellW) / 2;
      const y = SIG_PAD + r * slotH + (slotH - cellH) / 2;
      cells.push(
        <rect key={i}
          x={x.toFixed(2)} y={y.toFixed(2)}
          width={cellW.toFixed(2)} height={cellH.toFixed(2)} rx="0.8"
          fill="currentColor"
          opacity={(0.12 + v * 0.78).toFixed(2)} />
      );
    }
  }
  return (
    <svg viewBox={`0 0 ${SIG_W} ${SIG_H}`} preserveAspectRatio="none" className="signal-spark-svg" aria-hidden="true">
      {cells}
    </svg>
  );
}

// ── 5. Wireframe — webpage outline (Landing & Web).
// Static skeleton: header bar, hero block, 3-column row. A draw-in
// animation runs on stroke-dashoffset via CSS so the wireframe "builds"
// itself when the card enters view.
function renderWireframe(data, index) {
  const avg = data.reduce(function sum(s, v) { return s + v; }, 0) / data.length;
  const accent = 0.5 + avg * 0.5;
  return (
    <svg viewBox={`0 0 ${SIG_W} ${SIG_H}`} preserveAspectRatio="none" className="signal-spark-svg" aria-hidden="true">
      {/* Outer page frame */}
      <rect x="3" y="3" width={SIG_W - 6} height={SIG_H - 6} rx="1.5"
        fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="0.8"
        className="signal-wire-draw" />
      {/* Top nav bar */}
      <rect x="5" y="5" width={SIG_W - 10} height="3.5" rx="0.5"
        fill="currentColor" opacity="0.32" />
      <rect x="6" y="6" width="3" height="1.5" rx="0.3" fill="currentColor" opacity="0.6" />
      <rect x="11" y="6" width="3" height="1.5" rx="0.3" fill="currentColor" opacity="0.6" />
      <rect x="16" y="6" width="3" height="1.5" rx="0.3" fill="currentColor" opacity="0.6" />
      {/* Hero block */}
      <rect x="5" y="11" width={(SIG_W - 10) * 0.62} height="10" rx="0.8"
        fill="currentColor" opacity={(0.18 + accent * 0.25).toFixed(2)} />
      <rect x={6} y={13} width="22" height="1.5" rx="0.3" fill="currentColor" opacity="0.78" />
      <rect x={6} y={16} width="16" height="1.2" rx="0.3" fill="currentColor" opacity="0.5" />
      <rect x={6} y={18.5} width="8"  height="1.5" rx="0.3" fill="currentColor" opacity={accent.toFixed(2)} />
      {/* Side block */}
      <rect x={5 + (SIG_W - 10) * 0.64} y="11" width={(SIG_W - 10) * 0.32} height="10" rx="0.8"
        fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="0.6"
        className="signal-wire-draw" />
      {/* 3 column row */}
      <rect x="5"  y="24" width="9" height="6" rx="0.6" fill="currentColor" opacity="0.30" />
      <rect x="16" y="24" width="9" height="6" rx="0.6" fill="currentColor" opacity="0.30" />
      <rect x="27" y="24" width="9" height="6" rx="0.6" fill="currentColor" opacity="0.30" />
    </svg>
  );
}

// ── 6. Milestones — 5-step roadmap with active pulse (Product MVP).
// v51 fix: wider viewBox + meet aspect so milestone dots stay round
// (previously got horizontally stretched into ovals).
const MILESTONES_VIEWBOX_W = 200;
const MILESTONES_VIEWBOX_H = 56;
function renderMilestones(data, index) {
  const count = 5;
  const avg = data.reduce(function sum(s, v) { return s + v; }, 0) / data.length;
  const progress = Math.max(0, Math.min(count - 1, avg * (count - 1)));
  const currentIdx = Math.min(count - 1, Math.floor(progress));
  const cy = MILESTONES_VIEWBOX_H / 2;
  const xLeft = 12;
  const xRight = MILESTONES_VIEWBOX_W - 12;
  const dotX = function (i) { return xLeft + (xRight - xLeft) * (i / (count - 1)); };
  return (
    <svg viewBox={`0 0 ${MILESTONES_VIEWBOX_W} ${MILESTONES_VIEWBOX_H}`}
         preserveAspectRatio="xMidYMid meet" className="signal-spark-svg" aria-hidden="true">
      <line x1={xLeft} y1={cy.toFixed(2)} x2={xRight} y2={cy.toFixed(2)}
        stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.2" />
      <line x1={xLeft} y1={cy.toFixed(2)}
        x2={(xLeft + (xRight - xLeft) * (progress / (count - 1))).toFixed(2)} y2={cy.toFixed(2)}
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {Array.from({ length: count }).map(function renderDot(_, i) {
        const cx = dotX(i);
        const isPassed = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <g key={i}>
            {isCurrent && (
              <circle cx={cx.toFixed(2)} cy={cy.toFixed(2)} r="9" fill="none" stroke="currentColor">
                <animate attributeName="r" values="5;11;5" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.55;0;0.55" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={cx.toFixed(2)} cy={cy.toFixed(2)}
              r={isCurrent ? "5" : "3.5"}
              fill={isPassed || isCurrent ? "currentColor" : "rgba(0,0,0,0.4)"}
              stroke="currentColor"
              strokeOpacity={isPassed || isCurrent ? "1" : "0.4"}
              strokeWidth={isPassed || isCurrent ? "0" : "1.2"} />
          </g>
        );
      })}
    </svg>
  );
}

// SignalViz — dispatches to the kind-specific renderer.
function SignalViz({ kind, data, index }) {
  if (kind === "layers")     return renderLayers(data, index);
  if (kind === "network")    return renderNetwork(data, index);
  if (kind === "stream")     return renderStream(data, index);
  if (kind === "grid")       return renderGrid(data, index);
  if (kind === "wireframe")  return renderWireframe(data, index);
  if (kind === "milestones") return renderMilestones(data, index);
  return null;
}

// Per-card live data shift interval. Each card ticks on its own clock so the
// grid feels like 6 independent monitors. Visible only when card is in
// viewport (IO-paused below) and tab is foregrounded.
const SIGNAL_SPARK_POINTS = 28;
const SIGNAL_TICK_BASE_MS = 950;
const SIGNAL_TICK_JITTER_MS = 480;

function SignalCard({ card, index }) {
  const cardRef = useRef(null);
  const vizKind = SIGNAL_VIZ_KINDS[index % SIGNAL_VIZ_KINDS.length];
  const vizUnit = SIGNAL_UNITS[index % SIGNAL_UNITS.length];

  // Live data — each tick we drop the leftmost point and append a new one
  // generated from a per-card seeded PRNG. The viz re-renders with the new
  // array, making the chart appear to scroll right-to-left.
  const [liveData, setLiveData] = useState(function initData() {
    return generateSparkline(7 + index * 13, SIGNAL_SPARK_POINTS);
  });
  const seedRef = useRef(7 + index * 13 + SIGNAL_SPARK_POINTS);

  // Live counter — increments at a measured cadence so the card feels alive.
  const counterStart = 100 + index * 47;
  const [counter, setCounter] = useState(counterStart);

  // Viewport-paused tick. Combines data shift + counter bump in ONE timer
  // per card (was 2 in v47) — half the timers, same visual outcome.
  useEffect(function tickLiveData() {
    if (!cardRef.current) return undefined;
    let intervalId = 0;
    let inView = true;
    const interval = SIGNAL_TICK_BASE_MS + (index % 3) * (SIGNAL_TICK_JITTER_MS / 3);

    function bump() {
      if (!inView || document.hidden) return;
      // Advance PRNG, normalise to 0..1, push, shift left to keep length.
      seedRef.current = (seedRef.current * 9301 + 49297) % 233280;
      const noise = seedRef.current / 233280;
      // Smooth random walk: base on a sin envelope so values don't look
      // like white noise — they breathe up and down over time.
      const phase = Date.now() / 1000 * 0.3 + index;
      const base = 0.42 + 0.32 * Math.sin(phase);
      const v = Math.max(0.05, Math.min(0.95, base + (noise - 0.5) * 0.55));
      setLiveData(function (prev) {
        const next = prev.slice(1);
        next.push(v);
        return next;
      });
      setCounter(function (prev) { return prev + 1; });
    }

    intervalId = window.setInterval(bump, interval);

    // Pause when card scrolls out of view — saves render cycles.
    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.target === cardRef.current) inView = e.isIntersecting;
        });
      }, { threshold: [0, 0.1] });
      io.observe(cardRef.current);
    }

    return function () {
      window.clearInterval(intervalId);
      if (io) io.disconnect();
    };
  }, [index]);

  const sparkData = liveData;

  function onMouseMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 5).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 5).toFixed(2)}deg`);
  }
  function onMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div
      ref={cardRef}
      className={`card signal-card signal-card--${vizKind}`}
      data-reveal
      data-reveal-delay={(index * 0.04).toFixed(2)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="signal-top">
        <span className="mono signal-code">/{card.code}</span>
        <span className="chip"><span className="chip-dot" />active</span>
      </div>
      <h3 className="signal-k">{card.k}</h3>
      <p className="signal-v">{card.v}</p>
      <div className="signal-spark">
        <SignalViz kind={vizKind} data={sparkData} index={index} />
        <div className="signal-spark-meta mono">
          <span className="signal-spark-dot" />
          <span>{counter.toString().padStart(4, "0")}</span>
          <span className="signal-spark-unit">{vizUnit}</span>
        </div>
      </div>
    </div>
  );
}

function Signal({ t }) {
  const ref = useRevealRoot([t]);
  return (
    <section data-section="signal" id="signal" ref={ref}>
      <div className="shell">
        <SecHead num="01" eyebrow={t.signal.eyebrow} title={t.signal.title} em={t.signal.title.split(" ").pop()} meta={`${t.signal.cards.length} modules · live`} />
        <div className="signal-grid">
          {t.signal.cards.map(function renderSignal(c, i) {
            return <SignalCard key={i} card={c} index={i} />;
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT — README.md card.
// Replaces the wall-of-text with a developer-recognizable composition:
//   • Avatar (geometric SA monogram) + handle + online status
//   • Live UTC+5 Tashkent clock that ticks every second
//   • Contribution graph (7 rows × 52 cols), intensity deterministic-seeded,
//     animated waves of pulses simulating "live commits"
//   • Stats with counters that animate from 0 → target on scroll-into-view
//   • Tech stack as inline chips
//   • Markdown-style paragraphs with left accent border
// ─────────────────────────────────────────────────────────────────────────────

// Contribution-graph generator. Deterministic per (row, col) — same shape every
// render so the graph never twitches between mounts.
function buildContribCells(rows, cols) {
  const out = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seed = (row + 1) * 31 + (col + 1) * 17;
      const noise = ((seed * 9301 + 49297) % 233280) / 233280;
      // Cluster around recent weeks (high col = recent).
      const recency = col / cols;
      const base = noise * (0.4 + recency * 0.6);
      // Five intensity buckets like GitHub.
      let level;
      if (base < 0.25) level = 0;
      else if (base < 0.45) level = 1;
      else if (base < 0.65) level = 2;
      else if (base < 0.85) level = 3;
      else level = 4;
      out.push({ row, col, level });
    }
  }
  return out;
}

function useAnimatedCounter(target, durationMs, runWhen) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!runWhen) return;
    const startedAt = performance.now();
    let raf = 0;
    function step(now) {
      const elapsed = now - startedAt;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, runWhen]);
  return value;
}

// Pull numeric "target" out of a string like "6+", "30+", "12", "RU/EN/UZ".
// Non-numeric strings render as-is (RU/EN/UZ).
function extractCounterTarget(stat) {
  const v = String(stat.v || "");
  const m = v.match(/(\d+)/);
  if (!m) return { kind: "text", text: v };
  return { kind: "num", number: parseInt(m[1], 10), suffix: v.slice(m.index + m[1].length) };
}

function AboutStat({ stat, runCounters, index }) {
  const parsed = extractCounterTarget(stat);
  const counterValue = useAnimatedCounter(
    parsed.kind === "num" ? parsed.number : 0,
    1100 + index * 90,
    parsed.kind === "num" && runCounters,
  );
  return (
    <div className="about-stat" data-reveal data-reveal-delay={(index * 0.05).toFixed(2)}>
      <div className="about-stat-v num-tab">
        {parsed.kind === "num" ? `${counterValue}${parsed.suffix}` : parsed.text}
      </div>
      <div className="about-stat-k mono">{stat.k}</div>
    </div>
  );
}

const CONTRIB_ROWS = 7;
const CONTRIB_COLS = 28;
const CONTRIB_TOTAL_CELLS = CONTRIB_ROWS * CONTRIB_COLS;
const CONTRIB_PULSE_INTERVAL_MIN_MS = 1800;
const CONTRIB_PULSE_INTERVAL_MAX_MS = 3400;
const CONTRIB_PULSE_DURATION_MS = 900;
const CURRENTLY_ROTATE_INTERVAL_MS = 5200;
const CURRENTLY_TYPE_INTERVAL_MS = 30;
const TECH_CHIPS = ["TypeScript", "React", "Next.js", "Node.js", "Postgres", "OpenAI", "Anthropic", "LangChain", "n8n", "Three.js", "Telegram Bot", "Docker"];

// Currently-rotator — types/erases the active phrase with a soft typewriter.
function useCurrentlyRotator(phrases) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("typing"); // typing | hold | erasing
  const idxRef = useRef(0);
  const cursorRef = useRef(0);
  useEffect(() => {
    if (!phrases || phrases.length === 0) return undefined;
    let timer = 0;
    let cancelled = false;
    function step() {
      if (cancelled) return;
      const active = phrases[idxRef.current % phrases.length] || "";
      if (phase === "typing") {
        cursorRef.current += 1;
        const next = active.slice(0, cursorRef.current);
        setText(next);
        if (cursorRef.current >= active.length) {
          setPhase("hold");
          timer = window.setTimeout(step, CURRENTLY_ROTATE_INTERVAL_MS);
        } else {
          timer = window.setTimeout(step, CURRENTLY_TYPE_INTERVAL_MS);
        }
      } else if (phase === "hold") {
        setPhase("erasing");
        timer = window.setTimeout(step, CURRENTLY_TYPE_INTERVAL_MS);
      } else if (phase === "erasing") {
        cursorRef.current = Math.max(0, cursorRef.current - 1);
        const next = active.slice(0, cursorRef.current);
        setText(next);
        if (cursorRef.current === 0) {
          idxRef.current = (idxRef.current + 1) % phrases.length;
          setPhase("typing");
          timer = window.setTimeout(step, CURRENTLY_TYPE_INTERVAL_MS * 2);
        } else {
          timer = window.setTimeout(step, CURRENTLY_TYPE_INTERVAL_MS * 0.65);
        }
      }
    }
    timer = window.setTimeout(step, CURRENTLY_TYPE_INTERVAL_MS);
    return function cleanup() {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [phrases, phase]);
  return text;
}

function About({ t }) {
  const ref = useRevealRoot([t]);
  const cardRef = useRef(null);
  const [runCounters, setRunCounters] = useState(false);
  const [clock, setClock] = useState(() => formatTashkentTime(new Date()));
  const [pulseIndex, setPulseIndex] = useState(-1);
  const contribCells = useMemo(() => buildContribCells(CONTRIB_ROWS, CONTRIB_COLS), []);
  const currentlyPhrases = t.about.currently || [];
  const currentlyText = useCurrentlyRotator(currentlyPhrases);

  // Section-in-view trigger to start counters + activate contribution pulses.
  useEffect(() => {
    if (!cardRef.current) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.3) {
          setRunCounters(true);
          io.disconnect();
        }
      });
    }, { threshold: [0.3, 0.5] });
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, []);

  // Tashkent clock — ticks once per second. Uses fixed UTC+5 offset.
  useEffect(() => {
    const id = setInterval(() => setClock(formatTashkentTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  // Live contribution pulse — periodically flash a random cell to level-4
  // for ~900ms, then revert. Indices are deterministic via a counter so we
  // don't pick the same cell twice in a row.
  useEffect(() => {
    if (!runCounters) return undefined;
    let cleared = false;
    let scheduleTimer = 0;
    let revertTimer = 0;
    function scheduleNext() {
      const delay = CONTRIB_PULSE_INTERVAL_MIN_MS + Math.random() * (CONTRIB_PULSE_INTERVAL_MAX_MS - CONTRIB_PULSE_INTERVAL_MIN_MS);
      scheduleTimer = window.setTimeout(() => {
        if (cleared) return;
        const idx = Math.floor(Math.random() * CONTRIB_TOTAL_CELLS);
        setPulseIndex(idx);
        revertTimer = window.setTimeout(() => {
          if (cleared) return;
          setPulseIndex(-1);
          scheduleNext();
        }, CONTRIB_PULSE_DURATION_MS);
      }, delay);
    }
    scheduleNext();
    return function cleanup() {
      cleared = true;
      if (scheduleTimer) window.clearTimeout(scheduleTimer);
      if (revertTimer) window.clearTimeout(revertTimer);
    };
  }, [runCounters]);

  const recentItems = t.about.recent || [];
  const statusLabel = t.about.status_label || "Available";
  const currentlyLabel = t.about.currently_label || "Currently";
  const recentLabel = t.about.recent_label || "Recent work";
  const contribLabel = t.about.contrib_label || "contributions · 28 weeks";
  const ghStats = t.about.gh_stats || "";

  return (
    <section data-section="about" id="about" ref={ref}>
      <div className="shell">
        <SecHead num="02" eyebrow={t.about.eyebrow} title={t.about.title} meta="readme.md" />

        <article ref={cardRef} className="about-readme card" data-reveal>
          {/* Header: avatar + handle + status */}
          <header className="about-readme-head">
            <div className="about-avatar" aria-hidden="true">
              <span>SA</span>
              <span className="about-avatar-shine" />
            </div>
            <div className="about-id">
              <div className="about-id-row">
                <h3 className="about-id-handle">@samandar</h3>
                <span className="about-id-status mono"><span className="about-id-status-dot" />{statusLabel}</span>
              </div>
              <div className="about-id-meta mono">
                <span className="about-id-online"><span className="about-id-dot" />online</span>
                <span className="about-id-sep">·</span>
                <span>Tashkent · UTC+5</span>
                <span className="about-id-sep">·</span>
                <span className="about-clock num-tab">{clock}</span>
              </div>
            </div>
          </header>

          {/* Currently rotator */}
          <div className="about-currently mono">
            <span className="about-currently-key">{currentlyLabel}:</span>
            <span className="about-currently-val">{currentlyText}</span>
            <span className="about-currently-caret" aria-hidden="true" />
          </div>

          {/* Stats counters */}
          <div className="about-stats">
            {t.about.stats.map((s, i) => (
              <AboutStat key={i} stat={s} runCounters={runCounters} index={i} />
            ))}
          </div>

          {/* Markdown body */}
          <div className="about-md">
            <p className="about-md-lead">{t.about.lead}</p>
            <blockquote className="about-md-quote">
              {t.about.paragraphs[0]}
            </blockquote>
            {t.about.paragraphs.slice(1).map((p, i) => (
              <p key={i} className="about-md-para">{p}</p>
            ))}
          </div>

          {/* Tech-stack chips */}
          <div className="about-chips" aria-label="primary stack">
            {TECH_CHIPS.map((c, i) => (
              <span key={i} className="about-chip mono">{c}</span>
            ))}
          </div>

          {/* Recent work feed */}
          {recentItems.length > 0 && (
            <div className="about-recent">
              <div className="about-recent-head mono">{recentLabel}</div>
              <ul className="about-recent-list">
                {recentItems.map((item, i) => (
                  <li key={i} className="about-recent-item">
                    <span className="about-recent-when mono">{item.when}</span>
                    <span className={`about-recent-tag mono about-recent-tag--${item.tag}`}>{item.tag}</span>
                    <span className="about-recent-msg">{item.msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contribution graph */}
          <div className="about-contrib">
            <div className="about-contrib-head mono">
              <span>{contribLabel}</span>
              <span className="about-contrib-legend">
                <span>less</span>
                <span className="about-contrib-legend-cell" data-level="0" />
                <span className="about-contrib-legend-cell" data-level="1" />
                <span className="about-contrib-legend-cell" data-level="2" />
                <span className="about-contrib-legend-cell" data-level="3" />
                <span className="about-contrib-legend-cell" data-level="4" />
                <span>more</span>
              </span>
            </div>
            <div
              className="about-contrib-grid"
              style={{ gridTemplateColumns: `repeat(${CONTRIB_COLS}, 1fr)` }}
              aria-hidden="true"
            >
              {contribCells.map((cell, idx) => {
                const isPulsing = idx === pulseIndex;
                return (
                  <span
                    key={`${cell.row}-${cell.col}`}
                    className={`about-contrib-cell ${isPulsing ? "is-pulsing" : ""}`}
                    data-level={isPulsing ? 4 : cell.level}
                    style={{ animationDelay: `${(cell.col * 35 + cell.row * 25)}ms` }}
                  />
                );
              })}
            </div>
          </div>

          {/* GitHub-style stats footer */}
          {ghStats && (
            <div className="about-gh-stats mono">{ghStats}</div>
          )}
        </article>
      </div>
    </section>
  );
}

function formatTashkentTime(date) {
  // Tashkent = UTC+5, no DST.
  const TASHKENT_OFFSET_HOURS = 5;
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000;
  const local = new Date(utcMs + TASHKENT_OFFSET_HOURS * 60 * 60 * 1000);
  const hh = String(local.getHours()).padStart(2, "0");
  const mm = String(local.getMinutes()).padStart(2, "0");
  const ss = String(local.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS — floating product screens
// ─────────────────────────────────────────────────────────────────────────────
function ProjectCard({ p, i, cta }) {
  const cardRef = useRef(null);
  function onMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
  }
  function onLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  }

  return (
    <article ref={cardRef} className="proj-card card" data-reveal onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="proj-glow" />
      <div className="proj-head">
        <span className="mono proj-tag">{p.tag}</span>
        <span className={`proj-status proj-status-${p.status.toLowerCase()}`}>{p.status}</span>
      </div>
      <h3 className="proj-name">{p.name}</h3>

      <div className="proj-screen" aria-hidden="true">
        <div className="proj-screen-bar">
          <div className="proj-screen-dots"><i></i><i></i><i></i></div>
          <span className="mono">/{p.name.toLowerCase().replace(/\s+/g, "-")}</span>
        </div>
        <div className="proj-screen-body">
          <div className="proj-screen-row" style={{ width: "82%" }}></div>
          <div className="proj-screen-row" style={{ width: "60%" }}></div>
          <div className="proj-screen-row" style={{ width: "72%" }}></div>
          <div className="proj-screen-grid">
            {[...Array(6)].map((_, k) => <div key={k} className="proj-screen-cell" />)}
          </div>
        </div>
        {/* Scanline overlay — adds CRT-monitor texture without the pixel-
            dither overhead. CSS-driven, zero JS, GPU-composited. */}
        <div className="proj-screen-scanlines" />
      </div>

      <dl className="proj-meta">
        <div><dt className="mono">problem</dt><dd>{p.problem}</dd></div>
        <div><dt className="mono">solution</dt><dd>{p.solution}</dd></div>
        <div><dt className="mono">role</dt><dd>{p.role}</dd></div>
        <div><dt className="mono">outcome</dt><dd className="proj-outcome">{p.outcome}</dd></div>
      </dl>

      <div className="proj-stack">
        {p.stack.map((s, k) => <span key={k} className="proj-chip mono">{s}</span>)}
      </div>

      <a href="#" className="proj-cta mono" onClick={(e) => e.preventDefault()}>
        {cta} <span className="arrow">→</span>
      </a>
    </article>
  );
}

// Mobile chapter-indicator: shows N dots above the project grid, highlights
// whichever card is most-in-view, taps scroll to that card. Only meaningful
// on small screens where the grid collapses to one column.
function ProjectChapterDots({ items, gridRef }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const cardRefs = useRef([]);

  useEffect(() => {
    const cards = (gridRef.current ? gridRef.current.querySelectorAll(".proj-card") : []);
    if (!cards.length) return undefined;
    cardRefs.current = Array.from(cards);
    // Track each card's intersection ratio; pick the largest.
    const ratios = new Array(cards.length).fill(0);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const idx = cardRefs.current.indexOf(e.target);
        if (idx >= 0) ratios[idx] = e.intersectionRatio;
      });
      let best = 0;
      let bestRatio = -1;
      for (let i = 0; i < ratios.length; i++) {
        if (ratios[i] > bestRatio) { bestRatio = ratios[i]; best = i; }
      }
      setActiveIdx(best);
    }, { threshold: [0.1, 0.4, 0.7, 0.95] });
    cards.forEach((c) => io.observe(c));
    return function cleanup() { io.disconnect(); };
  }, [gridRef]);

  function onDot(i) {
    const el = cardRefs.current[i];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <nav className="proj-chapters" aria-label="project list">
      <ol className="proj-chapters-dots">
        {items.map((p, i) => (
          <li key={i}>
            <button
              type="button"
              className={`proj-chapters-dot ${i === activeIdx ? "is-active" : ""}`}
              aria-label={p.name}
              onClick={() => onDot(i)}
            />
          </li>
        ))}
      </ol>
      <div className="proj-chapters-label mono">
        <span className="proj-chapters-num">{String(activeIdx + 1).padStart(2, "0")}</span>
        <span className="proj-chapters-of">/ {String(items.length).padStart(2, "0")}</span>
        <span className="proj-chapters-name">{items[activeIdx]?.name || ""}</span>
      </div>
    </nav>
  );
}

function Projects({ t }) {
  const ref = useRevealRoot([t]);
  const gridRef = useRef(null);
  return (
    <section data-section="projects" id="projects" ref={ref}>
      <div className="shell">
        <SecHead num="03" eyebrow={t.projects.eyebrow} title={t.projects.title} meta={`${t.projects.items.length} cases · 2024–26`} />
        <ProjectChapterDots items={t.projects.items} gridRef={gridRef} />
        <div className="proj-grid" ref={gridRef}>
          {t.projects.items.map((p, i) => <ProjectCard key={i} p={p} i={i} cta={t.projects.cta} />)}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILLS — SVG radar with mouse-parallax 3D tilt. v47 restores the radar
// design users liked, and adds a wrapping CSS perspective container with
// pointer-driven `rotateX/rotateY` so the radar feels physically present —
// like a tilted display dish on the page — without the constellation's
// rendering complexity.
//
// Depth illusion is from three stacked SVG layers in the wrap:
//   • back layer — deeper rings, dimmer, translated -36px in Z
//   • mid layer  — main radar (rings + scan triangle + spokes)
//   • front layer — pulse halo around the active endpoint, +28px in Z
//
// Interaction:
//   • hover over a spoke endpoint → activate that tab (synchronised)
//   • hover over the wrap → 3D tilt follows the cursor
//   • leave → tilt smoothly returns to neutral
// ─────────────────────────────────────────────────────────────────────────────

const SKILLS_RADAR_RADIUS = 110;
const SKILLS_TWEEN_MS = 620;
const SKILLS_SCAN_PERIOD_S = 4.5;
// Parallax shift in CSS pixels. Pure 2D translate — no 3D perspective so the
// SVG content cannot leak outside its container (v47 had a CSS `perspective`
// + `translateZ(-60px)` back layer that visually projected below the panel
// onto the bg-fx grid). Keeping the shift tight (8px max) preserves the
// "responsive to cursor" feel without spill.
const SKILLS_PARALLAX_MAX_PX = 8;
const SKILLS_PARALLAX_LERP = 0.10;
const SKILLS_VIEW_SIZE = 320;

function SkillsRadar({ groups, active, onActivate }) {
  const total = groups.length;
  const R = SKILLS_RADAR_RADIUS;

  const endpoints = useMemo(function buildEndpoints() {
    return groups.map(function buildEndpoint(g, i) {
      const a = (i / total) * Math.PI * 2 - Math.PI / 2;
      const r = R * (0.55 + Math.min(0.45, g.items.length / 10));
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
  }, [groups, total]);

  // Smooth animated active endpoint (tween on tab change).
  const [currentEnd, setCurrentEnd] = useState(function initEnd() {
    return endpoints[active] || { x: 0, y: 0 };
  });
  const fromRef = useRef(currentEnd);
  const startedAtRef = useRef(0);
  useEffect(function tweenEndpoint() {
    if (!endpoints[active]) return undefined;
    fromRef.current = { x: currentEnd.x, y: currentEnd.y };
    startedAtRef.current = performance.now();
    let raf = 0;
    function step(now) {
      const tt = Math.min(1, (now - startedAtRef.current) / SKILLS_TWEEN_MS);
      const eased = 1 - Math.pow(1 - tt, 3);
      const target = endpoints[active];
      setCurrentEnd({
        x: fromRef.current.x + (target.x - fromRef.current.x) * eased,
        y: fromRef.current.y + (target.y - fromRef.current.y) * eased,
      });
      if (tt < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return function () { cancelAnimationFrame(raf); };
    // currentEnd intentionally omitted — we want one tween per active change,
    // not a re-tween every interpolated frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, endpoints]);

  // Scan-line angle in real time.
  const [scanAngle, setScanAngle] = useState(-90);
  useEffect(function rotateScan() {
    let raf = 0;
    function tick(now) {
      const t = (now / 1000) % SKILLS_SCAN_PERIOD_S;
      setScanAngle((t / SKILLS_SCAN_PERIOD_S) * 360 - 90);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return function () { cancelAnimationFrame(raf); };
  }, []);

  const half = SKILLS_VIEW_SIZE / 2;
  return (
    <svg
      className="skills-radar-svg"
      viewBox={`-${half} -${half} ${SKILLS_VIEW_SIZE} ${SKILLS_VIEW_SIZE}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skills-scan-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="160" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.10" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="skills-core-glow" cx="0" cy="0" r="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Central glow disc — adds depth + warmth. */}
      <circle r="60" fill="url(#skills-core-glow)" />

      {/* Concentric pulsing rings. */}
      {[0.4, 0.7, 1].map(function renderRing(s, i) {
        return (
          <circle
            key={i}
            r={R * s}
            fill="none"
            stroke="currentColor"
            strokeOpacity=".10"
            className="skills-radar-ring"
            style={{ animationDelay: `${i * 0.8}s` }}
          />
        );
      })}

      {/* Cross-hairs. */}
      <line x1="-160" y1="0" x2="160" y2="0" stroke="currentColor" strokeOpacity=".06" />
      <line x1="0" y1="-160" x2="0" y2="160" stroke="currentColor" strokeOpacity=".06" />

      {/* Rotating scan triangle. */}
      <g transform={`rotate(${scanAngle.toFixed(2)})`}>
        <polygon points="0,0 160,-22 160,22" fill="url(#skills-scan-grad)" />
        <line x1="0" y1="0" x2="160" y2="0" stroke="currentColor" strokeOpacity=".5" strokeWidth="1" />
      </g>

      {/* Inactive spokes (clickable for tab activation). */}
      {groups.map(function renderSpoke(g, i) {
        if (i === active) return null;
        const e = endpoints[i];
        return (
          <g key={i} className="skills-radar-spoke" onClick={function () { if (onActivate) onActivate(i); }}>
            <line x1="0" y1="0" x2={e.x} y2={e.y} stroke="currentColor" strokeOpacity="0.10" />
            <circle cx={e.x} cy={e.y} r="5.5" fill="transparent" stroke="currentColor" strokeOpacity="0.45" />
            <circle cx={e.x} cy={e.y} r="3" fill="currentColor" opacity="0.55" />
            <text
              x={e.x}
              y={e.y - 14}
              textAnchor="middle"
              fontSize="10"
              fontFamily="var(--f-mono)"
              fill="currentColor"
              opacity="0.55"
            >
              {g.k}
            </text>
          </g>
        );
      })}

      {/* Active spoke — pulsing endpoint with halo. */}
      <line x1="0" y1="0" x2={currentEnd.x} y2={currentEnd.y} stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.5" />
      <circle cx={currentEnd.x} cy={currentEnd.y} r="14" fill="none" stroke="currentColor" strokeOpacity="0.18">
        <animate attributeName="r" values="10;18;10" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.32;0.04;0.32" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={currentEnd.x} cy={currentEnd.y} r="6.5" fill="currentColor">
        <animate attributeName="r" values="6.5;9;6.5" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text
        x={currentEnd.x}
        y={currentEnd.y - 16}
        textAnchor="middle"
        fontSize="11"
        fontFamily="var(--f-mono)"
        fill="currentColor"
        opacity="1"
      >
        {groups[active].k}
      </text>

      {/* Centre node. */}
      <circle r="3" fill="currentColor" />
    </svg>
  );
}

function Skills({ t }) {
  const ref = useRevealRoot([t]);
  const [active, setActive] = useState(0);
  const stageRef = useRef(null);
  const parallaxRef = useRef({ targetX: 0, targetY: 0, currentX: 0, currentY: 0 });
  const rafRef = useRef(0);

  // 2D parallax — translates the SVG by up to SKILLS_PARALLAX_MAX_PX along
  // each axis as the cursor moves. No CSS perspective, no translateZ — so the
  // SVG content cannot project outside the .skills-radar-stage box. Lerped
  // for silky motion, snaps back to centre on pointer leave.
  useEffect(function startParallaxLoop() {
    function tick() {
      const s = parallaxRef.current;
      s.currentX = s.currentX + (s.targetX - s.currentX) * SKILLS_PARALLAX_LERP;
      s.currentY = s.currentY + (s.targetY - s.currentY) * SKILLS_PARALLAX_LERP;
      const el = stageRef.current;
      if (el) {
        el.style.setProperty("--px", `${s.currentX.toFixed(2)}px`);
        el.style.setProperty("--py", `${s.currentY.toFixed(2)}px`);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return function () { cancelAnimationFrame(rafRef.current); };
  }, []);

  function onPointerMove(e) {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;  // -1..1
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;  // -1..1
    parallaxRef.current.targetX = nx * SKILLS_PARALLAX_MAX_PX;
    parallaxRef.current.targetY = ny * SKILLS_PARALLAX_MAX_PX;
  }
  function onPointerLeave() {
    parallaxRef.current.targetX = 0;
    parallaxRef.current.targetY = 0;
  }

  return (
    <section data-section="skills" id="skills" ref={ref}>
      <div className="shell">
        <SecHead num="04" eyebrow={t.skills.eyebrow} title={t.skills.title} meta="stack.radar.v3" />
        <p className="lead-line" data-reveal>{t.skills.lead}</p>

        <div className="skills-layout">
          <div className="skills-tabs" role="tablist" aria-label="stack">
            {t.skills.groups.map(function renderTab(g, i) {
              return (
                <button
                  key={i}
                  role="tab"
                  aria-selected={active === i}
                  className={`skills-tab ${active === i ? "is-active" : ""}`}
                  onMouseEnter={function () { setActive(i); }}
                  onFocus={function () { setActive(i); }}
                  onClick={function () { setActive(i); }}
                >
                  <span className="mono skills-num">/{String(i + 1).padStart(2, "0")}</span>
                  <span className="skills-k">{g.k}</span>
                  <span className="mono skills-count">{g.items.length}</span>
                </button>
              );
            })}
          </div>
          <div className="skills-panel card" data-reveal>
            <div className="skills-panel-head">
              <span className="mono">{`/stack/${t.skills.groups[active].k.toLowerCase().replace(/\W+/g, "-")}`}</span>
              <span className="chip"><span className="chip-dot" />ready</span>
            </div>
            <div className="skills-items">
              {t.skills.groups[active].items.map(function renderItem(it, i) {
                return (
                  <span key={i} className="skill-item" style={{ animationDelay: `${i * 50}ms` }}>{it}</span>
                );
              })}
            </div>

            {/* Contained radar stage — clip-path-safe (overflow: hidden in CSS)
                so the SVG can never spill into the page grid. Cursor moves the
                SVG by a few pixels in 2D — gives a tactile feel without
                introducing 3D transforms that would project content downward. */}
            <div
              ref={stageRef}
              className="skills-radar-stage"
              onMouseMove={onPointerMove}
              onMouseLeave={onPointerLeave}
            >
              <SkillsRadar groups={t.skills.groups} active={active} onActivate={setActive} />
              <div className="skills-radar-hint mono" aria-hidden="true">hover · radar</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Bind to window so other Babel scripts see them
Object.assign(window, {
  Hero, Signal, About, Projects, Skills, SecHead, useRevealRoot,
});
