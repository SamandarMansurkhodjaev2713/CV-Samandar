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
        <div className="num">{num ? <>{num} · </> : null}{eyebrow}</div>
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
  //   1. ALWAYS try the Spline runtime (community asset "GENKUB - Greeting
  //      robot") first, on every device — no device-tier skip. Device tier
  //      used to gate this out on anything reporting <=4 cores/GB, but
  //      `navigator.deviceMemory` is bucketed/approximated by Chrome (a huge
  //      share of real, perfectly capable Android phones report 4 or less),
  //      so that check was quietly showing the legacy robot on ordinary
  //      hardware, not just genuinely weak devices. It's an async dynamic
  //      import + scene download, so it takes time regardless.
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
  //   4. A decisive failure (`__splineRobotFailed`, e.g. a blocked/erroring
  //      request) gets ONE fast retry — cheap insurance against a transient
  //      network blip. An ambiguous silent-hang (the watchdog firing with
  //      neither flag set) does NOT retry, since doubling a 12s wait for a
  //      case that's already ambiguous is a worse trade than just showing
  //      the legacy robot. If Spline is blocked outright (e.g. an ad-blocker
  //      extension blocking unpkg.com/prod.spline.design), retrying the same
  //      URL fails the same way — no client-side logic can force that
  //      through; this only helps genuinely transient failures. Now that
  //      Spline always runs, this legacy path is a true last resort, not a
  //      routine occurrence on any particular class of device.
  //   5. The dynamic import starts immediately here (below) so the network
  //      fetch is well underway before the ~3s intro ends — but robot-spline.js
  //      itself holds the actual `new Application()` + `app.load()` (the part
  //      that opens a second WebGL context and GPU-uploads the scene) until
  //      `sm:intro-done` fires or 3.2s elapses, same reasoning as bg-fx.js's
  //      own gate: that GPU burst competing with the intro's canvas rAF loop
  //      is what was making the intro stutter on real phones. Net effect:
  //      network prewarm happens during the intro (free), the heavy part
  //      happens right as/after the intro clears (no contention), and the
  //      robot is still ready essentially immediately once the hero appears.
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
    // loads on mid-range mobile. The retry attempt gets a shorter watchdog
    // (8s) since a second cold 3G load is unlikely — this caps the worst-case
    // total wait instead of doubling it.
    const ROBOT_FALLBACK_MS = 12000;
    const ROBOT_RETRY_FALLBACK_MS = 8000;
    const ROBOT_POLL_MS = 400;
    const ROBOT_RETRY_DELAY_MS = 600;

    let active = null;
    let fallbackTimer = 0;
    let pollTimer = 0;
    let retryTimer = 0;
    let swapped = false;
    let retriesLeft = 1;

    function clearTimers() {
      if (pollTimer) { window.clearInterval(pollTimer); pollTimer = 0; }
      if (fallbackTimer) { window.clearTimeout(fallbackTimer); fallbackTimer = 0; }
      if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = 0; }
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

    // Kicks off (or re-kicks off, for a retry) one Spline load attempt with
    // its own poll + watchdog pair.
    function trySpline(watchdogMs) {
      // Reset success/failure flags BEFORE creating the controller so a
      // stale value from a hot-reload or prior attempt doesn't trick us.
      window.__splineRobotLoaded = false;
      window.__splineRobotFailed = null;

      active = window.RobotSpline.create(canvas, {
        accent: a1, accent2: a2, motion: 1,
        onExpressionChange: function (n) { setRobotMood(n); },
      });
      robotRef.current = active;

      // Poll for either outcome. Success → stop everything and keep Spline.
      // Decisive failure → retry once (if budget remains), else legacy.
      pollTimer = window.setInterval(function poll() {
        if (swapped) { clearTimers(); return; }
        if (window.__splineRobotLoaded) {
          // Spline succeeded — we're done. Cancel the watchdog so it can't
          // fire later and clobber a working scene.
          clearTimers();
          return;
        }
        if (window.__splineRobotFailed) {
          if (pollTimer) { window.clearInterval(pollTimer); pollTimer = 0; }
          if (fallbackTimer) { window.clearTimeout(fallbackTimer); fallbackTimer = 0; }
          retryOrSwap();
        }
      }, ROBOT_POLL_MS);

      // Watchdog — ONLY swap if neither flag was set by the deadline,
      // meaning the load is silently wedged (no success, no error). A normal
      // success path will have cleared this timer via the poll() above.
      // Ambiguous hangs go straight to legacy — no retry (see comment above).
      fallbackTimer = window.setTimeout(function watchdog() {
        fallbackTimer = 0;
        if (swapped) return;
        if (window.__splineRobotLoaded) return; // success raced the timer
        if (pollTimer) { window.clearInterval(pollTimer); pollTimer = 0; }
        swapToLegacy();
      }, watchdogMs);
    }

    function retryOrSwap() {
      if (swapped) return;
      if (retriesLeft > 0 && window.RobotSpline && window.RobotSpline.create) {
        retriesLeft -= 1;
        if (active && active.dispose) {
          try { active.dispose(); } catch (e) { /* opportunistic */ }
        }
        retryTimer = window.setTimeout(function () {
          retryTimer = 0;
          if (swapped) return;
          trySpline(ROBOT_RETRY_FALLBACK_MS);
        }, ROBOT_RETRY_DELAY_MS);
      } else {
        swapToLegacy();
      }
    }

    // Kick off IMMEDIATELY — the robot must be loaded (or well on its way) by
    // the time the ~3s intro finishes, so the hero is already alive the moment
    // the iris opens onto it. That's a core point of the intro: it buys the
    // heavy Spline runtime + scene download time to arrive behind the opaque
    // curtain. (An earlier version deferred this until `sm:intro-done`; that
    // guaranteed the robot only STARTED loading as the intro ended, i.e. popped
    // in late — the opposite of what we want here.)
    if (window.RobotSpline && window.RobotSpline.create) {
      trySpline(ROBOT_FALLBACK_MS);
    } else {
      // The robot-spline.js bundle never registered (blocked/failed to load
      // outright) — go straight to the lightweight legacy robot.
      swapToLegacy();
    }

    return function disposeRobot() {
      clearTimers();
      if (active && active.dispose) {
        try { active.dispose(); } catch (e) { /* opportunistic */ }
      }
    };
  }, []);

  // Pause the robot's render loop when the hero scrolls out of view. The
  // robot (Spline 3D scene, or the canvas fallback) is the single heaviest
  // animation on the page; rendering it off-screen wastes GPU/CPU and is a
  // major source of scroll jank. Resume the moment the hero returns.
  useEffect(() => {
    const heroEl = document.getElementById("hero");
    if (!heroEl || !("IntersectionObserver" in window)) return undefined;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        const ctrl = robotRef.current;
        if (ctrl && typeof ctrl.setActive === "function") {
          ctrl.setActive(e.isIntersecting);
        }
      });
    }, { threshold: 0.01 });
    io.observe(heroEl);
    return function () { io.disconnect(); };
  }, []);

  // Hero photo parallax — depth from a slow scroll drift + a subtle cursor lean.
  // Desktop + full-motion only (skipped on reduced-motion, low tier, and mobile,
  // where the static backdrop + entrance zoom is enough). GPU-only: writes the
  // `translate` property so it composes with the CSS entrance `scale`.
  // Target is `.hero-photo-inner` — the mask lives on the non-transformed
  // `.hero-photo-wrap` parent so the dissolve edge never drifts with parallax.
  useEffect(() => {
    const photo = document.querySelector(".hero-photo-inner");
    const heroEl = document.getElementById("hero");
    if (!photo || !heroEl) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const low = (typeof window.getDeviceTier === "function") && window.getDeviceTier() === "low";
    const desktop = window.matchMedia("(min-width: 901px)").matches;
    if (reduce || low || !desktop) return undefined;

    let raf = 0, mx = 0, my = 0, inView = true, io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (es) { es.forEach(function (e) { inView = e.isIntersecting; }); }, { threshold: 0 });
      io.observe(heroEl);
    }
    function apply() {
      raf = 0;
      if (!inView) return;
      const r = heroEl.getBoundingClientRect();
      const prog = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
      const ty = prog * 90 + my * 9;   // slow downward drift + cursor lean
      const tx = mx * 9;
      photo.style.translate = tx.toFixed(1) + "px " + ty.toFixed(1) + "px";
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(apply); }
    function onMove(e) {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(apply);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    apply();
    return function () {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      if (io) io.disconnect();
    };
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
      {/* Cockpit-view photo backdrop (desktop) / orbital (mobile). Opaque, so it
          covers the WebGL canvas in the hero; the canvas returns below. The mask
          lives on the static `-wrap` so the dissolve edge never moves; parallax
          `translate` + entrance scale are applied to the `-inner` image layer.
          `.hero-seam` bridges the bottom edge into the page background color so
          there's no tonal jump into the next section. */}
      <div className="hero-photo-wrap" aria-hidden="true">
        <div className="hero-photo-inner" />
      </div>
      <div className="hero-seam" aria-hidden="true" />
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

          <div className="hero-ctas" data-reveal data-reveal-from="translateY(22px)" data-reveal-delay="0.35">
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
            {/* Instrument plate — Spline's free-tier "Built with Spline" badge
                renders into the WebGL frame (not the DOM), so CSS-hiding the
                element doesn't work. The corner is cut out of the (static)
                `.hero-robot` wrapper via mask, and this opaque, non-interactive
                plate sits on top — reads as a cockpit ID tag, not a patch. */}
            <div className="hero-robot-plate mono" aria-hidden="true">
              <span className="hero-robot-plate-l"><span className="hero-robot-plate-dot" />CORE.AI · ONLINE</span>
              <span className="hero-robot-plate-rail" />
              <span className="hero-robot-plate-r">UNIT-01</span>
            </div>
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
// SIGNAL — 6 editorial rows, full-width, that expand in place to reveal their
// description. Replaces the old bento grid of 6 tilting mini-schema cards: the
// schemas read as decoration without real meaning, and the constant per-card
// tilt/shine had no purpose beyond motion. One row open at a time; desktop
// opens on hover/focus, mobile is a tap-accordion.
// ─────────────────────────────────────────────────────────────────────────────

// Short right-hand descriptor per row — a compression of the row's own `v`
// text from content.js into 1-2 words, not invented content.
const SIGNAL_TAILS = [
  "web · MVP · системы",
  "агенты · данные",
  "боты · задачи",
  "CRM · дашборды",
  "premium-сайты",
  "идея → прод",
];

function SignalRow({ card, index, total, open, onToggle, hasHover }) {
  const tail = SIGNAL_TAILS[index] || "";
  // On hover-capable desktops, mouseenter always fires before click (the
  // cursor has to enter the row before it can be clicked) — if click always
  // toggled, it would immediately re-close whatever hover just opened. So on
  // those devices click behaves like hover (ensures open, never closes);
  // only touch (no real hover) gets a true open/close toggle on tap.
  const hoverHandlers = hasHover
    ? { onMouseEnter: () => onToggle(index, true), onFocus: () => onToggle(index, true) }
    : {};
  return (
    <button
      type="button"
      className={`signal-row${open ? " is-open" : ""}`}
      data-code={card.code}
      style={{ "--row-i": index, "--row-total": Math.max(1, total - 1) }}
      data-reveal
      data-reveal-from="translateY(28px)"
      data-reveal-delay={(index * 0.06).toFixed(2)}
      aria-expanded={open}
      {...hoverHandlers}
      onClick={() => onToggle(index, hasHover)}
    >
      {/* Oversized background numeral + procedural accent glow — driven only
          by this row's own real index/total (--row-i/--row-total), never an
          invented per-category treatment. See .row-ghost / ::after in
          features.css. */}
      <span className="row-ghost" aria-hidden="true">{card.code}</span>

      <span className="signal-row-num mono">/{card.code}</span>

      <span className="signal-row-main">
        <span className="signal-row-k">{card.k}</span>
        <span className="signal-row-detail" aria-hidden={!open}>
          <span className="signal-row-detail-inner">
            <span className="signal-row-v">{card.v}</span>
          </span>
        </span>
      </span>

      <span className="signal-row-tail mono" aria-hidden="true">
        <span className="signal-row-tail-text">{tail}</span>
        <svg className="signal-row-arrow" viewBox="0 0 24 24" width="18" height="18"
          fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
          strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
    </button>
  );
}

function Signal({ t }) {
  const ref = useRevealRoot([t]);
  // -1 = nothing open. Hover/focus opens the hovered row and "sticks" (doesn't
  // reset on mouse-leave) until another row is hovered or the open one is
  // clicked. Click/tap toggles (accordion behavior on touch — see SignalRow's
  // hasHover branching for why desktop click doesn't use the toggle path).
  const [openIndex, setOpenIndex] = useState(-1);
  const hasHoverRef = useRef(null);
  if (hasHoverRef.current === null) {
    hasHoverRef.current = typeof window.matchMedia === "function"
      && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  const handleToggle = (i, isHover) => {
    setOpenIndex((prev) => {
      if (isHover) return i;
      return prev === i ? -1 : i;
    });
  };

  return (
    <section data-section="signal" id="signal" data-enter="emerge" ref={ref}>
      <div className="shell">
        <SecHead
          num="01"
          eyebrow={t.signal.eyebrow}
          title={t.signal.title}
          em={t.signal.title.split(" ").pop()}
          meta={`${t.signal.cards.length} каналов · сигнал`}
        />
        <div className="signal-rows">
          {t.signal.cards.map((c, i) => (
            <SignalRow
              key={i}
              card={c}
              index={i}
              total={t.signal.cards.length}
              open={openIndex === i}
              onToggle={handleToggle}
              hasHover={hasHoverRef.current}
            />
          ))}
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
// `active` (default true) pauses the whole loop while false — About passes
// its own in-view state so this stops re-rendering React state every 30ms
// while scrolled off-screen; it simply resumes typing where it left off once
// back in view, rather than restarting the phrase.
function useCurrentlyRotator(phrases, active) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState("typing"); // typing | hold | erasing
  const idxRef = useRef(0);
  const cursorRef = useRef(0);
  useEffect(() => {
    if (!phrases || phrases.length === 0) return undefined;
    if (active === false) return undefined;
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
  }, [phrases, phase, active]);
  return text;
}

function About({ t }) {
  const ref = useRevealRoot([t]);
  const cardRef = useRef(null);
  const [runCounters, setRunCounters] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [clock, setClock] = useState(() => formatTashkentTime(new Date()));
  const [pulseIndex, setPulseIndex] = useState(-1);
  const contribCells = useMemo(() => buildContribCells(CONTRIB_ROWS, CONTRIB_COLS), []);
  const currentlyPhrases = t.about.currently || [];
  const currentlyText = useCurrentlyRotator(currentlyPhrases, isVisible);

  // Section-in-view: `runCounters` latches once (counters/pulses only ever
  // animate their first run-in); `isVisible` tracks continuously so the
  // typewriter above can pause its 30ms setState loop while off-screen
  // instead of quietly re-rendering React forever in the background.
  useEffect(() => {
    if (!cardRef.current) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        setIsVisible(e.isIntersecting);
        if (e.isIntersecting && e.intersectionRatio > 0.3) {
          setRunCounters(true);
        }
      });
    }, { threshold: [0, 0.3, 0.5] });
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
    <section data-section="about" id="about" data-enter="develop" ref={ref}>
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

  // No per-card scroll-reveal here: these cards live in a desktop collapse
  // (display:none until expanded) and a mobile peek-carousel (off-screen
  // siblings), where the reveal system's `opacity:0 !important` hidden pose
  // would strand them invisible (inline !important beats any override). The
  // section-level `data-enter="rise"` handles the entrance; a light CSS stagger
  // (tied to .sec-in) adds life without a per-card hidden state. Expanded
  // cards get their own projExpandIn animation.
  return (
    <article
      ref={cardRef}
      className="proj-card card"
      style={{ "--proj-i": i }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="proj-glow" />
      <span className="proj-num mono" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
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

      <a
        href={p.url || "#"}
        className="proj-cta mono"
        target={p.url && p.url.indexOf("http") === 0 ? "_blank" : undefined}
        rel={p.url && p.url.indexOf("http") === 0 ? "noopener noreferrer" : undefined}
        onClick={p.url ? undefined : (e) => e.preventDefault()}
      >
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
    // Horizontal peek-carousel: scroll the carousel sideways to center the
    // card (inline), never scroll the page vertically (block: nearest).
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
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

// Russian plural for "проект": 1 проект, 2-4 проекта, 5+ проектов.
function pluralProjects(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "проект";
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "проекта";
  return "проектов";
}

function Projects({ t }) {
  const ref = useRevealRoot([t]);
  const gridRef = useRef(null);
  // Desktop shows the first 2 cases; the rest expand on request (keeps the
  // section short + signals there's more). Mobile ignores this and shows all
  // via a horizontal peek-carousel (CSS), paged by the dots below.
  const [expanded, setExpanded] = useState(false);
  const items = t.projects.items;
  const hiddenCount = Math.max(0, items.length - 2);
  return (
    <section data-section="projects" id="projects" data-enter="rise" ref={ref}>
      <div className="shell">
        <SecHead num="03" eyebrow={t.projects.eyebrow} title={t.projects.title} meta={`${items.length} cases · 2024–26`} />
        <div className={`proj-grid ${expanded ? "is-expanded" : "is-collapsed"}`} ref={gridRef}>
          {items.map((p, i) => <ProjectCard key={i} p={p} i={i} cta={t.projects.cta} />)}
        </div>

        {hiddenCount > 0 ? (
          <button
            type="button"
            className="proj-expand mono"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            data-cursor="link"
            data-cursor-label={expanded ? "collapse" : "show all"}
          >
            <span className="proj-expand-txt">
              {expanded ? "Свернуть" : `Ещё ${hiddenCount} ${pluralProjects(hiddenCount)}`}
            </span>
            <span className="proj-expand-ico" aria-hidden="true">{expanded ? "↑" : "↓"}</span>
          </button>
        ) : null}

        {/* Mobile-only carousel pager (CSS hides it on desktop). */}
        <ProjectChapterDots items={items} gridRef={gridRef} />
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

      {/* Coverage polygon — links every group's endpoint into one shape, so
          the radar reads as an actual stack "footprint" at a glance instead
          of a single pointer on an otherwise-empty dial. Static + dim; the
          active spoke below still carries all the emphasis. */}
      <polygon
        points={endpoints.map(function toPt(e) { return `${e.x.toFixed(1)},${e.y.toFixed(1)}`; }).join(" ")}
        fill="currentColor"
        fillOpacity="0.045"
        stroke="currentColor"
        strokeOpacity="0.16"
        strokeWidth="1"
        strokeLinejoin="round"
      />

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
  // Desktop: which tab is active (always a valid index, tabs don't "close").
  // Mobile: which accordion row is open (-1 = none) — tapping a group should
  // expand its tools inline instead of routing through a separate panel the
  // user has to scroll to find, which was the actual mobile complaint.
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const stageRef = useRef(null);
  const parallaxRef = useRef({ targetX: 0, targetY: 0, currentX: 0, currentY: 0 });
  const rafRef = useRef(0);

  useEffect(function watchLayout() {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = function () { setIsMobile(mq.matches); };
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
    else if (mq.addListener) mq.addListener(apply);
    return function () {
      if (mq.removeEventListener) mq.removeEventListener("change", apply);
      else if (mq.removeListener) mq.removeListener(apply);
    };
  }, []);

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
    <section data-section="skills" id="skills" data-enter="converge" ref={ref}>
      <div className="shell">
        <SecHead num="04" eyebrow={t.skills.eyebrow} title={t.skills.title} meta="stack.radar.v3" />
        <p className="lead-line" data-reveal>{t.skills.lead}</p>

        {isMobile ? (
          /* Mobile: tapping a group expands its tools INLINE, right under
             that row — the old layout put tabs above and the tools panel
             below, both scrolled far apart, which is what read as
             inconvenient. One shared radar sits below, highlighting
             whichever group is currently open (falls back to the first). */
          <div className="skills-acc">
            {t.skills.groups.map(function renderAccRow(g, i) {
              const isOpen = active === i;
              return (
                <div key={i} className={`skills-acc-row ${isOpen ? "is-open" : ""}`}>
                  <h3 className="skills-acc-h">
                    <button
                      type="button"
                      className="skills-acc-head"
                      aria-expanded={isOpen}
                      aria-controls={`skills-acc-body-${i}`}
                      id={`skills-acc-head-${i}`}
                      onClick={function () { setActive(isOpen ? -1 : i); }}
                    >
                      <span className="mono skills-num">/{String(i + 1).padStart(2, "0")}</span>
                      <span className="skills-k">{g.k}</span>
                      <span className="mono skills-count">{g.items.length}</span>
                      <span className="skills-acc-chev" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                    </button>
                  </h3>
                  <div
                    className="skills-acc-body"
                    id={`skills-acc-body-${i}`}
                    role="region"
                    aria-labelledby={`skills-acc-head-${i}`}
                    hidden={!isOpen}
                  >
                    <div className="skills-items">
                      {g.items.map(function renderItem(it, k) {
                        return (
                          <span key={k} className="skill-item" style={{ animationDelay: `${k * 50}ms` }}>{it}</span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              ref={stageRef}
              className="skills-radar-stage"
              onMouseMove={onPointerMove}
              onMouseLeave={onPointerLeave}
            >
              <SkillsRadar groups={t.skills.groups} active={Math.max(0, active)} onActivate={setActive} />
              <div className="skills-radar-hint mono" aria-hidden="true">tap a group above</div>
            </div>
          </div>
        ) : (
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
                <span className="mono">{`/stack/${t.skills.groups[Math.max(0, active)].k.toLowerCase().replace(/\W+/g, "-")}`}</span>
                <span className="chip"><span className="chip-dot" />ready</span>
              </div>
              <div className="skills-items">
                {t.skills.groups[Math.max(0, active)].items.map(function renderItem(it, i) {
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
                <SkillsRadar groups={t.skills.groups} active={Math.max(0, active)} onActivate={setActive} />
                <div className="skills-radar-hint mono" aria-hidden="true">hover · radar</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Bind to window so other Babel scripts see them
Object.assign(window, {
  Hero, Signal, About, Projects, Skills, SecHead, useRevealRoot,
});
