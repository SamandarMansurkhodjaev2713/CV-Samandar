// components-2.jsx — Services, CV, Process, Trust, Contact, Footer

const { useEffect: useEffect2, useRef: useRef2, useState: useState2, useMemo: useMemoFromComponents1 } = React;

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES — unique cards, no terminal commands.
//
// Each card has:
//   • A distinctive SVG glyph that visually telegraphs the service category
//   • A varied "hover animation kind" cycled per index so the grid doesn't
//     read as a uniform copy-paste — every card has its own micro-personality
//   • A clean io-pill at the bottom showing the value transform
//
// Glyphs are pure inline SVG (no external icons) so they always inherit the
// current accent color via `currentColor`. They're index-keyed: card N gets
// glyph N. If the content array changes length, glyphs cycle from the start.
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_HOVER_KINDS = ["lift", "tilt-l", "tilt-r", "glow", "scale", "shift", "edge", "ripple"];

// Inline SVG glyphs — return ReactElement keyed by index. Eight distinct
// concepts mapped to the eight content slots in order.
const SERVICE_GLYPHS = [
  // 0 · Web Apps — stacked layers
  function GlyphLayers() {
    return (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="6"  y="8"  width="28" height="6" rx="1" />
        <rect x="6"  y="17" width="28" height="6" rx="1" />
        <rect x="6"  y="26" width="28" height="6" rx="1" />
        <line x1="11" y1="11" x2="11" y2="11" />
        <line x1="11" y1="20" x2="11" y2="20" />
        <line x1="11" y1="29" x2="11" y2="29" />
      </svg>
    );
  },
  // 1 · Landing & Sites — page outline + accent block
  function GlyphPage() {
    return (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="8" y="6" width="24" height="28" rx="1" />
        <line x1="13" y1="13" x2="27" y2="13" />
        <line x1="13" y1="18" x2="22" y2="18" />
        <rect x="13" y="22" width="14" height="6" fill="currentColor" opacity="0.25" stroke="none" />
      </svg>
    );
  },
  // 2 · Telegram Bots — speech bubble with dots
  function GlyphBubble() {
    return (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 10 h24 a2 2 0 0 1 2 2 v14 a2 2 0 0 1 -2 2 H18 l-6 5 v-5 H8 a2 2 0 0 1 -2 -2 V12 a2 2 0 0 1 2 -2 z" />
        <circle cx="14" cy="19" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="20" cy="19" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="26" cy="19" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    );
  },
  // 3 · AI Automation — node graph
  function GlyphNodes() {
    return (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="3" fill="currentColor" stroke="none" />
        <circle cx="30" cy="10" r="3" fill="currentColor" stroke="none" />
        <circle cx="20" cy="22" r="3" fill="currentColor" stroke="none" />
        <circle cx="10" cy="32" r="3" fill="currentColor" stroke="none" />
        <circle cx="30" cy="32" r="3" fill="currentColor" stroke="none" />
        <line x1="10" y1="10" x2="20" y2="22" />
        <line x1="30" y1="10" x2="20" y2="22" />
        <line x1="20" y1="22" x2="10" y2="32" />
        <line x1="20" y1="22" x2="30" y2="32" />
      </svg>
    );
  },
  // 4 · Dashboards — bar chart
  function GlyphChart() {
    return (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="6" y1="34" x2="34" y2="34" />
        <rect x="9"  y="22" width="4" height="12" fill="currentColor" opacity="0.4" stroke="none" />
        <rect x="17" y="14" width="4" height="20" fill="currentColor" opacity="0.7" stroke="none" />
        <rect x="25" y="18" width="4" height="16" fill="currentColor" opacity="0.55" stroke="none" />
      </svg>
    );
  },
  // 5 · MVP / Prototype — arrow zig-zag (idea → prototype)
  function GlyphArrow() {
    return (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 28 L14 20 L20 26 L28 14 L34 18" />
        <path d="M28 10 L34 14 L30 20" />
        <circle cx="6"  cy="28" r="2" fill="currentColor" stroke="none" />
      </svg>
    );
  },
  // 6 · Internal Tools — wrench / spanner
  function GlyphTool() {
    return (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M27 10 a6 6 0 0 0 -3 11 L9 36 l4 -1 L28 20 a6 6 0 0 0 4 -10 l-3 3 -3 0 0 -3 z" />
        <circle cx="13" cy="32" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  },
  // 7 · Tech Consulting — question / dialog
  function GlyphChat() {
    return (
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 10 c-3 0 -6 2 -6 5 c0 2 1 4 3 5 v3 l3 -2 c2 1 4 1 6 0" />
        <path d="M20 17 c0 -3 3 -5 7 -5 c4 0 7 2 7 5 c0 3 -2 5 -5 5 l-4 3 v-3 c-3 -1 -5 -3 -5 -5 z" />
        <circle cx="27" cy="17" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  },
];

function ServiceCard({ item, index }) {
  const cardRef = useRef2(null);
  const hoverKind = SERVICE_HOVER_KINDS[index % SERVICE_HOVER_KINDS.length];
  const Glyph = SERVICE_GLYPHS[index % SERVICE_GLYPHS.length];

  function onMouseMove(e) {
    const el = cardRef.current;
    if (!el || hoverKind !== "tilt-l" && hoverKind !== "tilt-r") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const sign = hoverKind === "tilt-l" ? 1 : -1;
    el.style.setProperty("--rx", `${(-y * 5 * sign).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 5 * sign).toFixed(2)}deg`);
  }
  function onMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <article
      ref={cardRef}
      className={`service-card card service-card--hover-${hoverKind}`}
      data-reveal
      data-reveal-delay={(index * 0.04).toFixed(2)}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="service-card-head">
        <span className="service-card-num mono">/{String(index + 1).padStart(2, "0")}</span>
        <span className="service-card-badge mono">{item.io}</span>
      </div>

      <div className="service-card-glyph" aria-hidden="true">
        <Glyph />
      </div>

      <h3 className="service-card-k">{item.k}</h3>
      <p className="service-card-v">{item.v}</p>
    </article>
  );
}

function Services({ t }) {
  const ref = useRevealRoot([t]);
  return (
    <section data-section="services" id="services" ref={ref}>
      <div className="shell">
        <SecHead num="05" eyebrow={t.services.eyebrow} title={t.services.title} meta={`${t.services.items.length} services`} />
        <div className="services-grid">
          {t.services.items.map(function renderService(s, i) {
            return <ServiceCard key={i} item={s} index={i} />;
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CV — Resume document (proper, printable, mobile-friendly)
// ─────────────────────────────────────────────────────────────────────────────
function CV({ t, links }) {
  const ref = useRevealRoot([t]);
  const [openIdx, setOpenIdx] = useState2(0);
  // Roles are an accordion: only one open at a time normally. For print we
  // force ALL open so the printed PDF shows the full timeline, then restore
  // the user's previous state after the print dialog closes.
  const restoreOpenIdx = useRef2(0);

  function onPrint() {
    restoreOpenIdx.current = openIdx;
    setOpenIdx(-2); // sentinel: "all open" (any non-numeric index that isn't matched)
    // Use a microtask + rAF so React commits the open-state change before
    // the synchronous window.print() blocks the main thread.
    Promise.resolve().then(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          window.print();
        });
      });
    });
  }

  // afterprint event — restore the previous open role so the on-screen view
  // doesn't stay fully expanded.
  useEffect2(function bindAfterPrint() {
    const handler = function () {
      setOpenIdx(restoreOpenIdx.current);
    };
    window.addEventListener("afterprint", handler);
    return function () { window.removeEventListener("afterprint", handler); };
  }, []);

  // derive aggregate stats from timeline
  const years = (() => {
    const ys = t.cv.timeline.map(n => parseInt(String(n.y).match(/\d{4}/)?.[0] || "0", 10)).filter(Boolean);
    if (!ys.length) return null;
    return `${Math.min(...ys)}—${Math.max(...ys)}`;
  })();

  return (
    <section data-section="cv" id="cv" ref={ref}>
      <div className="shell">
        <SecHead num="06" eyebrow={t.cv.eyebrow} title={t.cv.title} em={t.cv.title.split(" ").pop()} meta={`v.2026 · ${years || "active"}`} />

        <article className="cv-doc" data-reveal>
          {/* Doc chrome */}
          <header className="cv-doc-head">
            <div className="cv-doc-tabs mono" aria-hidden="true">
              <span className="cv-doc-tab is-active">samandar.cv</span>
              <span className="cv-doc-tab">readme.md</span>
            </div>
            <div className="cv-doc-actions mono">
              <button className="cv-action" type="button" onClick={onPrint} data-cursor="link" data-cursor-label="print / pdf">
                <span className="cv-action-ico" aria-hidden="true">⌘P</span>
                <span>print · pdf</span>
              </button>
              <a className="cv-action" href={links?.email ? `mailto:${links.email}?subject=CV%20request` : "#"} data-cursor="send" data-cursor-label="request signed cv">
                <span className="cv-action-ico" aria-hidden="true">↗</span>
                <span>request</span>
              </a>
            </div>
          </header>

          {/* Identity strip */}
          <div className="cv-id">
            <div className="cv-id-l">
              <h3 className="cv-id-name" data-reveal-words>{t.cv.id?.name || "Samandar"}</h3>
              <p className="cv-id-role">{t.cv.id?.role || t.cv.lead}</p>
              <div className="cv-id-meta mono">
                {(t.cv.id?.meta || []).map((m, i) => (
                  <span key={i}>{m}</span>
                ))}
              </div>
            </div>
            <dl className="cv-id-stats" aria-label="stats">
              {(t.cv.id?.stats || []).map((s, i) => (
                <div key={i} className="cv-id-stat">
                  <dt className="mono">{s.k}</dt>
                  <dd>{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Two-column body */}
          <div className="cv-doc-body">
            <main className="cv-main">
              <h4 className="cv-block-h mono">{t.cv.exp_title || "experience"}</h4>

              <ol className="cv-roles">
                {t.cv.timeline.map((node, i) => {
                  const isOpen = (openIdx === -2) || openIdx === i;
                  return (
                    <li key={i} className={`cv-role ${isOpen ? "is-open" : ""}`}>
                      <button
                        className="cv-role-head"
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenIdx(isOpen ? -1 : i)}
                        data-cursor="read"
                        data-cursor-label={isOpen ? "collapse" : "expand"}
                      >
                        <span className="cv-role-y mono">{node.y}</span>
                        <span className="cv-role-main">
                          <span className="cv-role-title">{node.role}</span>
                          <span className="cv-role-org">{node.org}</span>
                        </span>
                        <span className="cv-role-tag mono">{node.tag}</span>
                        <span className="cv-role-chev" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                      </button>
                      <div className="cv-role-body" hidden={!isOpen}>
                        <ul className="cv-points">
                          {node.points.map((p, k) => <li key={k}>{p}</li>)}
                        </ul>
                        {node.stack && node.stack.length ? (
                          <div className="cv-role-stack">
                            {node.stack.map((s, k) => <span key={k} className="mono cv-chip">{s}</span>)}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </main>

            <aside className="cv-side">
              {/* Education */}
              <section className="cv-block">
                <h4 className="cv-block-h mono">{t.cv.edu_title}</h4>
                <ul className="cv-side-list">
                  {t.cv.edu.map((e, i) => (
                    <li key={i} className="cv-edu-row">
                      <span className="mono cv-edu-y">{e.y}</span>
                      <span className="cv-edu-k">{e.k}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Strengths */}
              {t.cv.strengths?.length ? (
                <section className="cv-block">
                  <h4 className="cv-block-h mono">{t.cv.strengths_title || "strengths"}</h4>
                  <ul className="cv-side-list cv-strengths">
                    {t.cv.strengths.map((s, i) => (
                      <li key={i}><span className="cv-bullet-mark" aria-hidden="true">›</span>{s}</li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {/* Languages */}
              {t.cv.langs?.length ? (
                <section className="cv-block">
                  <h4 className="cv-block-h mono">{t.cv.langs_title || "languages"}</h4>
                  <ul className="cv-langs">
                    {t.cv.langs.map((l, i) => (
                      <li key={i} className="cv-lang">
                        <span>{l.k}</span>
                        <span className="cv-lang-bar" aria-hidden="true">
                          <span className="cv-lang-bar-fill" style={{ width: `${l.lv}%` }} />
                        </span>
                        <span className="mono cv-lang-lvl">{l.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          </div>

          <footer className="cv-doc-foot mono">
            <span>— end of file —</span>
            <span>{t.cv.foot || "generated 2026 · verifiable on request"}</span>
          </footer>
        </article>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS — deployment pipeline. Vertical terminal "stages" that flip
//   queued → running (with typewriter command + progress bar) → done (with
//   completion time) as they enter the viewport.
//
// Each stage handles its own typewriter + progress timeline independently so
// state stays simple and the row mounts behave like real CI logs.
// ─────────────────────────────────────────────────────────────────────────────
const PROC_TYPE_INTERVAL_MS = 22;          // typewriter cadence
const PROC_RUN_MIN_MS = 520;               // visual run-time per stage
const PROC_RUN_VAR_MS = 240;
const PROC_VIEWPORT_TRIGGER_RATIO = 0.4;
const PROC_OUTPUT_SAMPLES = [
  "ok · ready",
  "compiled in 84ms",
  "shipped to prod",
  "200 · listening",
  "no regressions",
  "manifest verified",
  "queue empty",
];

function ProcStage({ step, index, refSetter }) {
  // Stage states: queued (idle) → running (typing + progress) → done (success).
  const [state, setState] = useState2("queued");
  const [typed, setTyped] = useState2("");
  const [progress, setProgress] = useState2(0);
  const stageRef = useRef2(null);
  const timersRef = useRef2({ typer: 0, prog: 0, done: 0 });

  // Combined ref: store internally + report to parent collection.
  function combinedRef(el) {
    stageRef.current = el;
    if (typeof refSetter === "function") refSetter(el);
  }

  // Run typewriter when state flips to "running".
  useEffect2(function runTyper() {
    if (state !== "running") return undefined;
    const cmd = step.cmd;
    let cursor = 0;
    timersRef.current.typer = window.setInterval(function step1() {
      cursor++;
      setTyped(cmd.slice(0, cursor));
      if (cursor >= cmd.length) {
        window.clearInterval(timersRef.current.typer);
        timersRef.current.typer = 0;
      }
    }, PROC_TYPE_INTERVAL_MS);
    return function cleanup() {
      if (timersRef.current.typer) {
        window.clearInterval(timersRef.current.typer);
        timersRef.current.typer = 0;
      }
    };
  }, [state, step.cmd]);

  // Progress bar fills 0 → 100 over PROC_RUN_MIN_MS + variance.
  useEffect2(function runProgress() {
    if (state !== "running") return undefined;
    const totalMs = PROC_RUN_MIN_MS + (index % 5) * (PROC_RUN_VAR_MS / 5);
    const startedAt = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - startedAt) / totalMs);
      setProgress(t);
      if (t < 1) {
        timersRef.current.prog = window.requestAnimationFrame(tick);
      } else {
        timersRef.current.prog = 0;
        timersRef.current.done = window.setTimeout(function flipDone() {
          setState("done");
        }, 120);
      }
    }
    timersRef.current.prog = window.requestAnimationFrame(tick);
    return function cleanup() {
      if (timersRef.current.prog) {
        window.cancelAnimationFrame(timersRef.current.prog);
        timersRef.current.prog = 0;
      }
      if (timersRef.current.done) {
        window.clearTimeout(timersRef.current.done);
        timersRef.current.done = 0;
      }
    };
  }, [state, index]);

  // IntersectionObserver — flip queued → running when the row is in view.
  useEffect2(function watchViewport() {
    if (!stageRef.current) return undefined;
    const io = new IntersectionObserver(function onSeen(entries) {
      entries.forEach(function check(e) {
        if (e.isIntersecting && e.intersectionRatio > PROC_VIEWPORT_TRIGGER_RATIO) {
          setState(function (prev) { return prev === "queued" ? "running" : prev; });
          io.unobserve(e.target);
        }
      });
    }, { threshold: [PROC_VIEWPORT_TRIGGER_RATIO, 0.55, 0.7] });
    io.observe(stageRef.current);
    return function () { io.disconnect(); };
  }, []);

  // Scroll-based fallback for environments where IO is unreliable.
  useEffect2(function scrollFallback() {
    if (state !== "queued") return undefined;
    let raf = 0;
    function check() {
      raf = 0;
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top < vh * 0.7 && r.bottom > vh * 0.15) {
        setState("running");
      }
    }
    function onScroll() { if (!raf) raf = window.requestAnimationFrame(check); }
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return function () {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [state]);

  return (
    <li
      ref={combinedRef}
      className={`proc-stage proc-stage--${state}`}
      data-reveal-delay={(index * 0.03).toFixed(2)}
    >
      <span className="proc-stage-gutter mono">{String(index + 1).padStart(2, "0")}</span>
      <div className="proc-stage-main">
        <div className="proc-stage-cmd mono">
          {state === "queued" ? (
            <span className="proc-stage-cmd-ghost">{step.cmd}</span>
          ) : (
            <>
              <span>{typed}</span>
              {state === "running" && <span className="proc-stage-caret" />}
            </>
          )}
        </div>
        <div className="proc-stage-meta">
          <span className="proc-stage-k">{step.k}</span>
          <span className="proc-stage-arrow">→</span>
          <span className="proc-stage-v">{step.v}</span>
        </div>
        {state === "running" && (
          <div className="proc-stage-progress" aria-hidden="true">
            <div className="proc-stage-progress-fill" style={{ transform: `scaleX(${progress.toFixed(3)})` }} />
          </div>
        )}
        {state === "done" && (
          <div className="proc-stage-output mono">
            <span className="proc-stage-output-prompt">›</span>
            <span>{step.output}</span>
          </div>
        )}
      </div>
      <span className="proc-stage-status mono">
        {state === "queued" && <span className="proc-stage-pill proc-stage-pill--queued">queued</span>}
        {state === "running" && (
          <span className="proc-stage-pill proc-stage-pill--running">
            <span className="proc-stage-spin" aria-hidden="true" />running
          </span>
        )}
        {state === "done" && (
          <span className="proc-stage-pill proc-stage-pill--done">
            <span className="proc-stage-check" aria-hidden="true">✓</span>{step.ms}
          </span>
        )}
      </span>
    </li>
  );
}

function Process({ t }) {
  const ref = useRevealRoot([t]);

  const steps = useMemoFromComponents1(function buildSteps() {
    return t.process.steps.map(function buildStep(s, i) {
      const slug = String(s.k || "step").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const ms = 120 + ((i * 41) % 230);
      return {
        k: s.k,
        v: s.v,
        cmd: `$ ./pipeline run --stage ${slug}`,
        ms: `${String(ms).padStart(3, "0")}ms`,
        output: PROC_OUTPUT_SAMPLES[i % PROC_OUTPUT_SAMPLES.length],
      };
    });
  }, [t]);

  return (
    <section data-section="process" id="process" ref={ref}>
      <div className="shell">
        <SecHead num="07" eyebrow={t.process.eyebrow} title={t.process.title} meta="pipeline.run()" />
        <p className="lead-line" data-reveal>{t.process.lead}</p>

        <div className="proc-terminal card" data-reveal>
          <div className="proc-terminal-head">
            <div className="proc-terminal-dots"><i /><i /><i /></div>
            <span className="mono proc-terminal-title">/usr/local/bin/ship — pipeline.v26</span>
            <span className="mono proc-terminal-meta">{steps.length} stages</span>
          </div>
          <ol className="proc-terminal-body">
            {steps.map(function renderStage(s, i) {
              return <ProcStage key={i} step={s} index={i} />;
            })}
          </ol>
          <div className="proc-terminal-foot mono">
            <span className="proc-terminal-prompt">›</span>
            <span>READY · listening on :443</span>
            <span className="proc-terminal-cursor">▌</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST — testimonials
// ─────────────────────────────────────────────────────────────────────────────
function Trust({ t }) {
  const ref = useRevealRoot([t]);
  return (
    <section data-section="trust" id="trust" ref={ref}>
      <div className="shell">
        <SecHead num="08" eyebrow={t.trust.eyebrow} title={t.trust.title} meta="placeholders" />
        <p className="lead-line" data-reveal>{t.trust.lead}</p>
        <div className="trust-grid">
          {t.trust.items.map((it, i) => (
            <figure key={i} className="trust-card" data-reveal data-reveal-delay={(i * 0.08).toFixed(2)}>
              <div className="trust-quote-mark" aria-hidden="true">“</div>
              <blockquote className="trust-q">{it.q}</blockquote>
              <figcaption className="trust-cap">
                <div className="trust-avatar" aria-hidden="true">
                  <span>{it.who.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
                </div>
                <div>
                  <div className="trust-who">{it.who}</div>
                  <div className="trust-role mono">{it.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────────────────────────────────────
function Contact({ t, links }) {
  const ref = useRevealRoot([t]);
  const [sent, setSent] = useState2(false);
  // Multi-select chips for project scope — a single dropdown was hiding the
  // breadth of services. Chips let the visitor click as many as apply, which
  // also reveals the available service categories at a glance.
  const [scopeSet, setScopeSet] = useState2(() => new Set());
  // Budget slider — 5 fixed buckets so we don't ask for awkward exact numbers.
  const BUDGET_BUCKETS = ["< $2k", "$2-5k", "$5-10k", "$10-20k", "$20k+"];
  const [budgetIdx, setBudgetIdx] = useState2(1);
  // Timeline preference — small chip row for urgency, helps scoping.
  const TIMELINE_LABEL = t.contact.form.timeline || "Сроки";
  const TIMELINE_OPTS = t.contact.timeline_opts || ["ASAP", "1–2 недели", "1–2 месяца", "гибко"];
  const [timelineIdx, setTimelineIdx] = useState2(3);
  const BUDGET_LABEL = t.contact.form.budget || "Бюджет";

  function toggleScope(v) {
    setScopeSet(function (prev) {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    setSent(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(14); } catch (err) { /* opportunistic */ }
    }
    window.setTimeout(() => setSent(false), 4500);
  }
  return (
    <section data-section="contact" id="contact" ref={ref}>
      <div className="shell">
        <SecHead num="09" eyebrow={t.contact.eyebrow} title={t.contact.title} em={t.contact.title.split(" ").pop()} meta="status: receiving" />
        <p className="lead-line" data-reveal>{t.contact.lead}</p>

        <div className="contact-layout">
          <form className="contact-form card" onSubmit={onSubmit} data-reveal>
            <div className="contact-form-row">
              <label className="ff">
                <span className="ff-k mono">{t.contact.form.name}</span>
                <input type="text" required className="ff-input" autoComplete="name" />
              </label>
              <label className="ff">
                <span className="ff-k mono">{t.contact.form.email}</span>
                <input type="text" required className="ff-input" autoComplete="email" />
              </label>
            </div>

            {/* Scope chips — multi-select; click to toggle. */}
            <div className="ff">
              <span className="ff-k mono">{t.contact.form.scope}</span>
              <div className="ff-chips" role="group" aria-label={t.contact.form.scope}>
                {t.contact.scope_opts.map(function renderChip(o, i) {
                  const active = scopeSet.has(o);
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`ff-chip ${active ? "is-active" : ""}`}
                      aria-pressed={active}
                      onClick={() => toggleScope(o)}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Budget bucket slider — 5 discrete steps with track tick marks
                so you can SEE which bucket you're snapping to. */}
            <div className="ff">
              <span className="ff-k mono">
                {BUDGET_LABEL}
                <span className="ff-k-val">{BUDGET_BUCKETS[budgetIdx]}</span>
              </span>
              <div className="ff-range-wrap">
                <input
                  type="range"
                  className="ff-range"
                  min="0"
                  max={BUDGET_BUCKETS.length - 1}
                  step="1"
                  value={budgetIdx}
                  onChange={(e) => setBudgetIdx(parseInt(e.target.value, 10))}
                  style={{ "--val-pct": `${(budgetIdx / (BUDGET_BUCKETS.length - 1)) * 100}%` }}
                />
                <div className="ff-range-track-marks" aria-hidden="true">
                  {BUDGET_BUCKETS.map(function renderMark(_b, i) {
                    const cls = i < budgetIdx ? "is-passed" : (i === budgetIdx ? "is-current" : "");
                    return <span key={i} className={`ff-range-track-mark ${cls}`} />;
                  })}
                </div>
                <div className="ff-range-ticks mono" aria-hidden="true">
                  {BUDGET_BUCKETS.map(function renderTick(b, i) {
                    return (
                      <span key={i} className={`ff-range-tick ${i === budgetIdx ? "is-active" : ""}`}>
                        {b}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Timeline urgency chips. */}
            <div className="ff">
              <span className="ff-k mono">{TIMELINE_LABEL}</span>
              <div className="ff-chips" role="radiogroup" aria-label={TIMELINE_LABEL}>
                {TIMELINE_OPTS.map(function renderTimeline(o, i) {
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={i === timelineIdx}
                      className={`ff-chip ${i === timelineIdx ? "is-active" : ""}`}
                      onClick={() => setTimelineIdx(i)}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="ff">
              <span className="ff-k mono">{t.contact.form.msg}</span>
              <textarea required rows="4" className="ff-input ff-textarea" placeholder={t.contact.form.msg_placeholder || ""} />
            </label>
            <button type="submit" className={`btn btn-primary contact-submit ${sent ? "is-sent" : ""}`} disabled={sent}>
              <span>{sent ? t.contact.form.sent : t.contact.form.submit}</span>
              <span className="arrow">{sent ? "✓" : "→"}</span>
            </button>
          </form>

          <aside className="contact-side" data-reveal>
            <div className="contact-deploy">
              <div className="mono contact-deploy-head">
                <span className="chip"><span className="chip-dot" />ready</span>
                <span>deploy.endpoint</span>
              </div>
              <div className="contact-deploy-body">
                {t.contact.links.map((l, i) => (
                  <a
                    key={i}
                    href={l.k === "Email" ? `mailto:${l.v}` : `https://${l.v}`}
                    target={l.k === "Email" ? undefined : "_blank"}
                    rel={l.k === "Email" ? undefined : "noopener noreferrer"}
                    className="contact-link"
                  >
                    <span className="mono contact-link-k">{l.k}</span>
                    <span className="contact-link-v">{l.v}</span>
                    <span className="arrow">↗</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="contact-signal">
              <div className="signal-pulse"><i></i><i></i><i></i></div>
              <div className="signal-meta mono">
                <div>UTC+5 · Tashkent</div>
                <div>response &lt; 24h</div>
                <div>EN · RU · UZ</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function Footer({ t, links }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-l">
          <div className="brand"><span className="brand-mark" /><span>SAMANDAR · EXEC.AI.LAB</span></div>
          <div className="mono footer-copy">{t.footer.copy}</div>
        </div>
        <div className="footer-r mono">
          <div>{t.footer.built}</div>
          <div className="footer-links">
            <a href={`https://${links.github}`} target="_blank" rel="noopener noreferrer">github</a>
            <span>·</span>
            <a href={`https://${links.telegram}`} target="_blank" rel="noopener noreferrer">telegram</a>
            <span>·</span>
            <a href={`mailto:${links.email}`}>email</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Services, CV, Process, Trust, Contact, Footer });
