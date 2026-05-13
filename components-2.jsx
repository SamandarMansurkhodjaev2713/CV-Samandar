// components-2.jsx — Services, CV, Process, Trust, Contact, Footer

const { useEffect: useEffect2, useRef: useRef2, useState: useState2, useMemo: useMemoFromComponents1 } = React;

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES — terminal command cards. Each card is a faux REPL showing how the
// service is "invoked" with a typewriter effect on hover and a status line that
// becomes a result on completion. Way more deliberate than a flat grid.
// ─────────────────────────────────────────────────────────────────────────────
function ServiceCard({ item, index }) {
  const cardRef = useRef2(null);
  const [phase, setPhase] = useState2("idle"); // idle | typing | done
  const [typed, setTyped] = useState2("");
  const cmdTokens = useMemoFromComponents1(function deriveCmd() {
    const slug = String(item.k || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `npx samandar ${slug || "service"} --mode prod`;
  }, [item.k]);

  // Run typewriter on hover (desktop) or after first scroll-into-view (mobile).
  useEffect2(function runTyper() {
    if (phase !== "typing") return undefined;
    let i = 0;
    const id = window.setInterval(function step() {
      i++;
      setTyped(cmdTokens.slice(0, i));
      if (i >= cmdTokens.length) {
        window.clearInterval(id);
        window.setTimeout(function flipDone() { setPhase("done"); }, 220);
      }
    }, 24);
    return function () { window.clearInterval(id); };
  }, [phase, cmdTokens]);

  // Auto-fire when scrolled into view (mobile fallback so cards don't sit idle).
  useEffect2(function autoStart() {
    if (!cardRef.current) return undefined;
    const el = cardRef.current;
    const io = new IntersectionObserver(function onSeen(entries) {
      entries.forEach(function check(e) {
        if (e.isIntersecting && e.intersectionRatio > 0.45) {
          setPhase(function (p) { return p === "idle" ? "typing" : p; });
          io.disconnect();
        }
      });
    }, { threshold: [0.45, 0.6] });
    io.observe(el);
    return function () { io.disconnect(); };
  }, []);

  function onMouseEnter() {
    setPhase(function (p) { return p === "idle" ? "typing" : p; });
  }

  function onMouseMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 4).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 4).toFixed(2)}deg`);
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
      className={`service-card card service-card--${phase}`}
      data-reveal
      data-reveal-delay={(index * 0.04).toFixed(2)}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="service-card-head">
        <span className="service-card-num mono">/{String(index + 1).padStart(2, "0")}</span>
        <span className="service-card-badge mono">{item.io}</span>
      </div>
      <h3 className="service-card-k">{item.k}</h3>
      <p className="service-card-v">{item.v}</p>

      <div className="service-card-cmd mono" aria-hidden="true">
        <span className="service-card-prompt">›</span>
        <span className="service-card-typed">{typed || cmdTokens.slice(0, 0)}</span>
        {phase === "typing" && <span className="service-card-caret" />}
        {phase === "done" && <span className="service-card-ok">ok</span>}
      </div>
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

  function onPrint() { window.print(); }

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
                  const isOpen = openIdx === i;
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
            <figure key={i} className="trust-card card" data-reveal>
              <div className="corner-tl" /><div className="corner-tr" />
              <div className="corner-bl" /><div className="corner-br" />
              <div className="trust-quote-mark mono">"</div>
              <blockquote className="trust-q">{it.q}</blockquote>
              <figcaption className="trust-cap">
                <div className="trust-avatar" aria-hidden="true">
                  <span className="mono">{it.who.split(" ").map(w => w[0]).join("").slice(0, 2)}</span>
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
            <label className="ff">
              <span className="ff-k mono">{t.contact.form.name}</span>
              <input type="text" required className="ff-input" autoComplete="name" />
            </label>
            <label className="ff">
              <span className="ff-k mono">{t.contact.form.email}</span>
              <input type="text" required className="ff-input" autoComplete="email" />
            </label>
            <label className="ff">
              <span className="ff-k mono">{t.contact.form.scope}</span>
              <select className="ff-input" defaultValue="">
                <option value="" disabled>—</option>
                {t.contact.scope_opts.map((o, i) => <option key={i} value={o}>{o}</option>)}
              </select>
            </label>
            <label className="ff">
              <span className="ff-k mono">{t.contact.form.msg}</span>
              <textarea required rows="4" className="ff-input ff-textarea" />
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
