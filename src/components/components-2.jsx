// components-2.jsx — Services, CV, Process, Trust, Contact, Footer

const { useEffect: useEffect2, useRef: useRef2, useState: useState2, useMemo: useMemoFromComponents1 } = React;

const CV_PDF_PATH = "assets/docs/Samandar_Mansurkhodjaev_CV_QA.pdf";

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
function ServiceIoFlow({ io, toLabel }) {
  const io2 = splitIo(io);
  return (
    <div className="svc-io" aria-label={`${io2.in} ${toLabel || "to"} ${io2.out}`}>
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
  const deliverables = (t.services && Array.isArray(t.services.deliverables)) ? t.services.deliverables : [];
  const args = (t.services && Array.isArray(t.services.args)) ? t.services.args : [];

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
    const relatedHref = rel && rel.url ? rel.url : "#projects";
    const relatedExternal = /^https?:\/\//i.test(relatedHref);
    return (
      <div className="svc-detail-inner">
        <p className="svc-detail-v">{s.v}</p>
        <ServiceIoFlow io={s.io} toLabel={t.services.flow_to} />
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
            href={relatedHref}
            target={relatedExternal ? "_blank" : undefined}
            rel={relatedExternal ? "noopener noreferrer" : undefined}
            data-cursor="link"
            data-cursor-label={t.services.open_case || "open case"}
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
        <SecHead num="07" eyebrow={t.services.eyebrow} title={t.services.title} meta={t.services.meta || `${items.length} services`} />

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
                const isActive = i === activeIdx;
                return (
                  <div
                    key={i}
                    className="svc-panel"
                    role="tabpanel"
                    id={`svc-panel-${i}`}
                    aria-labelledby={`svc-tab-${i}`}
                    tabIndex={0}
                    hidden={!isActive}
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

        {/* ── WHAT YOU ARE LEFT HOLDING ─────────────────────────────────
            The tabs above answer "what can he build". They never answered the
            question a buyer is actually weighing, which is what arrives at the
            end and who owns it — the question an agency answers with a slide
            deck and a login to a system it keeps. Four artifacts, each of them
            a thing that exists after the invoice. */}
        {deliverables.length ? (
          <div className="svc-deliver" data-reveal>
            <div className="svc-deliver-head mono">
              <span>{t.services.deliver_label || "What you receive"}</span>
              <span className="svc-deliver-count">{String(deliverables.length).padStart(2, "0")}</span>
            </div>
            <ul className="svc-deliver-list">
              {deliverables.map((d, i) => (
                <li className="svc-deliver-item" key={i} data-reveal data-reveal-delay={(i * 0.06).toFixed(2)}>
                  <span className="mono svc-deliver-n">{String(i + 1).padStart(2, "0")}</span>
                  <span className="svc-deliver-k">{d.k}</span>
                  <span className="svc-deliver-v">{d.v}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ── THE TWO ARGUMENTS ─────────────────────────────────────────
            Price and speed, kept as two separate panels rather than one
            "fast and affordable" line. They answer different objections, and
            collapsing them into a single claim is what makes that claim sound
            like marketing — each one here names the specific mechanism that
            makes it true (no chain to pay for; no handoffs to wait on). */}
        {args.length ? (
          <div className="svc-args">
            {args.map((a, i) => (
              <div className="svc-arg" key={i} data-reveal data-reveal-delay={(i * 0.08).toFixed(2)}>
                <div className="svc-arg-head">
                  <span className="svc-arg-k">{a.k}</span>
                  <span className="mono svc-arg-tag">{a.tag}</span>
                </div>
                <p className="svc-arg-v">{a.v}</p>
              </div>
            ))}
          </div>
        ) : null}
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
  const tabRefs = useRef2({});
  const docLabels = t.cv.document || {};
  // Roles are an accordion: only one open at a time normally. For print we
  // force ALL open so the printed PDF shows the full timeline, then restore
  // the user's previous state after the print dialog closes.
  const restoreOpenIdx = useRef2(0);

  function setDocumentTab(nextTab, moveFocus) {
    if (nextTab !== "cv" && nextTab !== "readme") return;
    if (nextTab === "readme" && !hasReadme) return;
    setDocTab(nextTab);
    if (moveFocus) {
      requestAnimationFrame(function focusSelectedDocumentTab() {
        tabRefs.current[nextTab]?.focus();
      });
    }
  }

  function onDocumentTabKeyDown(event) {
    const tabs = hasReadme ? ["cv", "readme"] : ["cv"];
    const current = tabs.indexOf(docTab);
    let next = current;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setDocumentTab(tabs[next], true);
  }

  function keepTimelineFocusVisible(event) {
    const control = event.target && event.target.closest ? event.target.closest(".cv-role-head") : null;
    if (!control) return;
    function alignFocusedTimelineControl() {
      if (!control.isConnected || document.activeElement !== control) return;
      const nav = document.querySelector(".nav");
      const dock = document.querySelector(".mobile-dock");
      const navRect = nav ? nav.getBoundingClientRect() : null;
      const dockDisplayed = Boolean(dock && getComputedStyle(dock).display !== "none");
      // `getBoundingClientRect().top` includes the dock's 40px entrance
      // translate and every intermediate transition frame. During a direct
      // #cv load focus can arrive before `.is-visible`; aligning against that
      // moving visual rect leaves the control underneath the dock once the
      // transition settles. offsetTop is the stable fixed-layout destination.
      // Short landscape declares display:none, so it correctly reserves zero.
      const dockTop = dockDisplayed ? dock.offsetTop : window.innerHeight;
      const topBoundary = Math.max(0, navRect ? navRect.bottom : 0) + 12;
      const bottomBoundary = Math.min(window.innerHeight, dockTop) - 12;
      let rect = control.getBoundingClientRect();
      if (rect.top >= topBoundary && rect.bottom <= bottomBoundary) return;
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      try {
        // Let the browser resolve the target against the current document
        // geometry first. This remains correct if an expanded role or a late
        // font metric changed every absolute offset above the control.
        control.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });
        rect = control.getBoundingClientRect();
        if (rect.top < topBoundary || rect.bottom > bottomBoundary) {
          const targetTop = topBoundary + Math.max(0, (bottomBoundary - topBoundary - rect.height) / 2);
          window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - targetTop), behavior: "auto" });
        }
      } finally {
        root.style.scrollBehavior = previous;
      }
    }
    // Native focus scrolling is synchronous in current engines, so the first
    // pass closes the gap even when background tabs throttle animation frames.
    // The microtask catches same-turn layout changes; rAF remains a final guard
    // for a breakpoint or font reflow that lands after the focus event.
    alignFocusedTimelineControl();
    if (typeof queueMicrotask === "function") queueMicrotask(alignFocusedTimelineControl);
    requestAnimationFrame(alignFocusedTimelineControl);
    // Chromium may apply native focus scrolling after the React focus event,
    // while the fixed dock and viewport are also settling after a breakpoint
    // change. A short bounded guard re-asserts the same final geometry without
    // owning normal scroll: every callback becomes a no-op as soon as focus
    // leaves this control. This is intentionally finite, not an RAF loop.
    [0, 120, 360, 800, 1400].forEach(function scheduleFocusAlignment(delay) {
      window.setTimeout(alignFocusedTimelineControl, delay);
    });
  }

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
    <section data-section="cv" id="cv" data-enter="curtain" ref={ref} onFocusCapture={keepTimelineFocusVisible}>
      <div className="shell">
        <SecHead num="08" eyebrow={t.cv.eyebrow} title={t.cv.title} em={t.cv.title.split(" ").pop()} meta={`v.2026 · ${years || "active"}`} />

        <article className="cv-doc" data-reveal>
          {/* Doc chrome */}
          <header className="cv-doc-head">
            {/* Segmented toggle — clicking switches the document view. The
                pill-with-highlighted-segment shape reads as switchable on
                sight; hover + cursor reinforce it. */}
            <div className="cv-doc-tabs mono" role="tablist" aria-label={docLabels.tabs_label || "CV documents"}>
              <button
                id="cv-tab-cv"
                type="button"
                role="tab"
                aria-controls="cv-panel-cv"
                aria-selected={!showReadme}
                tabIndex={!showReadme ? 0 : -1}
                className={`cv-doc-tab ${!showReadme ? "is-active" : ""}`}
                onClick={() => setDocumentTab("cv", false)}
                onKeyDown={onDocumentTabKeyDown}
                ref={(node) => { tabRefs.current.cv = node; }}
                data-cursor="link"
              >
                samandar.cv
              </button>
              {hasReadme ? (
                <button
                  id="cv-tab-readme"
                  type="button"
                  role="tab"
                  aria-controls="cv-panel-readme"
                  aria-selected={showReadme}
                  tabIndex={showReadme ? 0 : -1}
                  className={`cv-doc-tab ${showReadme ? "is-active" : ""}`}
                  onClick={() => setDocumentTab("readme", false)}
                  onKeyDown={onDocumentTabKeyDown}
                  ref={(node) => { tabRefs.current.readme = node; }}
                  data-cursor="link"
                >
                  readme.md
                </button>
              ) : null}
            </div>
            <div className="cv-doc-actions mono">
              <a
                className="cv-action cv-action--primary"
                href={CV_PDF_PATH}
                download="Samandar_Mansurkhodjaev_CV_QA.pdf"
                data-cursor="link"
                data-cursor-label={docLabels.download || "download PDF"}
              >
                <span className="cv-action-ico" aria-hidden="true">↓</span>
                <span>{docLabels.download || "download PDF"}</span>
              </a>
              <button className="cv-action" type="button" onClick={onPrint} data-cursor="link" data-cursor-label={docLabels.print || "print CV"}>
                <span className="cv-action-ico" aria-hidden="true">⌘P</span>
                <span>{docLabels.print || "print"}</span>
              </button>
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

          {/* Both tabpanels stay in the DOM so every aria-controls target is
              stable. The browser's native hidden state handles inactive views. */}
          <div
            id="cv-panel-cv"
            className="cv-panel"
            role="tabpanel"
            aria-labelledby="cv-tab-cv"
            tabIndex={0}
            hidden={showReadme}
          >
          <div className="cv-doc-body">
            <div className="cv-main">
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
            </div>

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
                        <span className="cv-lang-name">{l.k}</span>
                        <span className="mono cv-lang-lvl">{l.label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </aside>
          </div>
          </div>

          {hasReadme ? (
            <div
              id="cv-panel-readme"
              className="cv-panel"
              role="tabpanel"
              aria-labelledby="cv-tab-readme"
              tabIndex={0}
              hidden={!showReadme}
            >
              <CvReadme r={t.cv.readme} />
            </div>
          ) : null}

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
// PROCESS — a gate-driven delivery ledger. Each phase names the decision,
// durable artifact and QA condition required to move forward. It communicates
// how the engagement is controlled without simulating terminal activity.
// ─────────────────────────────────────────────────────────────────────────────
function Process({ t }) {
  const ref = useRevealRoot([t]);
  const p = t.process;
  const phases = Array.isArray(p.phases) ? p.phases : [];

  return (
    <section data-section="process" id="process" data-enter="line-stagger" ref={ref}>
      <div className="shell">
        <SecHead num="09" eyebrow={p.eyebrow} title={p.title} meta={p.meta} titleId="process-title" />
        <p className="lead-line" data-reveal>{p.lead}</p>

        <div className="proc-principle" data-reveal>
          <span className="proc-principle-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <p>{p.principle}</p>
          <span className="mono proc-principle-code">GATE-DRIVEN DELIVERY</span>
        </div>

        <ol className="proc-ledger" aria-labelledby="process-title">
          {phases.map((phase, index) => (
            <li
              className="proc-ledger-row"
              key={`${phase.k}-${index}`}
              style={{ "--proc-i": index }}
              data-reveal
              data-reveal-delay={(index * 0.07).toFixed(2)}
            >
              <span className="proc-ledger-index mono" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="proc-ledger-body">
                <span className="proc-ledger-kicker mono">0{index + 1} / 04</span>
                <h3 className={phase.k.length > 12 ? "is-long" : undefined}>{phase.k}</h3>
                <p>{phase.v}</p>
              </div>
              <dl className="proc-ledger-proof">
                <div className="proc-ledger-proof-row proc-ledger-proof-row--artifact">
                  <dt className="mono">{p.artifact_label}</dt>
                  <dd>{phase.artifact}</dd>
                </div>
                <div className="proc-ledger-proof-row proc-ledger-proof-row--gate">
                  <dt className="mono"><span className="proc-gate-node" aria-hidden="true" />{p.gate_label}</dt>
                  <dd>{phase.gate}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>

        <aside className="proc-boundary" data-reveal>
          <span className="mono proc-boundary-label">{p.boundary_label}</span>
          <p>{p.boundary}</p>
          <span className="proc-boundary-seal mono" aria-hidden="true">SCOPE / EVIDENCE / RELEASE</span>
        </aside>
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

function ProjectBuilder({ t, links }) {
  const ref = useRevealRoot([t]);
  const b = t.builder;
  const estimator = window.BUILDER_ESTIMATOR;
  const [typeId, setTypeId] = useState2("web");
  const [stageId, setStageId] = useState2("mvp");
  const [driverIds, setDriverIds] = useState2(() => new Set());
  const [readinessIds, setReadinessIds] = useState2(() => new Set());
  /* The detailed architecture is supporting evidence, not the first task.
     Keep it behind one explicit, 48px control on every viewport so the scope
     preview reaches a useful answer quickly; the current controls/readout stay
     visible and complete without the disclosure. */
  const [architectureOpen, setArchitectureOpen] = useState2(false);

  if (!b || !estimator || !Array.isArray(b.drivers) || !Array.isArray(b.readiness)) return null;

  const result = estimator.estimateProject({
    typeId: typeId,
    stageId: stageId,
    driverIds: Array.from(driverIds),
    readinessIds: Array.from(readinessIds),
  });
  const type = b.types.find(function find(item) { return item.k === typeId; });
  const stage = b.stages.find(function find(item) { return item.k === stageId; });
  const driverLabels = result.driverIds.map(function label(id) {
    const item = b.drivers.find(function find(driver) { return driver.k === id; });
    return item ? item.label : id;
  });
  const capabilityLabels = result.capabilityIds.map(function label(id) { return b.capabilities[id] || id; });
  const riskLabels = result.exclusionIds.map(function label(id) { return b.risks[id] || id; });
  const budgetText = `$${result.budget.min.toLocaleString("en-US")}–${result.budget.max.toLocaleString("en-US")}`;
  const weeksText = `${result.weeks.min}–${result.weeks.max} ${b.units.weeks}`;
  const confidenceText = b.confidence[result.confidence.band] || result.confidence.band;

  function choose(setter, value) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(6); } catch (err) { /* opportunistic haptic */ }
    }
    setter(value);
  }

  function toggleSet(setter, value) {
    setter(function update(previous) {
      const next = new Set(previous);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function summaryLine() {
    return [
      b.summaryTitle,
      `${type ? type.label : typeId} · ${stage ? stage.label : stageId}`,
      driverLabels.length ? `${b.labels.drivers}: ${driverLabels.join(", ")}` : `${b.labels.drivers}: ${b.labels.none}`,
      `${b.readout.time}: ${weeksText}`,
      `${b.readout.budget}: ${budgetText}`,
      b.notice,
    ].join("\n");
  }

  function onHandoff() {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(8); } catch (err) { /* opportunistic */ }
    }
    try {
      window.dispatchEvent(new CustomEvent("sm:builder-config", {
        detail: {
          typeId: typeId,
          stageId: stageId,
          driverIds: result.driverIds,
          readinessIds: result.readinessIds,
          estimateBandId: result.estimateBandId,
          timelineBandId: result.timelineBandId,
          budgetLabel: budgetText,
          timelineLabel: weeksText,
          result: result,
          summary: summaryLine(),
        },
      }));
    } catch (err) { /* opportunistic */ }
    function focusContact() {
      const target = document.querySelector("#contact .ff-textarea");
      if (target) target.focus({ preventScroll: true });
    }
    if (window.SceneCinema && typeof window.SceneCinema.navigate === "function") {
      window.SceneCinema.navigate("contact", { source: "builder-handoff" }).then(focusContact, focusContact);
    } else {
      const el = document.getElementById("contact");
      try { window.history.pushState(null, "", "#contact"); } catch (err) { /* opportunistic */ }
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(focusContact, 500);
    }
  }

  return (
    <section data-section="builder" id="builder" className="builder-sec" data-enter="assemble" ref={ref}>
      <div className="shell">
        <SecHead num="05" eyebrow={b.eyebrow} title={b.title} meta={b.meta} titleId="builder-title" />
        <p className="lead-line" data-reveal>{b.lead}</p>

        <form className="builder card" aria-labelledby="builder-title" onSubmit={function preventSubmit(event) { event.preventDefault(); }} data-reveal>
          <div className="builder-console-rail mono" aria-hidden="true">
            <span>{b.meta}</span>
            <span>{`${type ? type.label : typeId} / ${stage ? stage.label : stageId}`}</span>
            <span>{`v${result.estimateVersion}`}</span>
          </div>
          {/* CHOICES */}
          <div className="builder-choices">
            <fieldset className="builder-step">
              <legend className="builder-step-k mono"><span className="builder-step-n">01</span>{b.step1}</legend>
              <div className="builder-opts builder-opts--type">
                {b.types.map(function renderType(o) {
                  const on = typeId === o.k;
                  return (
                    <label key={o.k} className={`builder-opt ${on ? "is-active" : ""}`}>
                      <input className="builder-control" type="radio" name="builder-type" value={o.k} checked={on} onChange={function () { choose(setTypeId, o.k); }} />
                      <span className="builder-opt-copy"><span className="builder-opt-label">{o.label}</span><span className="builder-opt-note mono">{o.note}</span></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="builder-step">
              <legend className="builder-step-k mono"><span className="builder-step-n">02</span>{b.step2}</legend>
              <div className="builder-opts builder-opts--scale">
                {b.stages.map(function renderStage(o) {
                  const on = stageId === o.k;
                  return (
                    <label key={o.k} className={`builder-opt builder-opt--pill ${on ? "is-active" : ""}`}>
                      <input className="builder-control" type="radio" name="builder-stage" value={o.k} checked={on} onChange={function () { choose(setStageId, o.k); }} />
                      <span className="builder-opt-copy"><span className="builder-opt-label">{o.label}</span><span className="builder-opt-note mono">{o.note}</span></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="builder-step">
              <legend className="builder-step-k mono"><span className="builder-step-n">03</span>{b.step3}</legend>
              <div className="builder-opts builder-opts--drivers">
                {b.drivers.map(function renderDriver(o) {
                  const on = driverIds.has(o.k);
                  return (
                    <label key={o.k} className={`builder-opt builder-opt--compact ${on ? "is-active" : ""}`}>
                      <input className="builder-control" type="checkbox" value={o.k} checked={on} onChange={function () { toggleSet(setDriverIds, o.k); }} />
                      <span className="builder-opt-copy"><span className="builder-opt-label">{o.label}</span><span className="builder-opt-note mono">{o.note}</span></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="builder-step builder-step--readiness">
              <legend className="builder-step-k mono"><span className="builder-step-n">04</span>{b.step4}</legend>
              <div className="builder-ready-list">
                {b.readiness.map(function renderReady(o) {
                  const on = readinessIds.has(o.k);
                  return (
                    <label key={o.k} className="builder-ready">
                      <input type="checkbox" checked={on} onChange={function () { toggleSet(setReadinessIds, o.k); }} />
                      <span>{o.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <div className="builder-readout-block">
            <p className="builder-notice">{b.notice}</p>
            <dl className="builder-readout">
              <div className="builder-readout-row"><dt className="builder-readout-k mono">{b.readout.time}</dt><dd className="builder-readout-v mono">{weeksText}</dd></div>
              <div className="builder-readout-row"><dt className="builder-readout-k mono">{b.readout.budget}</dt><dd className="builder-readout-v mono">{budgetText}</dd></div>
              <div className="builder-readout-row"><dt className="builder-readout-k mono">{b.readout.confidence}</dt><dd className="builder-readout-v mono">{confidenceText}</dd></div>
            </dl>
            <div className="builder-result-group">
              <h3 className="builder-spec-h mono">{b.labels.includes}</h3>
              <ul className="builder-includes">
                {(capabilityLabels.length ? capabilityLabels : [b.labels.core]).map(function renderCapability(label, index) {
                  return <li key={index} className="builder-include"><span className="builder-include-tick" aria-hidden="true">✓</span><span>{label}</span></li>;
                })}
              </ul>
            </div>
            <div className="builder-boundary">
              <span className="builder-boundary-k mono">{b.labels.risks}</span>
              <span className="builder-boundary-v">{riskLabels.length ? riskLabels.join(" · ") : b.labels.ready}</span>
            </div>
            <div className="a11y-only" role="status" aria-live="polite" aria-atomic="true">
              {`${type ? type.label : typeId}. ${stage ? stage.label : stageId}. ${weeksText}. ${budgetText}. ${confidenceText}.`}
            </div>
          </div>

          <div className="builder-cta-block">
            <div className="builder-cta">
              <button type="button" className="btn btn-primary builder-cta-tg" onClick={onHandoff}>
                <span>{b.cta_form}</span><span className="arrow">→</span>
              </button>
              <a className="builder-cta-alt" href={`https://${links.telegram}`} target="_blank" rel="noopener noreferrer">
                {b.cta_tg} <span className="arrow">↗</span>
              </a>
            </div>
            <button type="button" className="builder-architecture-toggle" aria-expanded={architectureOpen} aria-controls="builder-architecture" onClick={function () { setArchitectureOpen(function (value) { return !value; }); }}>
              {architectureOpen ? b.hideArchitecture : b.showArchitecture}<span aria-hidden="true">{architectureOpen ? "−" : "+"}</span>
            </button>
          </div>

          <div id="builder-architecture" className={`builder-stage ${architectureOpen ? "is-open" : ""}`} hidden={!architectureOpen}>
            <div className="builder-stage-head">
              <span className="mono">{b.architecture}</span>
              <span className="mono">v{result.estimateVersion}</span>
            </div>
            <ol className="builder-proof-mini" aria-label={b.proofLabel}>
              {b.proof.map(function renderProof(item, index) { return <li key={index}><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></li>; })}
            </ol>
            <div className="builder-layers">
              <span className="builder-backbone" />
              {result.layers.filter(function keepActive(layer) { return layer.active; }).map(function renderLayer(L, index) {
                return (
                  <div key={L.id} className={`builder-layer builder-layer--${L.id}`} style={{ "--li": index }}>
                    <div className="builder-layer-body">
                      <div className="builder-layer-head">
                        <span className="builder-layer-name mono">{b.layers[L.id]}</span>
                      </div>
                      <div className="builder-layer-tech">
                        {L.tech.map(function renderChip(tech, chipIndex) {
                          return <span key={chipIndex} className="builder-chip mono" style={{ "--ci": chipIndex }}>{tech}</span>;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERLUDE — a full-screen typographic breath between acts.
//
// The page had one density all the way down: heading, cards, heading, cards.
// These are the rests in the score — three of them, placed where the story
// actually turns (after the opening, before the work, before the ask).
//
// The "sculpture" is built from three cheap, composable ideas rather than one
// expensive effect:
//   1. Each line sits at a different parallax depth (data-plx), so scrolling
//      through separates them in Z and they re-converge as you pass.
//   2. Lines rise out of a mask on entry, staggered — the same cinema-titles
//      grammar the section headings use, so this reads as the same voice.
//   3. The accent phrase is Instrument Serif italic: one warm, human stroke
//      against the geometric display face.
// Nothing here is a section — no [data-section], so the nav counter, the dock
// and the act engine never see these as chapters.
// ─────────────────────────────────────────────────────────────────────────────
function Interlude({ data, index }) {
  if (!data || !data.lines || !data.lines.length) return null;
  // Alternating depths: odd lines drift against the even ones, which is what
  // makes the block feel dimensional instead of merely animated.
  const DEPTH = [0.10, -0.06, 0.14];
  return (
    <aside className={`ilude ilude--${data.id || index}`} data-reveal data-reveal-from="none" aria-label={data.eyebrow}>
      <div className="shell ilude-shell">
        {data.eyebrow ? <div className="ilude-eyebrow mono">{data.eyebrow}</div> : null}
        <p className="ilude-type">
          {data.lines.map((line, i) => (
            <span className="ilude-lm" key={i} data-plx={DEPTH[i % DEPTH.length]}>
              <span className="ilude-line" style={{ "--li": i }}>
                {data.em && line.indexOf(data.em) !== -1 ? (
                  <>
                    {line.slice(0, line.indexOf(data.em))}
                    <em className="ilude-em">{data.em}</em>
                    {line.slice(line.indexOf(data.em) + data.em.length)}
                  </>
                ) : line}
              </span>
            </span>
          ))}
        </p>
        {data.meta ? <div className="ilude-meta mono">{data.meta}</div> : null}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ — accordion of common client questions. Single-open-at-a-time, click/tap
// only (no hover-preview — this is a utilitarian Q&A list, not the editorial
// browsing Signal owns). First question starts open so the interaction pattern
// is visible without requiring a click.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// FAQ — THE TRANSCRIPT
//
// Was an accordion: seven questions, one open, six collapsed behind a plus
// sign. Two things wrong with that here. An accordion is a filing system — it
// is right when a reader wants ONE answer out of many and knows which — and
// these seven are the pre-sales conversation, which is read straight through
// by someone deciding whether to write at all. Collapsing it made the reader
// click six times to have a conversation they were already having.
//
// So it is a transcript. Speaker in the margin, turn in the column, every word
// on the page at once. Seven exchanges is 1100 characters — about a screen and
// a half, and the last thing read before the contact form, which is exactly
// where a transcript of "here is how this actually works" belongs.
//
// No interaction at all. That is the point, not an omission: nothing here is
// worth a click, and adding one would only slow down the reading it exists for.
// ─────────────────────────────────────────────────────────────────────────────
function Faq({ t }) {
  const ref = useRevealRoot([t]);
  const items = (t.faq && Array.isArray(t.faq.items)) ? t.faq.items : [];
  const you = (t.faq && t.faq.speaker_you) || "you";

  return (
    <section data-section="faq" id="faq" data-enter="transcript" ref={ref}>
      <div className="shell">
        <SecHead num="10" eyebrow={t.faq.eyebrow} title={t.faq.title} meta={t.faq.meta || `${items.length} · transcript`} />
        <p className="lead-line" data-reveal>{t.faq.lead}</p>

        <div className="dlg">
          {items.map(function renderExchange(item, i) {
            return (
              <div
                className="dlg-turn"
                key={i}
                data-reveal
                data-reveal-from="translateY(16px)"
                data-reveal-delay={(Math.min(i, 4) * 0.05).toFixed(2)}
              >
                <p className="dlg-line dlg-line--q">
                  <span className="dlg-who mono">{you}</span>
                  <span className="dlg-text">{item.q}</span>
                </p>
                <p className="dlg-line dlg-line--a">
                  <span className="dlg-who mono dlg-who--me">SM</span>
                  <span className="dlg-text">{item.a}</span>
                </p>
              </div>
            );
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
// ─────────────────────────────────────────────────────────────────────────────
// TRUST — THE PROTOCOL
//
// Six cards in a grid, one of which was a link out to a GitHub profile. Two
// problems with that. The grid made six engineering practices look like six
// product features, and the outbound link sent the reader off the page at the
// exact moment the page was making its strongest claim — the section's whole
// job is to be the last thing that convinces, not a doorway to somewhere else.
//
// This is the same six items as a signed-off lab protocol: numbered clauses on
// a light document ground, each with its own check mark, closed by a control
// line. It is a form the claim can actually take, rather than a card layout
// borrowed from a pricing page. There are no external links here at all, by
// design — the proof is the specificity of the clauses.
// ─────────────────────────────────────────────────────────────────────────────
function Trust({ t }) {
  const ref = useRevealRoot([t]);
  const proof = (t.trust && Array.isArray(t.trust.proof)) ? t.trust.proof : [];

  return (
    <section data-section="trust" id="trust" data-enter="slide-right" ref={ref}>
      <div className="shell">
        <SecHead num="11" eyebrow={t.trust.eyebrow} title={t.trust.title} meta={t.trust.meta || `${proof.length} · protocol`} />
        <p className="lead-line" data-reveal>{t.trust.lead}</p>

        <div className="proto" data-reveal>
          <div className="proto-head mono">
            <span className="proto-head-id">{t.trust.protocol_id || "QA / PROTOCOL"}</span>
            <span className="proto-head-rule" aria-hidden="true" />
            <span className="proto-head-rev">{t.trust.revision || "rev. 2026.1"}</span>
          </div>

          <ol className="proto-list">
            {proof.map(function renderClause(p, i) {
              return (
                <li
                  className="proto-clause"
                  key={i}
                  data-reveal
                  data-reveal-from="translateY(14px)"
                  data-reveal-delay={(i * 0.05).toFixed(2)}
                >
                  <span className="proto-n mono" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span className="proto-check" aria-hidden="true">
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 8.5l3.4 3.4L13 5" />
                    </svg>
                  </span>
                  <span className="proto-body">
                    <span className="proto-k">{p.k}</span>
                    <span className="proto-v">{p.v}</span>
                  </span>
                  <span className={`proto-tag mono proto-tag--${(p.tag || "").toLowerCase()}`}>{p.tag}</span>
                </li>
              );
            })}
          </ol>

          {t.trust.note ? (
            <div className="proto-foot mono">
              <span className="proto-foot-dot" aria-hidden="true" />
              <span>{t.trust.note}</span>
              <span className="proto-foot-sig">SM</span>
            </div>
          ) : null}
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
  const [briefText, setBriefText] = useState2("");
  const [copyState, setCopyState] = useState2("idle");
  const [copiedIdx, setCopiedIdx] = useState2(-1);
  const formRef = useRef2(null);
  const briefRef = useRef2(null);
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
  const BUDGET_BUCKETS = ["< $150", "$150–400", "$400–900", "$900–2k", "$2k+"];
  const [budgetIdx, setBudgetIdx] = useState2(1);
  const [builderBudget, setBuilderBudget] = useState2("");
  // Timeline preference — small chip row for urgency, helps scoping.
  const TIMELINE_LABEL = t.contact.form.timeline || "Сроки";
  const TIMELINE_OPTS = t.contact.timeline_opts || ["ASAP", "1–2 недели", "1–2 месяца", "гибко"];
  const [timelineIdx, setTimelineIdx] = useState2(3);
  const [builderTimeline, setBuilderTimeline] = useState2("");
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
      const scopeIndex = { web: 0, ai: 1, bot: 2, automation: 1 }[d.typeId];
      if (typeof scopeIndex === "number" && t.contact.scope_opts[scopeIndex]) {
        setScopeSet(new Set([t.contact.scope_opts[scopeIndex]]));
      }
      setBuilderBudget(d.budgetLabel || "");
      setBuilderTimeline(d.timelineLabel || "");
      if (d.summary && msgRef.current) {
        msgRef.current.value = d.summary;
        // nudge the reveal/validation state so the filled field looks alive
        try { msgRef.current.dispatchEvent(new Event("input", { bubbles: true })); } catch (err) { /* opportunistic */ }
      }
    }
    window.addEventListener("sm:builder-config", onConfig);
    return function () { window.removeEventListener("sm:builder-config", onConfig); };
  }, [t]);

  function toggleScope(v) {
    setScopeSet(function (prev) {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  }

  // Collect native fields (name/email/message via their `name=` attrs) plus
  // the React-controlled selections that aren't native inputs.
  function buildFd(formEl) {
    const fd = new FormData(formEl);
    fd.append("scope", Array.from(scopeSet).join(", "));
    fd.append("budget", builderBudget || BUDGET_BUCKETS[budgetIdx]);
    fd.append("timeline", builderTimeline || TIMELINE_OPTS[timelineIdx]);
    return fd;
  }

  // Build a readable, locale-aware brief. The site never claims that a
  // backend accepted it: the visitor sees this exact text before handing it
  // to Telegram or their mail client.
  function composeMessage(fd) {
    const g = function (k) { return (fd.get(k) || "").toString().trim(); };
    const L = t.contact.form || {};
    return [
      L.brief_title || "Project brief — SM",
      g("name") ? (L.name || "Имя") + ": " + g("name") : "",
      g("contact") ? (L.email || "Email / Telegram") + ": " + g("contact") : "",
      g("scope") ? (L.scope || "Scope") + ": " + g("scope") : "",
      g("budget") ? (L.budget || "Бюджет") + ": " + g("budget") : "",
      g("timeline") ? (L.timeline || "Сроки") + ": " + g("timeline") : "",
      "",
      g("message"),
    ].filter(function (line) { return line !== ""; }).join("\n");
  }

  function focusBriefFallback() {
    if (!briefRef.current) return;
    briefRef.current.focus();
    briefRef.current.select();
  }

  function copyBrief(text) {
    setCopyState("ready");
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          setCopyState("copied");
        }, function () {
          setCopyState("manual");
          window.setTimeout(focusBriefFallback, 0);
        });
        return;
      }
    } catch (err) { /* fall through to the visible brief */ }
    setCopyState("manual");
    window.setTimeout(focusBriefFallback, 0);
  }

  function prepareBrief(formEl) {
    if (!formEl || !formEl.reportValidity()) return "";
    const text = composeMessage(buildFd(formEl));
    setBriefText(text);
    copyBrief(text);
    return text;
  }

  function openTelegram(formEl) {
    const text = prepareBrief(formEl);
    if (!text) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (err) { /* opportunistic */ }
    }
    try { window.open(TELEGRAM_URL, "_blank", "noopener,noreferrer"); } catch (err) { /* opportunistic */ }
  }

  function openEmail(formEl) {
    const text = prepareBrief(formEl);
    if (!text) return;
    const L = t.contact.form || {};
    const href = `mailto:${links.email}?subject=${encodeURIComponent(L.brief_subject || "Project brief")}&body=${encodeURIComponent(text)}`;
    try { window.location.href = href; } catch (err) { /* the visible brief remains available */ }
  }

  function onSubmit(event) {
    event.preventDefault();
    openTelegram(event.currentTarget);
  }

  function clearPreparedBrief() {
    if (!briefText && copyState === "idle") return;
    setBriefText("");
    setCopyState("idle");
  }
  return (
    <section data-section="contact" id="contact" data-enter="rise-bright" ref={ref}>
      <div className="shell">
        <SecHead num="12" eyebrow={t.contact.eyebrow} title={t.contact.title} em={t.contact.title.split(" ").pop()} meta="Tashkent · UTC+5" titleId="contact-title" />
        <p className="lead-line" data-reveal>{t.contact.lead}</p>

        <div className="contact-layout">
          <form ref={formRef} className="contact-form card" aria-labelledby="contact-title" onSubmit={onSubmit} onInput={clearPreparedBrief} data-reveal>
            <div className="contact-form-row">
              <label className="ff">
                <span className="ff-k mono">{t.contact.form.name}</span>
                <input type="text" name="name" required className="ff-input" autoComplete="name" />
              </label>
              <label className="ff">
                <span className="ff-k mono">{t.contact.form.email}</span>
                <input type="text" name="contact" required className="ff-input" autoComplete="email" />
              </label>
            </div>

            {/* Scope chips — multi-select; click to toggle. */}
            <div className="ff">
              <span className="ff-k mono">{t.contact.form.scope}</span>
              <div className="ff-chips" role="group" aria-label={t.contact.form.scope}>
                {t.contact.scope_opts.map(function renderChip(o, i) {
                  const active = scopeSet.has(o);
                  return (
                    <label key={i} className={`ff-chip ff-choice ${active ? "is-active" : ""}`}>
                      <input
                        className="a11y-only ff-choice-control"
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleScope(o)}
                      />
                      <span>{o}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Budget bucket slider — 5 discrete steps with track tick marks
                so you can SEE which bucket you're snapping to. */}
            <div className="ff">
              <span className="ff-k mono">
                {BUDGET_LABEL}
                <span className="ff-k-val">{builderBudget || BUDGET_BUCKETS[budgetIdx]}</span>
              </span>
              <div className="ff-range-wrap">
                <input
                  type="range"
                  className="ff-range"
                  min="0"
                  max={BUDGET_BUCKETS.length - 1}
                  step="1"
                  value={budgetIdx}
                  aria-label={BUDGET_LABEL}
                  aria-valuetext={builderBudget || BUDGET_BUCKETS[budgetIdx]}
                  onChange={(e) => { setBudgetIdx(parseInt(e.target.value, 10)); setBuilderBudget(""); }}
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
              <div className="ff-chips" aria-label={TIMELINE_LABEL}>
                {TIMELINE_OPTS.map(function renderTimeline(o, i) {
                  return (
                    <label key={i} className={`ff-chip ff-choice ${i === timelineIdx ? "is-active" : ""}`}>
                      <input
                        className="a11y-only ff-choice-control"
                        type="radio"
                        name="timeline-ui"
                        checked={i === timelineIdx}
                        onChange={() => { setTimelineIdx(i); setBuilderTimeline(""); }}
                      />
                      <span>{o}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <label className="ff">
              <span className="ff-k mono">{t.contact.form.msg}</span>
              <textarea ref={msgRef} name="message" required rows="4" className="ff-input ff-textarea" placeholder={t.contact.form.msg_placeholder || ""} />
            </label>
            <div className="contact-actions">
              <button type="submit" className="btn btn-primary contact-submit" data-magnetic>
                <span>{t.contact.form.submit}</span>
                <span className="arrow">→</span>
              </button>
              <button type="button" className="btn btn-ghost contact-email" onClick={function () { if (formRef.current) openEmail(formRef.current); }}>
                <span>{t.contact.form.email_action}</span>
                <span className="arrow">↗</span>
              </button>
            </div>

            {briefText ? (
              <div className="contact-brief" role="region" aria-label={t.contact.form.preview_label}>
                <div className="contact-brief-head">
                  <span className="mono">{t.contact.form.preview_label}</span>
                  <button type="button" className="contact-brief-copy mono" onClick={function () { copyBrief(briefText); }}>
                    {t.contact.form.copy_brief}
                  </button>
                </div>
                <textarea ref={briefRef} className="contact-brief-text mono" value={briefText} readOnly rows="8" />
                <p className="contact-brief-status mono" role="status" aria-live="polite">
                  {copyState === "copied" ? t.contact.form.copied :
                    copyState === "manual" ? t.contact.form.copy_manual : t.contact.form.preview_note}
                </p>
              </div>
            ) : null}
          </form>

          <aside className="contact-side" data-reveal>
            <div className="contact-deploy">
              <div className="mono contact-deploy-head">
                <span className="chip"><span className="chip-dot" />{t.contact.direct_label || "direct"}</span>
                <span>{t.contact.channel_label}</span>
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
                {(t.contact.signal_meta || ["UTC+5 · Tashkent", "remote · contract", "RU · UZ · EN"]).map(function renderMeta(item, index) {
                  return <div key={index}>{item}</div>;
                })}
              </div>
            </div>
          </aside>
        </div>

        {/* ── THE RING ──────────────────────────────────────────────────
            The page opens on the name at full viewport width and closes on
            the same name, small, set the same way — condensed caps, letters
            spaced flush across their line. Not decoration: a long scroll needs
            an ending that says "that was the whole thing", and the strongest
            available signal that the reader has come all the way round is the
            first thing they saw, returned at a whisper.

            The link goes back to #hero rather than scrolling to 0, so it
            reuses the same in-page navigation (and the same cinema transition)
            as every other jump on the site. */}
        <div className="ring" data-reveal>
          <a className="ring-mark" href="#hero" data-cursor="link" data-cursor-label={t.contact.ring_back || "back to the top"}>
            <span className="ring-name" aria-hidden="true">
              {"SAMANDAR".split("").map((ch, i) => <span className="ring-l" key={i}>{ch}</span>)}
            </span>
            <span className="a11y-only">{t.contact.ring_back || "back to the top"}</span>
          </a>
          <div className="ring-foot mono">
            <span className="ring-note">{t.contact.ring_note || ""}</span>
            <span className="ring-back">{t.contact.ring_back || "back to the top"} ↑</span>
          </div>
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
            <span>SAMANDAR<span className="brand-sub"> · RELEASE PROOF</span></span>
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
