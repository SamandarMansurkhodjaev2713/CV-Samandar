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
  const [bootIdx, setBootIdx] = useState(0);
  const [robotMood, setRobotMood] = useState("idle");
  const lines = t.hero.boot_lines;

  useEffect(() => {
    setBootIdx(0);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setBootIdx(i);
      if (i >= lines.length) clearInterval(id);
    }, 380);
    return () => clearInterval(id);
  }, [t]);

  useEffect(() => {
    if (!robotCanvasRef.current) return;
    const factory = window.RobotHead || window.Brain;
    if (!factory || !factory.create) return;
    const rootStyles = getComputedStyle(document.documentElement);
    const a1 = rootStyles.getPropertyValue("--accent").trim() || "#D97757";
    const a2 = rootStyles.getPropertyValue("--accent-2").trim() || "#C89B5E";
    const r = factory.create(robotCanvasRef.current, {
      accent: a1, accent2: a2, motion: 1,
      onExpressionChange: function onMood(name) { setRobotMood(name); },
    });
    robotRef.current = r;
    return function disposeRobot() { if (r && r.dispose) r.dispose(); };
  }, []);

  function onRobotClick() {
    // Light haptic — Android only, iOS no-ops. Done via window.navigator
    // directly so this component stays decoupled from app.jsx's haptic helper.
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(8); } catch (e) { /* opportunistic */ }
    }
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
            <canvas ref={robotCanvasRef} className="hero-robot-canvas" data-cursor="link" data-cursor-label="click · change mood" />
            <div className="hero-robot-meta mono">
              <span>core.ai</span>
              <span className="hero-robot-state">
                <span className={`hero-robot-dot hero-robot-dot--${robotMood}`} />
                {robotMood}
              </span>
            </div>
            <div className="hero-robot-hint mono">click · cycle expression</div>
          </div>

          <div className="hero-terminal">
            <div className="term-head">
              <div className="term-dots"><i></i><i></i><i></i></div>
              <div className="term-title mono">core.engine — boot</div>
              <div className="term-meta mono">v.2026</div>
            </div>
            <div className="term-body mono">
              {lines.slice(0, bootIdx).map((l, i) => (
                <div key={i} className="term-line">
                  <span className="term-prompt">›</span>
                  <span>{l}</span>
                  <span className="term-ok">ok</span>
                </div>
              ))}
              {bootIdx < lines.length ? (
                <div className="term-line term-active">
                  <span className="term-prompt">›</span>
                  <span>{lines[bootIdx]}</span>
                  <span className="term-cursor">▌</span>
                </div>
              ) : (
                <div className="term-line term-deploy">
                  <span className="term-prompt">›</span>
                  <span>READY · listening on :443</span>
                </div>
              )}
            </div>
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

function SignalCard({ card, index }) {
  const cardRef = useRef(null);
  const SPARK_POINTS = 28;
  const sparkData = useMemo(function memoSpark() {
    return generateSparkline(7 + index * 13, SPARK_POINTS);
  }, [index]);

  const sparkPath = useMemo(function buildPath() {
    const w = 100;
    const h = 36;
    return sparkData.map(function pt(v, i) {
      const x = (i / (SPARK_POINTS - 1)) * w;
      const y = h - v * h;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
  }, [sparkData]);

  const sparkArea = useMemo(function buildArea() {
    return `${sparkPath} L 100 36 L 0 36 Z`;
  }, [sparkPath]);

  // Live counter — increments at a measured cadence so the card feels "alive"
  // without distracting. Each card has its own range and tick interval.
  const counterStart = 100 + index * 47;
  const [counter, setCounter] = useState(counterStart);
  useEffect(function tickCounter() {
    const interval = 1800 + (index % 3) * 600;
    const id = window.setInterval(function bump() {
      setCounter(function (prev) { return prev + 1; });
    }, interval);
    return function () { window.clearInterval(id); };
  }, [index]);

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
      className="card signal-card"
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
        <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="signal-spark-svg" aria-hidden="true">
          <defs>
            <linearGradient id={`sig-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={sparkArea} fill={`url(#sig-grad-${index})`} />
          <path d={sparkPath} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="signal-spark-stroke" />
        </svg>
        <div className="signal-spark-meta mono">
          <span className="signal-spark-dot" />
          <span>{counter.toString().padStart(4, "0")}</span>
          <span className="signal-spark-unit">ops</span>
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
// SKILLS — radar / orbit
// ─────────────────────────────────────────────────────────────────────────────
function Skills({ t }) {
  const ref = useRevealRoot([t]);
  const [active, setActive] = useState(0);
  return (
    <section data-section="skills" id="skills" ref={ref}>
      <div className="shell">
        <SecHead num="04" eyebrow={t.skills.eyebrow} title={t.skills.title} meta="stack.radar.v3" />
        <p className="lead-line" data-reveal>{t.skills.lead}</p>
        <div className="skills-layout">
          <div className="skills-tabs" role="tablist" aria-label="stack">
            {t.skills.groups.map((g, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={active === i}
                className={`skills-tab ${active === i ? "is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
              >
                <span className="mono skills-num">/{String(i + 1).padStart(2, "0")}</span>
                <span className="skills-k">{g.k}</span>
                <span className="mono skills-count">{g.items.length}</span>
              </button>
            ))}
          </div>
          <div className="skills-panel card" data-reveal>
            <div className="skills-panel-head">
              <span className="mono">{`/stack/${t.skills.groups[active].k.toLowerCase().replace(/\W+/g, "-")}`}</span>
              <span className="chip"><span className="chip-dot" />ready</span>
            </div>
            <div className="skills-items">
              {t.skills.groups[active].items.map((it, i) => (
                <span key={i} className="skill-item" style={{ animationDelay: `${i * 50}ms` }}>{it}</span>
              ))}
            </div>
            <SkillsRadar groups={t.skills.groups} active={active} />
          </div>
        </div>
      </div>
    </section>
  );
}

// SkillsRadar — interpolated polygon morph between tabs + rotating scan-line
// + pulsing concentric rings. The active spoke smoothly tweens its endpoint
// between groups (radial easing) instead of snapping.
function SkillsRadar({ groups, active }) {
  const total = groups.length;
  const R = 120;
  const RADAR_TWEEN_MS = 620;
  const SCAN_PERIOD_S = 4.5;

  const endpoints = useMemo(() => {
    return groups.map((g, i) => {
      const a = (i / total) * Math.PI * 2 - Math.PI / 2;
      const r = R * (0.55 + Math.min(0.45, g.items.length / 10));
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    });
  }, [groups, total]);

  // Animated active endpoint (tween on tab change).
  const [currentEnd, setCurrentEnd] = useState(() => endpoints[active] || { x: 0, y: 0 });
  const fromRef = useRef(currentEnd);
  const startedAtRef = useRef(0);
  useEffect(() => {
    if (!endpoints[active]) return undefined;
    fromRef.current = { ...currentEnd };
    startedAtRef.current = performance.now();
    let raf = 0;
    function step(now) {
      const tt = Math.min(1, (now - startedAtRef.current) / RADAR_TWEEN_MS);
      const eased = 1 - Math.pow(1 - tt, 3);
      const target = endpoints[active];
      setCurrentEnd({
        x: fromRef.current.x + (target.x - fromRef.current.x) * eased,
        y: fromRef.current.y + (target.y - fromRef.current.y) * eased,
      });
      if (tt < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  // currentEnd intentionally omitted — we want one tween per active change,
  // not a re-tween every interpolated frame.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, endpoints]);

  // Scan-line angle in real time.
  const [scanAngle, setScanAngle] = useState(-90);
  useEffect(() => {
    let raf = 0;
    function tick(now) {
      const t = (now / 1000) % SCAN_PERIOD_S;
      setScanAngle((t / SCAN_PERIOD_S) * 360 - 90);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg className="skills-radar" viewBox="-180 -180 360 360" aria-hidden="true">
      <defs>
        <linearGradient id="skills-scan-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="160" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
          <stop offset="55%" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="skills-rings-grad" cx="0" cy="0" r="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="60%" stopColor="currentColor" stopOpacity="0.05" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle r="170" fill="url(#skills-rings-grad)" />

      {[0.4, 0.7, 1].map((s, i) => (
        <circle
          key={i}
          r={R * s}
          fill="none"
          stroke="currentColor"
          strokeOpacity=".10"
          className="skills-radar-ring"
          style={{ animationDelay: `${i * 0.8}s` }}
        />
      ))}

      <line x1="-160" y1="0" x2="160" y2="0" stroke="currentColor" strokeOpacity=".06" />
      <line x1="0" y1="-160" x2="0" y2="160" stroke="currentColor" strokeOpacity=".06" />

      {/* Rotating scan triangle */}
      <g transform={`rotate(${scanAngle.toFixed(2)})`}>
        <polygon points="0,0 160,-22 160,22" fill="url(#skills-scan-grad)" />
        <line x1="0" y1="0" x2="160" y2="0" stroke="currentColor" strokeOpacity=".5" strokeWidth="1" />
      </g>

      {/* Inactive spokes (dim) */}
      {groups.map((g, i) => {
        if (i === active) return null;
        const e = endpoints[i];
        return (
          <g key={i}>
            <line x1="0" y1="0" x2={e.x} y2={e.y} stroke="currentColor" strokeOpacity="0.10" />
            <circle cx={e.x} cy={e.y} r="3.5" fill="currentColor" opacity="0.45" />
            <text x={e.x} y={e.y - 14} textAnchor="middle" fontSize="10" fontFamily="var(--f-mono)" fill="currentColor" opacity="0.45">
              {g.k}
            </text>
          </g>
        );
      })}

      {/* Active spoke — animated endpoint */}
      <line x1="0" y1="0" x2={currentEnd.x} y2={currentEnd.y} stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.5" />
      <circle cx={currentEnd.x} cy={currentEnd.y} r="6.5" fill="currentColor">
        <animate attributeName="r" values="6.5;9;6.5" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <text x={currentEnd.x} y={currentEnd.y - 16} textAnchor="middle" fontSize="11" fontFamily="var(--f-mono)" fill="currentColor" opacity="1">
        {groups[active].k}
      </text>

      <circle r="3" fill="currentColor" />
    </svg>
  );
}

// Bind to window so other Babel scripts see them
Object.assign(window, {
  Hero, Signal, About, Projects, Skills, SecHead, useRevealRoot,
});
