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

// Hard map: service index → projects[].name that genuinely delivers it. MUST
// match a real projects[].name EXACTLY or the related block silently never
// renders — which is what happened: the previous names (Business Automation
// Engine, Railway Infrastructure Site, …) were from an older projects set and
// matched nothing, so EVERY service panel showed only description+io and the
// reserved min-height became a big empty box under the new solid panel bg.
const SERVICE_RELATED = [
  "TTYL Platform",                    // 0 Web Apps        → full product/platform build
  "3D Landing",                       // 1 Landing & Sites → premium Three.js landing
  "Task-manager / Task Manage Bot",   // 2 Telegram Bots   → team/task bot
  "Klawis — Legal AI Assistant",      // 3 AI Automation   → live AI product (RAG)
  "Sentinel Edge",                    // 4 Dashboards      → realtime ops dashboard
  "CoupleOS / Softly",                // 5 MVP / Prototype → live product MVP
  "BelfProctor",                      // 6 Internal Tools  → internal monitoring system
  null,                               // 7 Tech Consulting → advisory, no single shippable case
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
        {/* Advisory services have no shippable 1:1 case — instead of a related
            project card they list what the engagement covers (honest, and it
            gives the panel real content instead of empty reserved space). */}
        {Array.isArray(s.covers) && s.covers.length ? (
          <ul className="svc-covers">
            {s.covers.map(function renderCover(c, ci) {
              return (
                <li key={ci} className="svc-cover">
                  <span className="svc-cover-mark" aria-hidden="true">→</span>
                  <span>{c}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
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
// readme.md view — real GitHub-profile info (bio, breadth, availability, live
// proof), rendered as a rendered-markdown-style doc. Additive to the CV: it
// carries the "who + how I think + what I build across domains" that the
// timeline (roles/dates) doesn't.
function CvReadme({ r }) {
  if (!r || !r.intro) return null;
  const build = Array.isArray(r.build) ? r.build : [];
  const proof = Array.isArray(r.proof) ? r.proof : [];
  return (
    <div className="cv-readme" data-reveal>
      <p className="cv-readme-p">{r.intro}</p>
      {r.intro2 ? <p className="cv-readme-p">{r.intro2}</p> : null}

      {build.length ? (
        <>
          <h4 className="cv-block-h mono">{r.build_title}</h4>
          <ul className="cv-readme-list">
            {build.map((b, i) => (
              <li key={i}><span className="cv-bullet-mark" aria-hidden="true">›</span>{b}</li>
            ))}
          </ul>
        </>
      ) : null}

      {proof.length ? (
        <>
          <h4 className="cv-block-h mono">{r.proof_title}</h4>
          <div className="cv-readme-proof">
            {proof.map((p, i) => (
              <a key={i} className="cv-readme-proof-row" href={p.url || "#"} target="_blank" rel="noopener noreferrer" data-cursor="link" data-cursor-label={`open: ${p.k}`}>
                <span className="mono cv-readme-proof-k">{p.k}</span>
                <span className="cv-readme-proof-v">{p.v}</span>
                <span className="arrow">↗</span>
              </a>
            ))}
          </div>
        </>
      ) : null}

      {r.avail ? (
        <>
          <h4 className="cv-block-h mono">{r.avail_title}</h4>
          <p className="cv-readme-p">{r.avail}</p>
        </>
      ) : null}
    </div>
  );
}

function CV({ t, links }) {
  const ref = useRevealRoot([t]);
  const [openIdx, setOpenIdx] = useState2(0);
  // Which document view is showing: the résumé ("cv") or the GitHub readme.
  const [docTab, setDocTab] = useState2("cv");
  const hasReadme = !!(t.cv && t.cv.readme && t.cv.readme.intro);
  const showReadme = hasReadme && docTab === "readme";
  // Roles are an accordion: only one open at a time normally. For print we
  // force ALL open so the printed PDF shows the full timeline, then restore
  // the user's previous state after the print dialog closes.
  const restoreOpenIdx = useRef2(0);

  function onPrint() {
    restoreOpenIdx.current = openIdx;
    setDocTab("cv"); // the printed PDF is the résumé, never the readme view
    setOpenIdx(-2); // sentinel: "all open" (any non-numeric index that isn't matched)
    // Use a microtask + rAF so React commits the open-state change before
    // the synchronous window.print() blocks the main thread.
    Promise.resolve().then(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          // Force every strength disclosure open so its proof line prints too
          // (native <details> hide their content when closed). Tagged so the
          // afterprint handler can restore only the ones we opened.
          document.querySelectorAll(".cv-strength:not([open])").forEach(function (d) {
            d.open = true;
            d.setAttribute("data-print-forced", "1");
          });
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
      document.querySelectorAll(".cv-strength[data-print-forced]").forEach(function (d) {
        d.open = false;
        d.removeAttribute("data-print-forced");
      });
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
            {/* Segmented toggle — clicking switches the document view. The
                pill-with-highlighted-segment shape reads as switchable on
                sight; hover + cursor reinforce it. */}
            <div className="cv-doc-tabs mono" role="tablist" aria-label="document view">
              <button
                type="button"
                role="tab"
                aria-selected={!showReadme}
                className={`cv-doc-tab ${!showReadme ? "is-active" : ""}`}
                onClick={() => setDocTab("cv")}
                data-cursor="link"
              >
                samandar.cv
              </button>
              {hasReadme ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={showReadme}
                  className={`cv-doc-tab ${showReadme ? "is-active" : ""}`}
                  onClick={() => setDocTab("readme")}
                  data-cursor="link"
                >
                  readme.md
                </button>
              ) : null}
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

          {/* Body: the two-column résumé (samandar.cv) OR the readme.md view */}
          {showReadme ? (
            <CvReadme r={t.cv.readme} />
          ) : (
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
                    {t.cv.strengths.map((s, i) => {
                      // Back-compat: a strength may be a plain string (no proof)
                      // or {t, p}. With a proof it becomes a real disclosure —
                      // native <details> so the › chevron's affordance is honest
                      // (the earlier bug: it *looked* expandable but wasn't).
                      const title = typeof s === "string" ? s : s.t;
                      const proof = typeof s === "string" ? null : s.p;
                      return (
                        <li key={i}>
                          {proof ? (
                            <details className="cv-strength">
                              <summary className="cv-strength-head" data-cursor="read" data-cursor-label="proof">
                                <span className="cv-bullet-mark" aria-hidden="true">›</span>
                                <span className="cv-strength-t">{title}</span>
                              </summary>
                              <p className="cv-strength-proof">{proof}</p>
                            </details>
                          ) : (
                            <span className="cv-strength-static"><span className="cv-bullet-mark" aria-hidden="true">›</span>{title}</span>
                          )}
                        </li>
                      );
                    })}
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
          )}

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
// PROCESS — the delivery pipeline as a static terminal. Nine stages, each a
// confident line: command → phase → the artifact it yields. No fake CI
// run-lifecycle (queued/running/done, invented times, random output) anymore.
// ─────────────────────────────────────────────────────────────────────────────
function ProcStage({ step, index }) {
  // Static, honest pipeline stage. The old version simulated a live CI run
  // (queued → running → done with an invented completion time + a random CI
  // output line) that read as fake — and, worse, got stuck on "queued" wherever
  // the scroll animation didn't fire, i.e. "nothing ran". Now each stage is a
  // confident, stable line: the command, the phase → what it covers, and the
  // concrete artifact it yields. Terminal look kept; the fakery is gone.
  return (
    <li
      className="proc-stage proc-stage--ready"
      data-reveal-delay={(index * 0.06).toFixed(2)}
    >
      <span className="proc-stage-gutter mono">{String(index + 1).padStart(2, "0")}</span>
      <div className="proc-stage-main">
        <div className="proc-stage-cmd mono">{step.cmd}</div>
        <div className="proc-stage-meta">
          <span className="proc-stage-k">{step.k}</span>
          <span className="proc-stage-arrow">→</span>
          <span className="proc-stage-v">{step.v}</span>
        </div>
        {step.out ? (
          <div className="proc-stage-output mono">
            <span className="proc-stage-output-prompt">›</span>
            <span>{step.out}</span>
          </div>
        ) : null}
      </div>
      <span className="proc-stage-status mono" aria-hidden="true">
        <span className="proc-stage-pill proc-stage-pill--ready">ready</span>
      </span>
    </li>
  );
}

function Process({ t }) {
  const ref = useRevealRoot([t]);

  const steps = useMemoFromComponents1(function buildSteps() {
    return t.process.steps.map(function buildStep(s) {
      const slug = String(s.k || "step").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return {
        k: s.k,
        v: s.v,
        out: s.out,
        cmd: `$ ./pipeline run --stage ${slug}`,
      };
    });
  }, [t]);

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
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT BUILDER — "Живой конструктор проекта"
// The site's signature interactive + lead magnet. The visitor picks a project
// TYPE and SCALE; a warm architecture blueprint assembles live (a layered
// "system cake": client → logic → intelligence → data → infrastructure) while
// a readout crystallizes (stack · timeline · budget). CTAs: a Telegram
// deep-link and a handoff that pre-fills the Contact form via a window
// CustomEvent ("sm:builder-config").
//
// Why a layer stack, not measured SVG connectors: every layer is a fixed slot
// toggled by `is-active` (grid-rows 0fr→1fr collapse — the same trick the FAQ
// and Signal accordions use), so there is ZERO DOM-coordinate math, it
// animates smoothly, and it can never misalign on resize or font swap.
// ─────────────────────────────────────────────────────────────────────────────

// Neutral (language-independent) tech vocabulary — real tools, matched to what
// the rest of the site already claims (see skills.groups / projects[].stack).
const BUILDER_TECH = {
  frontend: ["Next.js", "React", "Tailwind"],
  telegram: ["Bot API", "Web App"],
  triggers: ["Webhooks", "n8n", "Cron"],
  api: ["FastAPI", "Node", "tRPC"],
  bot: ["Node", "Python", "Queue"],
  pipeline: ["Python", "Workers", "Queue"],
  ai: ["Claude", "GPT-4o", "LangChain", "RAG"],
};

// Maps scale → the Contact form's budget bucket index
// (["< $200","$200-600","$600-1.5k","$1.5-3k","$3k+"]) plus a display range.
// Ranges confirmed directly against the actual Uzbekistan market (client's
// own numbers, 2026-07) — even the FIRST pricing pass (grounded in solo/
// CIS-remote research) still read as agency-inflated for local UZ clients.
const BUILDER_SCALE_META = {
  mvp: { budgetIdx: 1, budget: "$250–1k" },
  prod: { budgetIdx: 2, budget: "$500–2k" },
  product: { budgetIdx: 4, budget: "$2–5k" },
};

function builderDedupe(arr) {
  const seen = {}; const out = [];
  for (let i = 0; i < arr.length; i++) { if (!seen[arr[i]]) { seen[arr[i]] = 1; out.push(arr[i]); } }
  return out;
}

// Pure function: which layers exist + their tech, given (type, scale, priority).
// priority ("что критично") meaningfully bends the stack — this is the depth the
// client asked for, not cosmetic: e.g. AI-depth forces the intelligence layer on
// even for a plain web app; Load adds queues/CDN/cache; Design adds motion libs.
function builderModel(typeKey, scaleKey, priorityKey, sub) {
  const isAIType = typeKey === "ai" || typeKey === "automation";
  const isAI = isAIType || priorityKey === "ai";
  const prod = scaleKey === "prod" || scaleKey === "product";
  const product = scaleKey === "product";
  const heavyLoad = priorityKey === "scale";
  const designFirst = priorityKey === "design";

  let clientSub, clientTech;
  if (typeKey === "bot") { clientSub = sub.telegram; clientTech = BUILDER_TECH.telegram.slice(); }
  else if (typeKey === "automation") { clientSub = sub.triggers; clientTech = BUILDER_TECH.triggers.slice(); }
  else { clientSub = sub.frontend; clientTech = BUILDER_TECH.frontend.slice(); }
  if (designFirst && typeKey !== "bot" && typeKey !== "automation") clientTech.push("Framer Motion", "GSAP");

  let logicSub, logicTech;
  if (typeKey === "bot") { logicSub = sub.bot; logicTech = BUILDER_TECH.bot.slice(); }
  else if (typeKey === "automation") { logicSub = sub.pipeline; logicTech = BUILDER_TECH.pipeline.slice(); }
  else { logicSub = sub.api; logicTech = BUILDER_TECH.api.slice(); }

  const aiTech = BUILDER_TECH.ai.slice();
  if (priorityKey === "ai") aiTech.push("Evals");

  const dataTech = ["Postgres"];
  if (prod || heavyLoad) dataTech.push("Redis");
  if (isAI) dataTech.push("pgvector");

  const infraTech = ["Docker", "Deploy"];
  if (prod) infraTech.push("Auth · RBAC", "Sentry", "GitHub Actions");
  if (product) infraTech.push("Analytics");
  if (heavyLoad) infraTech.push("Queue", "CDN", "Load balancer");

  return [
    { id: "client", sub: clientSub, tech: builderDedupe(clientTech), active: true },
    { id: "logic", sub: logicSub, tech: builderDedupe(logicTech), active: true },
    { id: "ai", sub: sub.ai, tech: builderDedupe(aiTech), active: isAI },
    { id: "data", sub: "", tech: builderDedupe(dataTech), active: true },
    { id: "infra", sub: "", tech: builderDedupe(infraTech), active: true },
  ];
}

// One representative tech per active layer, in flow order — the readout summary.
function builderStackSummary(layers) {
  const picks = [];
  layers.forEach(function pick(L) {
    if (L.active && L.tech && L.tech.length) picks.push(L.tech[0]);
  });
  return picks.join(" · ");
}

// Builder type → Contact scope_opts label (for chip pre-select on handoff).
const BUILDER_SCOPE_MAP = { web: "Web App / MVP", ai: "AI Automation", bot: "Telegram Bot", automation: "AI Automation" };

function ProjectBuilder({ t, links }) {
  const ref = useRevealRoot([t]);
  const b = t.builder;
  const [typeKey, setTypeKey] = useState2("web");
  const [scaleKey, setScaleKey] = useState2("mvp");
  const [priorityKey, setPriorityKey] = useState2("speed");
  // Sequential-assembly driver: `shown` counts how many active layers have
  // dropped into place. On any choice change we reset to 0 and re-reveal them
  // top-down on a timer, so the system visibly RE-ASSEMBLES every time.
  const [shown, setShown] = useState2(0);

  // Defensive: if a content bundle predates the builder v2 block, render nothing
  // rather than throwing (keeps older cached content.js from white-screening).
  if (!b || !b.priorities || !b.verdictLead) return null;

  const layers = builderModel(typeKey, scaleKey, priorityKey, b.sub);
  const scaleMeta = BUILDER_SCALE_META[scaleKey] || BUILDER_SCALE_META.mvp;
  const stackSummary = builderStackSummary(layers);
  const timeText = (b.times && b.times[scaleKey]) || "";
  const activeCount = layers.reduce(function (n, L) { return n + (L.active ? 1 : 0); }, 0);
  const moduleCount = layers.reduce(function (n, L) { return n + (L.active ? L.tech.length : 0); }, 0);
  const verdict = (b.verdictLead[typeKey] || "") + " — " + (b.verdictTail[priorityKey] || "");
  // Richer output: concrete deliverables (derived from the ACTIVE layers so it
  // always matches the assembled system), the process stages, and an honest
  // scope boundary per scale ("what's NOT in this pass" — expectation-setting
  // reads as professional, not evasive).
  const includes = layers
    .filter(function (L) { return L.active; })
    .map(function (L) { return (b.deliverables && b.deliverables[L.id]) || ""; })
    .filter(Boolean);
  // Priority also produces a concrete deliverable, so "что входит" reflects ALL
  // three choices (design/scale/ai), not just the layers — except AI-depth,
  // which is already spoken for by the active intelligence layer.
  const aiLayerActive = layers.some(function (L) { return L.id === "ai" && L.active; });
  const prioDeliverable = (b.priorityDeliverable && b.priorityDeliverable[priorityKey]) || "";
  const includesFull = (prioDeliverable && !(priorityKey === "ai" && aiLayerActive))
    ? includes.concat(prioDeliverable)
    : includes;
  const stages = Array.isArray(b.stages) ? b.stages : [];
  const scopeNote = (b.scopeNote && b.scopeNote[scaleKey]) || "";

  // Build-status HUD: turns the silent layer cascade into a legible "machine
  // computing" — a progress track fills as active layers drop in, and the
  // status flips from "assembling…" to "assembled" on completion.
  const building = shown < activeCount;
  const buildPct = activeCount ? Math.round((shown / activeCount) * 100) : 0;
  const status = b.status || {};

  useEffect2(function runAssembly() {
    const reduce =
      (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
      document.documentElement.hasAttribute("data-motion-lite");
    if (reduce) { setShown(activeCount); return undefined; }
    setShown(0);
    const timers = [];
    let i = 0;
    function step() { i += 1; setShown(i); if (i < activeCount) timers.push(window.setTimeout(step, 130)); }
    timers.push(window.setTimeout(step, 90));
    return function () { timers.forEach(function (id) { window.clearTimeout(id); }); };
    // Re-run on any choice change (activeCount captures type/priority AI toggling).
  }, [typeKey, scaleKey, priorityKey, activeCount]);

  // Reset the cascade SYNCHRONOUSLY on any choice so the machine visibly
  // "recomputes" — layers AND readout tear down and re-resolve together,
  // instead of flashing the finished new state for one frame first.
  function choose(setter, k) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(6); } catch (err) { /* opportunistic haptic */ }
    }
    setter(k); setShown(0);
  }

  function pick(list, k) { const f = list.filter(function (x) { return x.k === k; })[0]; return f ? f.label : k; }
  function summaryLine() {
    return pick(b.types, typeKey) + " · " + pick(b.scales, scaleKey) + " · " + pick(b.priorities, priorityKey) + "\n" +
      verdict + "\n" +
      b.readout.stack + ": " + stackSummary + "\n" +
      b.readout.time + ": " + timeText + " · " + b.readout.budget + ": " + scaleMeta.budget;
  }

  function onHandoff() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(8); } catch (err) { /* opportunistic */ }
    }
    try {
      window.dispatchEvent(new CustomEvent("sm:builder-config", {
        detail: { scope: BUILDER_SCOPE_MAP[typeKey], budgetIdx: scaleMeta.budgetIdx, summary: summaryLine() },
      }));
    } catch (err) { /* opportunistic */ }
    const el = document.getElementById("contact");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Assign each active layer its position among the active set so the cascade
  // (and the `shown` gate) can reveal them strictly top-down.
  let activeIdx = -1;
  const rows = layers.map(function (L) {
    let ai = -1;
    if (L.active) { activeIdx += 1; ai = activeIdx; }
    return { L: L, activeIdx: ai, shown: L.active && ai < shown };
  });

  return (
    <section id="builder" className="builder-sec" data-enter="assemble" ref={ref}>
      <div className="shell">
        <SecHead eyebrow={b.eyebrow} title={b.title} meta="build.preview()" />
        <p className="lead-line" data-reveal>{b.lead}</p>

        <div className="builder card" data-reveal>
          {/* CHOICES */}
          <div className="builder-choices">
            <div className="builder-step">
              <div className="builder-step-k mono"><span className="builder-step-n">01</span>{b.step1}</div>
              <div className="builder-opts builder-opts--type">
                {b.types.map(function renderType(o) {
                  const on = typeKey === o.k;
                  return (
                    <button key={o.k} type="button" className={`builder-opt ${on ? "is-active" : ""}`} aria-pressed={on} onClick={function () { choose(setTypeKey, o.k); }}>
                      <span className="builder-opt-label">{o.label}</span>
                      <span className="builder-opt-note mono">{o.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="builder-step">
              <div className="builder-step-k mono"><span className="builder-step-n">02</span>{b.step2}</div>
              <div className="builder-opts builder-opts--scale">
                {b.scales.map(function renderScale(o) {
                  const on = scaleKey === o.k;
                  return (
                    <button key={o.k} type="button" className={`builder-opt builder-opt--pill ${on ? "is-active" : ""}`} aria-pressed={on} onClick={function () { choose(setScaleKey, o.k); }}>
                      <span className="builder-opt-label">{o.label}</span>
                      <span className="builder-opt-note mono">{o.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="builder-step">
              <div className="builder-step-k mono"><span className="builder-step-n">03</span>{b.step3}</div>
              <div className="builder-opts builder-opts--prio">
                {b.priorities.map(function renderPrio(o) {
                  const on = priorityKey === o.k;
                  return (
                    <button key={o.k} type="button" className={`builder-opt builder-opt--pill ${on ? "is-active" : ""}`} aria-pressed={on} onClick={function () { choose(setPriorityKey, o.k); }}>
                      <span className="builder-opt-label">{o.label}</span>
                      <span className="builder-opt-note mono">{o.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* STAGE — the assembling blueprint */}
          <div className="builder-stage" aria-hidden="true">
            <div className={`builder-hud ${building ? "is-building" : "is-ready"}`}>
              <div className="builder-hud-top mono">
                <span className="builder-hud-status">
                  <span className="builder-hud-dot" aria-hidden="true" />
                  {building ? (status.building || "…") : (status.ready || "ok")}
                </span>
                <span className="builder-hud-count">
                  {activeCount} {b.metric.layers} · {moduleCount} {b.metric.modules}
                </span>
              </div>
              <div className="builder-hud-track">
                <span className="builder-hud-fill" style={{ width: buildPct + "%" }} />
              </div>
            </div>
            <div className="builder-layers">
              <span className="builder-backbone" />
              <span className="builder-flow" />
              {rows.filter(function keepShown(r) { return r.shown; }).map(function renderLayer(r) {
                const L = r.L;
                return (
                  <div key={L.id} className={`builder-layer builder-layer--${L.id}`} style={{ "--li": r.activeIdx }}>
                    <div className="builder-layer-body">
                      <div className="builder-layer-head">
                        <span className="builder-layer-name mono">{b.layers[L.id]}</span>
                        {L.sub ? <span className="builder-layer-sub">{L.sub}</span> : null}
                      </div>
                      {b.layerNote && b.layerNote[L.id] ? <div className="builder-layer-note">{b.layerNote[L.id]}</div> : null}
                      <div className="builder-layer-tech">
                        {L.tech.map(function renderChip(tch, i) {
                          return <span key={i} className="builder-chip mono" style={{ "--ci": i }}>{tch}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* READOUT — crystallizing stack/timeline/budget + expert verdict */}
          <div className="builder-readout-block">
            {/* Readout crystallizes IN STEP with the layer cascade: each row
                resolves as the assembly reaches it (shown counter), and the
                verdict lands once the whole system is built. Same `shown` that
                drives the layers → one machine computing an answer. */}
            <div className="builder-readout" aria-live="polite">
              <div className={`builder-readout-row ${shown >= 1 ? "is-in" : ""}`}>
                <span className="builder-readout-k mono">{b.readout.stack}</span>
                <span className="builder-readout-v mono">{stackSummary}</span>
              </div>
              <div className={`builder-readout-row ${shown >= 2 ? "is-in" : ""}`}>
                <span className="builder-readout-k mono">{b.readout.time}</span>
                <span className="builder-readout-v mono">{timeText}</span>
              </div>
              <div className={`builder-readout-row ${shown >= 3 ? "is-in" : ""}`}>
                <span className="builder-readout-k mono">{b.readout.budget}</span>
                <span className="builder-readout-v mono">{scaleMeta.budget}</span>
              </div>
            </div>

            {/* SPEC — concrete deliverables, process, and honest scope boundary.
                Resolves once the system is fully assembled (shown ≥ activeCount),
                staggered by CSS so it reads as the machine "printing the spec". */}
            <div className={`builder-spec ${shown >= activeCount ? "is-in" : ""}`}>
              {includesFull.length && b.lbl ? (
                <div className="builder-spec-group">
                  <div className="builder-spec-h mono">{b.lbl.includes}</div>
                  <ul className="builder-includes">
                    {includesFull.map(function renderInclude(d, i) {
                      return (
                        <li key={i} className="builder-include" style={{ "--si": i }}>
                          <span className="builder-include-tick" aria-hidden="true">✓</span>
                          <span>{d}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {stages.length && b.lbl ? (
                <div className="builder-spec-group">
                  <div className="builder-spec-h mono">{b.lbl.stages}</div>
                  <div className="builder-proc">
                    {stages.map(function renderStage(s, i) {
                      return <span key={i} className="builder-proc-node" style={{ "--si": i }}>{s}</span>;
                    })}
                  </div>
                </div>
              ) : null}

              {scopeNote && b.lbl ? (
                <div className="builder-boundary">
                  <span className="builder-boundary-k mono">{b.lbl.boundary}</span>
                  <span className="builder-boundary-v">{scopeNote}</span>
                </div>
              ) : null}
            </div>

            <div className={`builder-verdict ${shown >= activeCount ? "is-in" : ""}`}>
              <span className="builder-verdict-mark" aria-hidden="true">“</span>
              <p className="builder-verdict-text">{verdict}</p>
            </div>
          </div>

          {/* CTA */}
          <div className="builder-cta-block">
            <div className="builder-cta">
              <a className="btn btn-primary builder-cta-tg" data-magnetic href={`https://${links.telegram}`} target="_blank" rel="noopener noreferrer">
                <span>{b.cta_tg}</span>
                <span className="arrow">→</span>
              </a>
              <button type="button" className="builder-cta-alt" onClick={onHandoff}>
                {b.cta_form} <span className="arrow">→</span>
              </button>
            </div>
            <div className="builder-hint mono">{b.hint}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ — accordion of common client questions. Single-open-at-a-time, click/tap
// only (no hover-preview — this is a utilitarian Q&A list, not the editorial
// browsing Signal owns). First question starts open so the interaction pattern
// is visible without requiring a click.
// ─────────────────────────────────────────────────────────────────────────────
function FaqRow({ item, index, open, onToggle }) {
  return (
    <div className={`faq-row${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="faq-row-head"
        aria-expanded={open}
        aria-controls={`faq-a-${index}`}
        onClick={() => onToggle(index)}
      >
        <span className="faq-row-num mono">{String(index + 1).padStart(2, "0")}</span>
        <span className="faq-row-q">{item.q}</span>
        <span className="faq-row-icon" aria-hidden="true">
          <span className="faq-row-icon-h" />
          <span className="faq-row-icon-v" />
        </span>
      </button>
      <div className="faq-row-detail" id={`faq-a-${index}`}>
        <div className="faq-row-detail-inner">
          <p className="faq-row-a">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

function Faq({ t }) {
  const ref = useRevealRoot([t]);
  const [openIndex, setOpenIndex] = useState2(0);
  const items = (t.faq && Array.isArray(t.faq.items)) ? t.faq.items : [];

  function handleToggle(i) {
    setOpenIndex((prev) => (prev === i ? -1 : i));
  }

  return (
    <section data-section="faq" id="faq" data-enter="assemble" ref={ref}>
      <div className="shell">
        <SecHead num="08" eyebrow={t.faq.eyebrow} title={t.faq.title} meta={`${items.length} · Q&A`} />
        <p className="lead-line" data-reveal>{t.faq.lead}</p>
        <div className="faq-list" data-reveal>
          {items.map(function renderFaq(item, i) {
            return <FaqRow key={i} item={item} index={i} open={openIndex === i} onToggle={handleToggle} />;
          })}
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

// PROOF — replaces placeholder testimonials with verifiable receipts: live
// products + public code you can open right now. Honest > fake quotes, and it
// reads as "here are my receipts", which is the actual professional signal.
function Trust({ t }) {
  const ref = useRevealRoot([t]);
  const proof = (t.trust && Array.isArray(t.trust.proof)) ? t.trust.proof : [];
  const liveCount = proof.filter(function (p) { return p.tag === "LIVE"; }).length;

  return (
    <section data-section="trust" id="trust" data-enter="slide-right" ref={ref}>
      <div className="shell">
        <SecHead num="09" eyebrow={t.trust.eyebrow} title={t.trust.title} meta={`${proof.length} · open`} />
        <p className="lead-line" data-reveal>{t.trust.lead}</p>

        <div className="proof-grid" data-reveal>
          {proof.map(function renderProof(p, i) {
            // Quality practices are mostly not "things to open" — only the ones
            // with a real url (e.g. public CI) render as a link; the rest are
            // static cards (no ↗, no clickable affordance).
            const inner = (
              <>
                <div className="proof-card-top">
                  <span className={`proof-tag mono proof-tag--${(p.tag || "").toLowerCase()}`}>{p.tag}</span>
                  {p.url ? <span className="arrow" aria-hidden="true">↗</span> : null}
                </div>
                <div className="proof-card-k">{p.k}</div>
                <div className="proof-card-v">{p.v}</div>
              </>
            );
            const shared = {
              key: i,
              className: `proof-card${p.url ? "" : " proof-card--static"}`,
              "data-reveal": true,
              "data-reveal-from": "translateY(18px) scale(.98)",
              "data-reveal-delay": (i * 0.06).toFixed(2),
            };
            return p.url ? (
              <a {...shared} href={p.url} target="_blank" rel="noopener noreferrer" data-cursor="link" data-cursor-label={`open: ${p.k}`}>
                {inner}
              </a>
            ) : (
              <div {...shared}>{inner}</div>
            );
          })}
        </div>

        {t.trust.note ? (
          <div className="proof-foot mono" data-reveal>
            <span className="proof-foot-dot" aria-hidden="true" />
            {liveCount ? `${liveCount} live · ` : ""}{t.trust.note}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT
// ─────────────────────────────────────────────────────────────────────────────
// Contact form EMAIL delivery endpoint. Create a free form at
// https://formspree.io and replace YOUR_FORM_ID with the real id (e.g.
// "xeozabcd") to enable email delivery. Until then the form does NOT fake a
// success — the submit button routes honestly to the Telegram hand-off
// (composeMessage → clipboard + open chat), which works with no backend. The
// dedicated "✈ Telegram" button always does the same, regardless of this id.
const CONTACT_FORM_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";
const FORM_ENDPOINT_CONFIGURED = CONTACT_FORM_ENDPOINT.indexOf("YOUR_FORM_ID") === -1;
const CONTACT_FETCH_TIMEOUT_MS = 12000;

function Contact({ t, links }) {
  const ref = useRevealRoot([t]);
  const [sent, setSent] = useState2(false);
  const [sending, setSending] = useState2(false);
  const [errorMsg, setErrorMsg] = useState2("");
  const [copied, setCopied] = useState2(false);
  const [copiedIdx, setCopiedIdx] = useState2(-1);
  const formRef = useRef2(null);
  const TELEGRAM_URL = "https://" + (links.telegram || "t.me/killallofthem13");

  // Copy a contact value (email/telegram/github handle) to the clipboard.
  function copyContact(val, idx) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(function () {
          setCopiedIdx(idx);
          window.setTimeout(function () { setCopiedIdx(-1); }, 2000);
        }, function () { /* clipboard denied — the link still works */ });
      }
    } catch (err) { /* opportunistic */ }
  }
  // Multi-select chips for project scope — a single dropdown was hiding the
  // breadth of services. Chips let the visitor click as many as apply, which
  // also reveals the available service categories at a glance.
  const [scopeSet, setScopeSet] = useState2(() => new Set());
  // Budget slider — 5 fixed buckets so we don't ask for awkward exact numbers.
  // Confirmed directly against the real Uzbekistan market (client's own
  // numbers, 2026-07) — see BUILDER_SCALE_META above for the same pass.
  const BUDGET_BUCKETS = ["< $200", "$200-600", "$600-1.5k", "$1.5-3k", "$3k+"];
  const [budgetIdx, setBudgetIdx] = useState2(1);
  // Timeline preference — small chip row for urgency, helps scoping.
  const TIMELINE_LABEL = t.contact.form.timeline || "Сроки";
  const TIMELINE_OPTS = t.contact.timeline_opts || ["ASAP", "1–2 недели", "1–2 месяца", "гибко"];
  const [timelineIdx, setTimelineIdx] = useState2(3);
  const BUDGET_LABEL = t.contact.form.budget || "Бюджет";
  // Handoff target: the project builder above dispatches "sm:builder-config"
  // when the visitor clicks "перенести в заявку" — we pre-fill the matching
  // scope chip, budget bucket, and drop a summary into the message field so
  // they land on a form that already understands their build.
  const msgRef = useRef2(null);
  useEffect2(function builderHandoff() {
    function onConfig(e) {
      const d = e && e.detail;
      if (!d) return;
      if (d.scope) setScopeSet(new Set([d.scope]));
      if (typeof d.budgetIdx === "number") setBudgetIdx(d.budgetIdx);
      if (d.summary && msgRef.current) {
        msgRef.current.value = d.summary;
        // nudge the reveal/validation state so the filled field looks alive
        try { msgRef.current.dispatchEvent(new Event("input", { bubbles: true })); } catch (err) { /* opportunistic */ }
      }
    }
    window.addEventListener("sm:builder-config", onConfig);
    return function () { window.removeEventListener("sm:builder-config", onConfig); };
  }, []);

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

  // Collect native fields (name/email/message via their `name=` attrs) plus
  // the React-controlled selections that aren't native inputs.
  function buildFd(formEl) {
    const fd = new FormData(formEl);
    fd.append("scope", Array.from(scopeSet).join(", "));
    fd.append("budget", BUDGET_BUCKETS[budgetIdx]);
    fd.append("timeline", TIMELINE_OPTS[timelineIdx]);
    return fd;
  }

  // Build a readable brief from the form fields for the Telegram hand-off.
  function composeMessage(fd) {
    const g = function (k) { return (fd.get(k) || "").toString().trim(); };
    const L = t.contact.form || {};
    return [
      "Заявка с сайта — SM",
      g("name") ? (L.name || "Имя") + ": " + g("name") : "",
      g("email") ? (L.email || "Email") + ": " + g("email") : "",
      g("scope") ? (L.scope || "Scope") + ": " + g("scope") : "",
      g("budget") ? (L.budget || "Бюджет") + ": " + g("budget") : "",
      g("timeline") ? (L.timeline || "Сроки") + ": " + g("timeline") : "",
      "",
      g("message"),
    ].filter(function (line) { return line !== ""; }).join("\n");
  }

  // Telegram delivery: a personal @username can't accept prefilled DM text via
  // a link, so we copy the composed brief to the clipboard (the visitor pastes
  // it) AND open the chat. Honest + no backend required.
  function openTelegram(formEl) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (err) { /* opportunistic */ }
    }
    const text = composeMessage(buildFd(formEl));
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          setCopied(true);
          window.setTimeout(function () { setCopied(false); }, 4500);
        }, function () { /* clipboard denied — still open the chat */ });
      }
    } catch (err) { /* opportunistic */ }
    try { window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer"); } catch (err) { /* opportunistic */ }
  }

  function onSubmit(e) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setErrorMsg("");
    const fd = buildFd(formEl);

    // Endpoint not configured yet → route HONESTLY to Telegram (never a fake
    // "sent"). Once a real Formspree id is set, email delivery takes over.
    if (!FORM_ENDPOINT_CONFIGURED) {
      openTelegram(formEl);
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
        <SecHead num="10" eyebrow={t.contact.eyebrow} title={t.contact.title} em={t.contact.title.split(" ").pop()} meta="status: receiving" />
        <p className="lead-line" data-reveal>{t.contact.lead}</p>

        <div className="contact-layout">
          <form ref={formRef} className="contact-form card" onSubmit={onSubmit} data-reveal>
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
              <textarea ref={msgRef} name="message" required rows="4" className="ff-input ff-textarea" placeholder={t.contact.form.msg_placeholder || ""} />
            </label>
            {errorMsg ? (
              <div className="contact-form-error mono" role="alert">{errorMsg}</div>
            ) : null}
            {copied ? (
              <div className="contact-copied mono" role="status">
                {(t.contact.form && t.contact.form.copied) || "Заявка скопирована — вставь в чат Telegram"}
              </div>
            ) : null}
            <div className="contact-actions">
              <button type="submit" className={`btn btn-primary contact-submit ${sent ? "is-sent" : ""}`} disabled={sent || sending}>
                <span>{sending ? (t.contact.form.sending || "Отправка…") : sent ? t.contact.form.sent : t.contact.form.submit}</span>
                <span className="arrow">{sent ? "✓" : "→"}</span>
              </button>
              <button type="button" className="btn btn-ghost contact-tg" onClick={function () { if (formRef.current) openTelegram(formRef.current); }}>
                <span>✈ {(t.contact.form && t.contact.form.telegram) || "В Telegram"}</span>
              </button>
            </div>
          </form>

          <aside className="contact-side" data-reveal>
            <div className="contact-deploy">
              <div className="mono contact-deploy-head">
                <span className="chip"><span className="chip-dot" />ready</span>
                <span>deploy.endpoint</span>
              </div>
              <div className="contact-deploy-body">
                {t.contact.links.map((l, i) => (
                  <div className="contact-link" key={i}>
                    <a
                      className="contact-link-main"
                      href={l.k === "Email" ? `mailto:${l.v}` : `https://${l.v}`}
                      target={l.k === "Email" ? undefined : "_blank"}
                      rel={l.k === "Email" ? undefined : "noopener noreferrer"}
                      data-cursor="link"
                      data-cursor-label={`open: ${l.k}`}
                    >
                      <span className="mono contact-link-k">{l.k}</span>
                      <span className="contact-link-v">{l.v}</span>
                    </a>
                    <button
                      type="button"
                      className={`contact-copy ${copiedIdx === i ? "is-copied" : ""}`}
                      aria-label={`${(t.contact.form && t.contact.form.copy) || "Копировать"} ${l.k}`}
                      onClick={() => copyContact(l.v, i)}
                    >
                      <span aria-hidden="true">{copiedIdx === i ? "✓" : "⧉"}</span>
                    </button>
                  </div>
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
  const f = t.footer || {};
  const navKeys = ["about", "projects", "skills", "services", "cv", "faq", "contact"];
  const contacts = [
    { k: "GitHub", v: links.github, href: `https://${links.github}` },
    { k: "Telegram", v: links.telegram, href: `https://${links.telegram}` },
    { k: "Email", v: links.email, href: `mailto:${links.email}` },
  ];
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        {/* Brand + closing CTA */}
        <div className="footer-brand">
          <a href="#hero" className="brand" data-cursor="link" data-cursor-label="↑ top">
            <span className="brand-mark" />
            <span>SAMANDAR<span className="brand-sub"> · EXEC.AI.LAB</span></span>
          </a>
          {f.tagline ? <p className="footer-tagline">{f.tagline}</p> : null}
          <a href="#contact" className="footer-cta" data-cursor="send" data-cursor-label="send → contact">
            {t.hero.cta_primary}
            <span className="arrow">→</span>
          </a>
        </div>

        {/* Navigation */}
        <nav className="footer-col" aria-label={f.nav_title || "Navigation"}>
          <div className="footer-col-h mono">{f.nav_title}</div>
          <ul className="footer-col-list">
            {navKeys.map((k) => (
              <li key={k}><a href={`#${k}`}>{t.nav[k]}</a></li>
            ))}
          </ul>
        </nav>

        {/* Contacts */}
        <div className="footer-col">
          <div className="footer-col-h mono">{f.contacts_title}</div>
          <ul className="footer-col-list">
            {contacts.map((c, i) => (
              <li key={i}>
                <a
                  href={c.href}
                  target={c.k === "Email" ? undefined : "_blank"}
                  rel={c.k === "Email" ? undefined : "noopener noreferrer"}
                  className="footer-contact"
                >
                  <span className="footer-contact-k mono">{c.k}</span>
                  <span className="footer-contact-v">{c.v}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Meta */}
        <div className="footer-col">
          <div className="footer-col-h mono">{f.meta_title}</div>
          <ul className="footer-col-list footer-meta mono">
            {(f.meta || []).map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      </div>

      <div className="shell footer-base mono">
        <span>{f.copy}</span>
        <span className="footer-base-built">{f.built}</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Services, CV, Process, ProjectBuilder, Trust, Contact, Footer });
