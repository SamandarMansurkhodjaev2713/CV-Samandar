// components-2.jsx — Services, CV, Process, Trust, Contact, Footer

const { useEffect: useEffect2, useRef: useRef2, useState: useState2, useMemo: useMemoFromComponents1 } = React;

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES 2.0 — panel switcher.
//   Desktop: WAI-ARIA tablist (left) + tabpanel (right), roving tabindex,
//            ↑/↓/Home/End, content crossfade on selection.
//   Mobile (≤900px): the SAME data as an accordion (button + aria-expanded +
//            region), one open at a time.
// One component, one DOM — the layout mode (panel vs accordion) is a CSS
// concern; only the ARIA wiring differs, gated by a matchMedia flag so screen
// readers always get the pattern that matches what's on screen.
//
// `io` ("spec → prod app") is the signature detail — rendered as a real
// input→output flow, not a pill. Related project is a HARD index→project map
// (never fuzzy) so we never invent a connection: services without a real
// match (Internal Tools, Tech Consulting) simply omit the block.
// ─────────────────────────────────────────────────────────────────────────────

// Hard map: service index → projects[].name that genuinely delivers it.
// null = no honest 1:1 match → the related block is not rendered.
const SERVICE_RELATED = [
  "Business Automation Engine", // 0 Web Apps        → full product build
  "Railway Infrastructure Site",// 1 Landing & Sites → premium landing
  "Task Orchestrator Bot",      // 2 Telegram Bots   → team bot
  "Business Automation Engine", // 3 AI Automation   → LLM workflow pipeline
  "Biogas Operations Panel",    // 4 Dashboards      → ops dashboard
  "Group Voice Task Bot",       // 5 MVP / Prototype → "MVP in 11 days"
  null,                         // 6 Internal Tools  → no honest 1:1 case
  null,                         // 7 Tech Consulting → advisory, no shippable case
];

// Split "spec → prod app" into [input, output] on the arrow.
function splitIo(io) {
  const parts = String(io || "").split("→");
  if (parts.length < 2) return { in: "", out: String(io || "").trim() };
  return { in: parts[0].trim(), out: parts.slice(1).join("→").trim() };
}

// The io flow: INPUT ─token→ OUTPUT. Pure CSS motion; decorative (aria-hidden
// on the rail/token), the words themselves are real, readable text.
function ServiceIoFlow({ io }) {
  const io2 = splitIo(io);
  return (
    <div className="svc-io" aria-label={`${io2.in} to ${io2.out}`}>
      <span className="svc-io-node svc-io-in">{io2.in}</span>
      <span className="svc-io-rail" aria-hidden="true">
        <span className="svc-io-tok" />
      </span>
      <span className="svc-io-node svc-io-out">{io2.out}</span>
    </div>
  );
}

function Services({ t }) {
  const ref = useRevealRoot([t]);
  const items = (t.services && Array.isArray(t.services.items)) ? t.services.items : [];
  const projects = (t.projects && Array.isArray(t.projects.items)) ? t.projects.items : [];

  // Desktop: selected tab. Mobile: which accordion row is open (-1 = none).
  const [activeIdx, setActiveIdx] = useState2(0);
  const [openIdx, setOpenIdx] = useState2(0);
  const [isMobile, setIsMobile] = useState2(false);
  const tabRefs = useRef2([]);

  useEffect2(function watchLayout() {
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

  function relatedFor(index) {
    const name = SERVICE_RELATED[index];
    if (!name) return null;
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].name === name) return projects[i];
    }
    return null;
  }

  // Roving-tabindex keyboard nav for the desktop tablist.
  function onTabKey(e, i) {
    const last = items.length - 1;
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = i >= last ? 0 : i + 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = i <= 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    setActiveIdx(next);
    const el = tabRefs.current[next];
    if (el && el.focus) el.focus();
  }

  // Shared details renderer (desktop panel + mobile accordion body).
  function renderDetails(s, i) {
    const rel = relatedFor(i);
    return (
      <div className="svc-detail-inner">
        <p className="svc-detail-v">{s.v}</p>
        <ServiceIoFlow io={s.io} />
        {rel ? (
          <a
            className="svc-related"
            href="#projects"
            data-cursor="link"
            data-cursor-label="open case"
          >
            <span className="svc-related-eyebrow mono">
              {t.services.related_label || "related case"}
            </span>
            <span className="svc-related-name">{rel.name}</span>
            <span className="svc-related-meta mono">
              <span className="svc-related-tag">{rel.tag}</span>
              {rel.outcome ? <span className="svc-related-out">{rel.outcome}</span> : null}
            </span>
            <span className="svc-related-arrow" aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <section data-section="services" id="services" data-enter="slide-left" ref={ref}>
      <div className="shell">
        <SecHead num="05" eyebrow={t.services.eyebrow} title={t.services.title} meta={`${items.length} services`} />

        <div className={`svc ${isMobile ? "is-acc" : "is-panel"}`} data-reveal>
          {/* ── LEFT: tablist (desktop) ─────────────────────────────── */}
          <div
            className="svc-list"
            role={isMobile ? undefined : "tablist"}
            aria-label={isMobile ? undefined : t.services.title}
            aria-orientation={isMobile ? undefined : "vertical"}
          >
            {items.map(function renderRow(s, i) {
              const isActive = activeIdx === i;
              const isOpen = openIdx === i;

              if (isMobile) {
                return (
                  <div key={i} className={`svc-acc-row ${isOpen ? "is-open" : ""}`}>
                    <h3 className="svc-acc-h">
                      <button
                        type="button"
                        className="svc-acc-head"
                        data-code={String(i + 1).padStart(2, "0")}
                        style={{ "--row-i": i, "--row-total": Math.max(1, items.length - 1) }}
                        aria-expanded={isOpen}
                        aria-controls={`svc-acc-body-${i}`}
                        id={`svc-acc-head-${i}`}
                        onClick={() => setOpenIdx(isOpen ? -1 : i)}
                      >
                        <span className="row-ghost" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                        <span className="svc-num mono">/{String(i + 1).padStart(2, "0")}</span>
                        <span className="svc-k">{s.k}</span>
                        <span className="svc-acc-chev" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                      </button>
                    </h3>
                    <div
                      className="svc-acc-body"
                      id={`svc-acc-body-${i}`}
                      role="region"
                      aria-labelledby={`svc-acc-head-${i}`}
                      hidden={!isOpen}
                    >
                      {renderDetails(s, i)}
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  id={`svc-tab-${i}`}
                  aria-selected={isActive}
                  aria-controls={`svc-panel-${i}`}
                  tabIndex={isActive ? 0 : -1}
                  ref={(el) => { tabRefs.current[i] = el; }}
                  className={`svc-tab ${isActive ? "is-active" : ""}`}
                  data-code={String(i + 1).padStart(2, "0")}
                  style={{ "--row-i": i, "--row-total": Math.max(1, items.length - 1) }}
                  onClick={() => setActiveIdx(i)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  data-cursor="read"
                >
                  <span className="row-ghost" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span className="svc-num mono">/{String(i + 1).padStart(2, "0")}</span>
                  <span className="svc-k">{s.k}</span>
                  <span className="svc-tab-io mono" aria-hidden="true">{s.io}</span>
                  <span className="svc-tab-mark" aria-hidden="true" />
                </button>
              );
            })}
          </div>

          {/* ── RIGHT: single tabpanel (desktop only) ───────────────── */}
          {!isMobile ? (
            <div className="svc-panel-wrap">
              {items.map(function renderPanel(s, i) {
                if (i !== activeIdx) return null;
                return (
                  <div
                    key={i}
                    className="svc-panel"
                    role="tabpanel"
                    id={`svc-panel-${i}`}
                    aria-labelledby={`svc-tab-${i}`}
                    tabIndex={0}
                  >
                    <div className="svc-panel-head">
                      <span className="svc-panel-num mono">/{String(i + 1).padStart(2, "0")}</span>
                      <h3 className="svc-panel-k">{s.k}</h3>
                    </div>
                    {renderDetails(s, i)}
                  </div>
                );
              })}
            </div>
          ) : null}
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
    <section data-section="cv" id="cv" data-enter="curtain" ref={ref}>
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
              {/* Whole-element reveal (NOT data-reveal-words): word-splitting
                  fragments the PDF/ATS text layer into per-word spans, hurting
                  copy-paste and resume parsing. */}
              <h3 className="cv-id-name" data-reveal>{t.cv.id?.name || "Samandar"}</h3>
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
      data-reveal-delay={(index * 0.06).toFixed(2)}
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
  const cliRef = useRef2(null);
  const cliCtrlRef = useRef2(null);
  const pgRef = useRef2(null);
  const pgCtrlRef = useRef2(null);

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

  // Mount the looping Claude Code session terminal. Re-creates on language
  // change so sessions render in the current locale. Pauses itself when
  // off-screen via IntersectionObserver inside the module.
  useEffect2(function mountCli() {
    if (!cliRef.current || !window.CliCinema) return undefined;
    // Defensive: cli_sessions may be missing if content.js was partially
    // updated. Module falls back to bundled English defaults in that case.
    const sessions = (t.process && Array.isArray(t.process.cli_sessions)) ? t.process.cli_sessions : null;
    cliCtrlRef.current = window.CliCinema.create(cliRef.current, sessions ? { sessions: sessions } : {});
    return function () {
      if (cliCtrlRef.current && cliCtrlRef.current.dispose) cliCtrlRef.current.dispose();
      cliCtrlRef.current = null;
    };
  }, [t]);

  // v61: Stack Radar — the constellation now carries SIGNAL, not noise. Nodes
  // are the real stack technologies grouped by the six real domains; clicking a
  // node surfaces the actual projects that use it (matched against each
  // project's declared stack — no invented links). Data flows in from content.
  useEffect2(function mountConstellation() {
    if (!pgRef.current || !window.CursorConstellation) return undefined;
    const langGuess = (typeof t === "object" && t && t.lang) ? t.lang : "ru";
    pgCtrlRef.current = window.CursorConstellation.create(pgRef.current, {
      lang: langGuess,
      groups: (t.skills && Array.isArray(t.skills.groups)) ? t.skills.groups : null,
      projects: (t.projects && Array.isArray(t.projects.items)) ? t.projects.items : null,
    });
    return function () {
      if (pgCtrlRef.current && pgCtrlRef.current.dispose) pgCtrlRef.current.dispose();
      pgCtrlRef.current = null;
    };
  }, [t]);

  // Localized labels (with fallbacks if cli_* keys are absent in older content).
  const cliEyebrow = (t.process && t.process.cli_eyebrow) || "live";
  const cliTitle = (t.process && t.process.cli_title) || "Claude Code";
  const cliLead = (t.process && t.process.cli_lead) || "";

  return (
    <section data-section="process" id="process" data-enter="line-stagger" ref={ref}>
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

        {/* Claude Code session cinema — auto-looping animated terminal. */}
        <div className="proc-cli-block" data-reveal data-reveal-delay="0.05">
          <header className="proc-cli-block-head">
            <span className="proc-cli-block-eyebrow mono">{cliEyebrow}</span>
            <h3 className="proc-cli-block-title">{cliTitle}</h3>
            {cliLead ? <p className="proc-cli-block-lead">{cliLead}</p> : null}
          </header>
          <div className="proc-cli-card card">
            <div ref={cliRef} />
          </div>
        </div>
      </div>

      {/* v52 — Cursor Constellation lives in its OWN section after Process so
          it's visually detached (full-bleed, dark backdrop). Non-commercial,
          purely playful — visitor's cursor leaves a trail of glowing particles
          that gravitate + connect. */}
      <div className="constellation-section">
        <div className="shell">
          <div className="constellation-frame card" data-reveal>
            <div ref={pgRef} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUST — testimonials
// ─────────────────────────────────────────────────────────────────────────────
// Honesty rule: every number in this section must be traceable to the actual
// dataset below, or explicitly labeled as illustrative. No star ratings, no
// "verified" badges, no on-time percentages — none of that is measured yet.
// When real client quotes replace the placeholders, this same strip keeps
// working (totalQuotes/uniqueRoles recompute) and the "illustrative" note
// can be deleted in one place (t.trust.note).

function Trust({ t }) {
  const ref = useRevealRoot([t]);
  const items = (t.trust && Array.isArray(t.trust.items)) ? t.trust.items : [];
  // Aggregate metrics — derived (not hand-set) so they stay honest.
  const totalQuotes = items.length;
  const uniqueRoles = (function countUniqueRoles() {
    const seen = new Set();
    for (let i = 0; i < items.length; i++) {
      const r = (items[i].role || "").split(/[·•]/)[0].trim();
      if (r) seen.add(r);
    }
    return seen.size;
  })();
  const years = (function spanYears() {
    const seen = new Set();
    for (let i = 0; i < items.length; i++) {
      const m = (items[i].role || "").match(/(20\d\d)/);
      if (m) seen.add(m[1]);
    }
    return Array.from(seen).sort();
  })();
  const yearLabel = years.length >= 2 ? `${years[0]}–${years[years.length - 1]}` : (years[0] || "");

  return (
    <section data-section="trust" id="trust" data-enter="slide-right" ref={ref}>
      <div className="shell">
        <SecHead num="08" eyebrow={t.trust.eyebrow} title={t.trust.title} meta={`${totalQuotes} · signed`} />
        <p className="lead-line" data-reveal>{t.trust.lead}</p>

        {/* Aggregate trust strip — ONLY genuinely-derived counts. No stars,
            no fabricated percentages. If t.trust.note is set (placeholder
            phase), it renders as a plainly-labeled illustrative flag rather
            than being hidden — visible honesty reads as more credible than
            silence, and it doubles as an editorial/attention-grabbing beat. */}
        <div className="trust-strip" data-reveal>
          <div className="trust-strip-cell">
            <span className="trust-strip-val">{totalQuotes}</span>
            <span className="trust-strip-k mono">{t.trust.kQuotes || "quotes"}</span>
          </div>
          <div className="trust-strip-cell">
            <span className="trust-strip-val">{uniqueRoles}</span>
            <span className="trust-strip-k mono">{t.trust.kRoles || "roles"}</span>
          </div>
          {yearLabel ? (
            <div className="trust-strip-cell">
              <span className="trust-strip-val">{yearLabel}</span>
              <span className="trust-strip-k mono">{t.trust.kSpan || "span"}</span>
            </div>
          ) : null}
          {t.trust.note ? (
            <div className="trust-strip-cell trust-strip-note">
              <span className="trust-strip-flag mono">{t.trust.note}</span>
            </div>
          ) : null}
        </div>

        <div className="trust-grid">
          {items.map(function renderTrust(it, i) {
            return (
              <figure key={i} className="trust-card" data-reveal data-reveal-from="translateY(20px) scale(.98)" data-reveal-delay={(i * 0.08).toFixed(2)}>
                <div className="trust-quote-mark" aria-hidden="true">"</div>
                <blockquote className="trust-q">{it.q}</blockquote>
                <figcaption className="trust-cap">
                  <div className="trust-avatar" aria-hidden="true">
                    <span>{it.who.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2)}</span>
                  </div>
                  <div className="trust-cap-text">
                    <div className="trust-who">{it.who}</div>
                    <div className="trust-role mono">{it.role}</div>
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────────────────────────────────────
// Contact form delivery endpoint. Create a free form at https://formspree.io
// and replace YOUR_FORM_ID with the real id (e.g. "xeozabcd"). Until then the
// form runs in "demo" mode — it shows an optimistic success WITHOUT actually
// sending, so the UI is never broken while the endpoint is unconfigured.
const CONTACT_FORM_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";
const FORM_ENDPOINT_CONFIGURED = CONTACT_FORM_ENDPOINT.indexOf("YOUR_FORM_ID") === -1;
const CONTACT_FETCH_TIMEOUT_MS = 12000;

function Contact({ t, links }) {
  const ref = useRevealRoot([t]);
  const [sent, setSent] = useState2(false);
  const [sending, setSending] = useState2(false);
  const [errorMsg, setErrorMsg] = useState2("");
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

  // v51: full form reset on submit so the visitor sees a clean slate after
  // the "sent" confirmation expires. We reset the native form (clears
  // <input> / <textarea>) AND all our React state (chip selections, slider,
  // timeline). Previous behaviour kept the text fields populated, which
  // looked broken — the success message overlay didn't visually consume
  // the form below it.
  const SENT_HIDE_DELAY_MS = 4500;
  const FORM_ERROR_FALLBACK = (t.contact.form && t.contact.form.error) ||
    "Не удалось отправить — напишите в Telegram.";

  // Mark sent + wipe the form (native fields + React-controlled chips/slider).
  function finishSent(formEl) {
    setSent(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(14); } catch (err) { /* opportunistic */ }
    }
    try { formEl.reset(); }
    catch (err) { console.warn("[Contact] form.reset failed:", err && err.message); }
    setScopeSet(new Set());
    setBudgetIdx(1);
    setTimelineIdx(3);
    window.setTimeout(function hideSentBanner() { setSent(false); }, SENT_HIDE_DELAY_MS);
  }

  function onSubmit(e) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setErrorMsg("");

    // Collect native fields (name/email/message via their `name=` attrs) plus
    // the React-controlled selections that aren't native inputs.
    const fd = new FormData(formEl);
    fd.append("scope", Array.from(scopeSet).join(", "));
    fd.append("budget", BUDGET_BUCKETS[budgetIdx]);
    fd.append("timeline", TIMELINE_OPTS[timelineIdx]);

    // Demo mode (endpoint not configured) — optimistic success, no network.
    if (!FORM_ENDPOINT_CONFIGURED) {
      finishSent(formEl);
      return;
    }

    // Real delivery via Formspree — with a hard timeout so a hung network
    // can't leave the button stuck in "sending" forever (R-02).
    setSending(true);
    const controller = ("AbortController" in window) ? new AbortController() : null;
    const timeoutId = window.setTimeout(function () { if (controller) controller.abort(); }, CONTACT_FETCH_TIMEOUT_MS);
    const opts = { method: "POST", body: fd, headers: { "Accept": "application/json" } };
    if (controller) opts.signal = controller.signal;

    fetch(CONTACT_FORM_ENDPOINT, opts)
      .then(function (res) {
        window.clearTimeout(timeoutId);
        setSending(false);
        if (res.ok) { finishSent(formEl); return undefined; }
        return res.json().catch(function () { return null; }).then(function (data) {
          setErrorMsg((data && data.error) || FORM_ERROR_FALLBACK);
        });
      })
      .catch(function (err) {
        window.clearTimeout(timeoutId);
        setSending(false);
        console.warn("[Contact] submit failed:", err && err.message);
        setErrorMsg(FORM_ERROR_FALLBACK);
      });
  }
  return (
    <section data-section="contact" id="contact" data-enter="rise-bright" ref={ref}>
      <div className="shell">
        <SecHead num="09" eyebrow={t.contact.eyebrow} title={t.contact.title} em={t.contact.title.split(" ").pop()} meta="status: receiving" />
        <p className="lead-line" data-reveal>{t.contact.lead}</p>

        <div className="contact-layout">
          <form className="contact-form card" onSubmit={onSubmit} data-reveal>
            <div className="contact-form-row">
              <label className="ff">
                <span className="ff-k mono">{t.contact.form.name}</span>
                <input type="text" name="name" required className="ff-input" autoComplete="name" />
              </label>
              <label className="ff">
                <span className="ff-k mono">{t.contact.form.email}</span>
                <input type="text" name="email" required className="ff-input" autoComplete="email" />
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
              <textarea name="message" required rows="4" className="ff-input ff-textarea" placeholder={t.contact.form.msg_placeholder || ""} />
            </label>
            {errorMsg ? (
              <div className="contact-form-error mono" role="alert">{errorMsg}</div>
            ) : null}
            <button type="submit" className={`btn btn-primary contact-submit ${sent ? "is-sent" : ""}`} disabled={sent || sending}>
              <span>{sending ? (t.contact.form.sending || "Отправка…") : sent ? t.contact.form.sent : t.contact.form.submit}</span>
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
