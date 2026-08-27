// components.jsx — Section components for the Executive AI Code Lab portfolio
// Each section consumes the current i18n bundle (`t`) and renders its slice.

const { useEffect, useRef, useState, useMemo } = React;

// ── Reveal hook — just returns ref; delays set inline in JSX
function useRevealRoot(deps) {
  const rootRef = useRef(null);
  return rootRef;
}

// ── Reusable section header
function SecHead({ num, eyebrow, title, lines, meta, em, titleId }) {
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
  const titleLines = Array.isArray(lines) && lines.length ? lines : null;
  return (
    // data-reveal-from="none": the head itself only FADES in — all the motion
    // belongs to the line-mask below (title slides out from under an invisible
    // mask, cinema-titles style). Without this the reveal engine would ALSO
    // translate the whole block 48px and the two movements would fight.
    <header className="sec-head" data-reveal data-reveal-from="none" data-plx="0.045">
      <div>
        <div className="num">{num ? <>{num} · </> : null}{eyebrow}</div>
        <h2 id={titleId} style={{ marginTop: 14 }} aria-label={titleLines ? title : undefined}>
          <span className="lm"><span className="lm-i">
            {titleLines
              ? titleLines.map((line, index) => (
                  <span className="sec-title-line" aria-hidden="true" key={`${index}-${line}`}>{line}</span>
                ))
              : titleNode}
          </span></span>
        </h2>
      </div>
      {meta ? <div className="sec-meta">{meta}</div> : null}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO — THE MASTHEAD
//
// This used to be a two-column grid: a text column on the left, a Spline 3D
// robot on the right. The robot went, and not because it misbehaved — it was
// the single most generic thing on the page. A friendly 3D character next to a
// left-aligned headline is the house style of every AI-startup template of the
// last three years; it read as "made from a kit" no matter how well it ran. It
// also cost a second WebGL context, a 1-3 MB scene download, a CDN runtime we
// didn't control, and ~220 lines of load/retry/watchdog machinery to hide the
// fact that it might not arrive at all.
//
// What replaced it is the one thing a portfolio can own outright: the name,
// set as a masthead. Two lines of condensed display type, both spanning the
// full viewport width edge to edge, the given name dominant and the surname
// recessive underneath it. Everything else on the screen — eyebrow, status,
// roles, tagline, actions — is deliberately small, so the page has ONE loud
// element and a lot of quiet, which is the actual difference between editorial
// design and a template.
//
// Two things keep it from being a static poster:
//   • Each letter rises out of a bottom mask on its own beat when the intro
//     curtain clears (see `is-lit`). The word assembles rather than appears.
//   • The letters sit on different depth planes and lean with the pointer at
//     different rates (--hd, an arc: outer letters travel most, centre least),
//     so the word behaves like carved objects in a shallow space instead of
//     flat artwork. That is the "alive" the robot was there to provide, done
//     with transforms on 22 spans instead of a GPU scene.
// ─────────────────────────────────────────────────────────────────────────────
const HERO_GIVEN = "SAMANDAR";
const HERO_FAMILY = "MANSURKHODJAEV";

// The previous Hero assembled every headline character on its own transform
// plane. It looked precise in one reference viewport, but glyph baselines and
// hinting differed across Chromium/WebKit and while fonts settled. Keep one
// mask per authored line instead: the line can still reveal and lean as a
// physical object, while the browser remains responsible for shaping the
// complete phrase. This is both more typographically correct and more robust.
function heroLetters(line) {
  return (
    <span className="hn-l hn-l--phrase">
      <span className="hn-i">{line}</span>
    </span>
  );
}

function Hero({ t, links }) {
  const ref = useRevealRoot([t]);
  // The masthead holds its hidden pose until the intro curtain is gone — the
  // whole point of the letter assembly is that it happens where you can see it.
  const [lit, setLit] = useState(false);

  // The masthead notices the primary action: `.cta-live` on the section
  // tightens the accent hairline under the name while the CTA is hovered or
  // keyboard-focused, so the two ends of the composition are visibly connected.
  function onCtaFocus(e) { const s = e.currentTarget.closest("section"); if (s) s.classList.add("cta-live"); }
  function onCtaBlur(e) { const s = e.currentTarget.closest("section"); if (s) s.classList.remove("cta-live"); }

  // Hold the letters in their hidden pose until the intro curtain has actually
  // cleared, then release them. Three entry paths, all of which must end lit:
  //   • No curtain at all (deep-link entry, or index.html's inline guard never
  //     created one) -> light immediately, this frame.
  //   • Normal boot -> the `sm:intro-done` event.
  //   • The event never arrives (intro.js blocked, or it fired before this
  //     component mounted) -> a wall-clock backstop. Every timed thing on this
  //     page needs one: a hidden or backgrounded tab can stall rAF-driven
  //     timelines like the intro's indefinitely, and "the name never appears"
  //     is the worst possible failure mode for the hero.
  useEffect(() => {
    const intro = window.__SM_INTRO;
    const curtain = intro && intro.panel;
    if (!curtain || !curtain.parentNode) { setLit(true); return undefined; }
    if (intro.prepared) { setLit(true); return undefined; }
    let fired = false;
    const light = () => { if (fired) return; fired = true; setLit(true); };
    window.addEventListener("sm:intro-prep", light);
    window.addEventListener("sm:intro-done", light);
    const backstop = window.setTimeout(light, 4200);
    return () => {
      window.removeEventListener("sm:intro-prep", light);
      window.removeEventListener("sm:intro-done", light);
      window.clearTimeout(backstop);
    };
  }, []);

  useEffect(() => {
    if (!lit) return undefined;
    document.documentElement.classList.add("sm-hero-shell-live");
    return () => document.documentElement.classList.remove("sm-hero-shell-live");
  }, [lit]);

  // Hero depth consumes the shared motion runtime. It never owns scroll,
  // pointer or resize listeners and never creates a private animation loop.
  // The semantic frame remains fully readable when the runtime is absent,
  // reduced or parked on a low tier.
  useEffect(() => {
    const heroEl = document.getElementById("hero");
    const runtime = window.__SM_MOTION_RUNTIME;
    if (!heroEl || !runtime || typeof runtime.subscribe !== "function") return undefined;
    const state = { rect: null, hx: 0, hy: 0, fieldX: 0, fieldY: 0, progress: 0, rendered: "" };
    const unsubscribe = runtime.subscribe({
      id: "hero-depth-field",
      priority: 34,
      measure(context) {
        const expressive = !context.policy.reducedMotion && context.policy.tier !== "low";
        if (!expressive) {
          // Keep the static specimen fully composed without forcing layout on
          // every low-tier scroll frame. Normal/high tiers retain the authored
          // pointer lean and scroll depth unchanged.
          state.rect = null;
          return;
        }
        if (context.input.scrolled || context.input.resized || context.input.pointerMoved || !state.rect) {
          state.rect = heroEl.getBoundingClientRect();
        }
      },
      compute(context) {
        const rect = state.rect;
        const active = rect && rect.bottom > 0 && rect.top < context.input.viewportHeight;
        const expressive = !context.policy.reducedMotion && context.policy.tier !== "low";
        const canLean = active && expressive &&
          context.policy.pointerClass === "fine" && context.input.pointerActive;
        state.hx = canLean ? (context.input.pointerX / Math.max(1, context.input.viewportWidth) - 0.5) : 0;
        state.hy = canLean ? (context.input.pointerY / Math.max(1, context.input.viewportHeight) - 0.5) : 0;
        const progress = active && rect && expressive ? Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height))) : 0;
        state.progress = progress;
        state.fieldX = state.hx * 10;
        state.fieldY = progress * 24 + state.hy * 8;
      },
      mutate() {
        const hx = state.hx.toFixed(3);
        const hy = state.hy.toFixed(3);
        const fieldX = state.fieldX.toFixed(1) + "px";
        const fieldY = state.fieldY.toFixed(1) + "px";
        const progress = state.progress.toFixed(4);
        const rendered = [hx, hy, fieldX, fieldY, progress].join("|");
        if (rendered === state.rendered) return;
        state.rendered = rendered;
        heroEl.style.setProperty("--hx", hx);
        heroEl.style.setProperty("--hy", hy);
        heroEl.style.setProperty("--hero-field-x", fieldX);
        heroEl.style.setProperty("--hero-field-y", fieldY);
        heroEl.style.setProperty("--hero-phase", progress);
      },
      dispose() {
        heroEl.style.removeProperty("--hx");
        heroEl.style.removeProperty("--hy");
        heroEl.style.removeProperty("--hero-field-x");
        heroEl.style.removeProperty("--hero-field-y");
        heroEl.style.removeProperty("--hero-phase");
      },
    });
    runtime.wake("hero-depth-ready");
    return unsubscribe;
  }, []);

  // The roles were an <h1> of three stacked lines ("Full-stack." / "AI
  // Automation." / "Product Engineer."). The name is the <h1> now, so these
  // become a single tracked rule under it — one horizontal line of small mono
  // on desktop, three edge-to-edge display lines on mobile (see .hero-roles).
  // Trailing full stops are dropped: they belonged to the stacked reading and
  // read as noise inside a slash-separated rule.
  const roles = (t.hero.title_lines || []).map((s) => s.replace(/\.\s*$/, ""));
  const statementLines = Array.isArray(t.hero.statement_lines) && t.hero.statement_lines.length
    ? t.hero.statement_lines
    : [HERO_GIVEN, HERO_FAMILY];
  const proofSteps = Array.isArray(t.hero.proof_steps) && t.hero.proof_steps.length
    ? t.hero.proof_steps
    : [
        { code: "01", k: "BUILD", v: "full-stack" },
        { code: "02", k: "VERIFY", v: "QA" },
        { code: "03", k: "SHIP", v: "production" },
      ];

  return (
    <section
      data-section="hero" id="hero" className={`hero hero--release-proof${lit ? " is-lit" : ""}`} ref={ref}
    >
      {/* A physical release proof, not a generated image or a pseudo-product
          dashboard. Ink impressions begin deliberately misregistered, settle
          into one word, pass the inspection rule and remain a complete static
          composition when motion is unavailable. */}
      <figure className="release-proof" aria-hidden="true">
        <span className="release-proof-shadow" />
        <div className="release-proof-sheet">
          <span className="release-proof-crop release-proof-crop--tl" />
          <span className="release-proof-crop release-proof-crop--tr" />
          <span className="release-proof-crop release-proof-crop--bl" />
          <span className="release-proof-crop release-proof-crop--br" />
          <span className="release-proof-folio mono">PRODUCT ENGINEERING</span>
          <span className="release-proof-owner mono">SAMANDAR MANSURKHODJAEV</span>
          <div className="release-proof-impression">
            <span className="release-proof-ink release-proof-ink--a">RELEASE</span>
            <span className="release-proof-ink release-proof-ink--b">RELEASE</span>
            <span className="release-proof-ink release-proof-ink--key">RELEASE</span>
          </div>
          <span className="release-proof-register release-proof-register--a" />
          <span className="release-proof-register release-proof-register--b" />
          <div className="release-proof-verdict">
            <span className="mono">BUILD + QA</span>
            <strong>ONE OWNER</strong>
          </div>
          <ol className="release-proof-map">
          {proofSteps.map((step, index) => (
            <li key={`proof-${step.code}`} style={{ "--proof-i": index }}>
              <span className="mono">{step.code}</span>
              <strong>{step.k}</strong>
            </li>
          ))}
          </ol>
          <span className="release-proof-inspection" />
        </div>
        <figcaption className="release-proof-caption mono">DESIGN · FULL-STACK · AI · QUALITY</figcaption>
      </figure>

      {/* Four horizontal bands, top to bottom: identification, the masthead,
          the roles rule, the action row. The masthead is the only one that
          escapes `.shell` — it runs to the viewport edges, because a name that
          stops at a content margin is a heading, and a name that reaches the
          edges is a masthead. */}
      <div className="hero-stack">
        <div className="shell hero-band hero-band--top">
          <span className="eyebrow hero-eyebrow">
            <span className="hero-eyebrow-desktop">{t.hero.eyebrow}</span>
            <span className="hero-eyebrow-mobile">{t.hero.eyebrow_mobile || t.hero.eyebrow}</span>
          </span>
          <span className="hero-status">
            <span className="status-dot" />
            <span className="mono hero-status-copy">
              <span className="hero-status-desktop">{t.hero.status}</span>
              <span className="hero-status-mobile">{t.hero.status_mobile || t.hero.status}</span>
            </span>
          </span>
        </div>

        {/* Keep complete phrases as the layout unit. Cyrillic and long localized
            words must shape naturally; motion reveals the line mask rather
            than splitting glyphs into fragile positioned boxes. */}
        <div className="hero-copy-stage">
          <p className="hero-signature mono">{t.hero.signature || `${HERO_GIVEN} ${HERO_FAMILY}`}</p>
          <h1 className="hero-name" aria-label={t.hero.statement_aria || statementLines.join(" ")}>
            {statementLines.map((line, lineIndex) => (
              <span
                className={`hn-line hero-statement-line hero-statement-line--${lineIndex + 1} ${lineIndex === 0 ? "hn-line--given" : ""} ${lineIndex === statementLines.length - 1 ? "hn-line--family" : ""}`}
                style={{ "--hs-line": lineIndex }}
                aria-hidden="true"
                key={`${lineIndex}-${line}`}
              >
                {line}
              </span>
            ))}
          </h1>
        </div>

        <div className="shell hero-band hero-band--rule">
          <p className="hero-roles">
            {roles.map((r, i) => (
              <React.Fragment key={i}>
                {i ? <i className="hero-roles-sep" aria-hidden="true">/</i> : null}
                <span
                  className="hero-role"
                >
                  <span className="a11y-only">{r}</span>
                  <span className="hero-role-ink" aria-hidden="true">{r}</span>
                </span>
              </React.Fragment>
            ))}
          </p>
          <div className="hero-links">
            <a href={`https://${links.github}`} target="_blank" rel="noopener noreferrer" className="hero-link" data-cursor="link" data-cursor-label="open: github">GitHub</a>
            <a href={`https://${links.telegram}`} target="_blank" rel="noopener noreferrer" className="hero-link" data-cursor="link" data-cursor-label="open: telegram">Telegram</a>
            <a href={`mailto:${links.email}`} className="hero-link" data-cursor="send" data-cursor-label="send: email">Email</a>
          </div>
        </div>

        <div className="shell hero-band hero-band--act">
          <p className="hero-tagline">
            <span className="hero-tagline-desktop">{t.hero.tagline}</span>
            <span className="hero-tagline-mobile">{t.hero.tagline_mobile || t.hero.tagline}</span>
          </p>
          <div className="hero-ctas">
            <a
              href="#contact" className="btn btn-primary"
              data-cursor="send" data-cursor-label="send → contact"
              onMouseEnter={onCtaFocus} onMouseLeave={onCtaBlur}
              onFocus={onCtaFocus} onBlur={onCtaBlur}
              >
                <span className="btn-label hero-cta-desktop">{t.hero.cta_primary}</span>
                <span className="btn-label hero-cta-mobile">{t.hero.cta_primary_mobile || t.hero.cta_primary}</span>
                <span className="arrow">→</span>
              </a>
              <a href="#projects" className="btn btn-ghost" data-cursor="link" data-cursor-label="→ projects">
                <span className="btn-label hero-cta-desktop">{t.hero.cta_secondary}</span>
                <span className="btn-label hero-cta-mobile">{t.hero.cta_secondary_mobile || t.hero.cta_secondary}</span>
                <span className="arrow">↘</span>
              </a>
          </div>
        </div>
      </div>

      {/* Mobile-only scroll cue at the bottom of the takeover-hero. CSS hides it on desktop. */}
      <div className="hero-scroll-hint mono" aria-hidden="true">scroll</div>

      {/* Signature motif: a calibrated responsibility rail. It is not a
          decorative progress bar — the three checkpoints state the actual
          product loop this portfolio sells, and expose QA within the first
          viewport instead of leaving it buried in later copy. */}
      <div className="hero-proof" aria-label={t.hero.proof_label || "Build, verify, ship"}>
        <div className="shell hero-proof-inner">
          <span className="hero-proof-label mono">{t.hero.proof_label || "One ownership loop"}</span>
          <ol className="hero-proof-steps">
            {proofSteps.map((step, index) => (
              <li className="hero-proof-step" style={{ "--proof-i": index }} key={`${step.code}-${step.k}`}>
                <span className="hero-proof-node" aria-hidden="true" />
                <span className="hero-proof-code mono">{step.code}</span>
                <strong>{step.k}</strong>
                <span>{step.v}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL — 6 editorial rows, full-width, that expand in place to reveal their
// description. Replaces the old bento grid of 6 tilting mini-schema cards: the
// schemas read as decoration without real meaning, and the constant per-card
// tilt/shine had no purpose beyond motion. One row opens by explicit click,
// tap or keyboard activation; hover never changes disclosure state.
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

function SignalRow({ card, index, total, open, onToggle }) {
  // Prefer the card's own localized tail (identity signals); fall back to the
  // legacy hardcoded list only if a cached content bundle lacks per-card tails.
  const tail = card.tail || SIGNAL_TAILS[index] || "";
  // On hover-capable desktops, mouseenter always fires before click (the
  // cursor has to enter the row before it can be clicked) — if click always
  // toggled, it would immediately re-close whatever hover just opened. So on
  // those devices click behaves like hover (ensures open, never closes);
  // only touch (no real hover) gets a true open/close toggle on tap.
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
      onClick={() => onToggle(index)}
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

  const cards = t.signal.cards;
  const total = cards.length;
  const pathSteps = Array.isArray(t.hero && t.hero.proof_steps)
    ? t.hero.proof_steps
    : [];

  const handleToggle = (i) => {
    setOpenIndex((prev) => {
      return prev === i ? -1 : i;
    });
  };

  return (
    <section data-section="signal" id="signal" data-enter="emerge" ref={ref}>
      <div className="shell">
        <SecHead
          num="02"
          eyebrow={t.signal.eyebrow}
          title={t.signal.title}
          em={t.signal.title.split(" ").pop()}
          meta={t.signal.meta || `${total} · signal`}
        />

        {/* The signature rail continues here, but no text auto-switches. The
            visitor controls every accordion row; motion communicates the
            product route without racing the reading pace or changing ARIA state
            behind the reader's back. */}
        <div className="signal-path">
          <span className="signal-path-label mono">{t.signal.run_idle || "10s · read the essentials"}</span>
          <ol className="signal-path-steps" aria-label={t.hero.proof_label || "Build, verify, ship"}>
            {pathSteps.map((step) => (
              <li key={`${step.code}-${step.k}`}>
                <span aria-hidden="true" />
                <strong className="mono">{step.k}</strong>
              </li>
            ))}
          </ol>
        </div>

        <div className="signal-rows">
          {cards.map((c, i) => (
            <SignalRow
              key={i}
              card={c}
              index={i}
              total={total}
              open={openIndex === i}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT — annotated maker's proof.
// This section explains ownership and judgement without duplicating the Stack
// or Projects sections. It is deliberately static: no decorative live clock,
// no GitHub telemetry and no claims that can silently change between visits.
// ─────────────────────────────────────────────────────────────────────────────


function AboutStat({ stat, index }) {
  return (
    <div className="about-stat" data-reveal data-reveal-delay={(index * 0.05).toFixed(2)}>
      <div className="about-stat-v num-tab">{stat.v}</div>
      <div className="about-stat-k mono">{stat.k}</div>
    </div>
  );
}

function About({ t }) {
  const ref = useRevealRoot([t]);
  const currentlyPhrases = t.about.currently || [];
  const route = t.about.route || [];

  return (
    <section data-section="about" id="about" data-enter="develop" ref={ref}>
      <div className="shell">
        <SecHead
          num="03"
          eyebrow={t.about.eyebrow}
          title={t.about.title}
          lines={t.about.title_lines}
          meta="maker's proof · 03"
        />

        <article className="about-proof" data-reveal>
          <header className="about-proof-rail mono">
            <span>SM / 03</span>
            <span>{t.about.proof_label}</span>
            <span className="about-proof-state"><i aria-hidden="true" />{t.about.status_short || t.about.status_label}</span>
          </header>

          <div className="about-proof-main">
            <div className="about-proof-copy">
              <span className="about-proof-kicker mono">{t.about.statement_label}</span>
              <p className="about-proof-lead">{t.about.lead}</p>
              <blockquote className="about-proof-note">{t.about.paragraphs[0]}</blockquote>
              {t.about.paragraphs.slice(1).map((paragraph, index) => (
                <p className="about-proof-paragraph" key={index}>{paragraph}</p>
              ))}
            </div>

            <div className="about-proof-route" aria-label={t.about.route_label}>
              <div className="about-proof-route-head mono">
                <span>{t.about.route_label}</span>
                <span>01—04</span>
              </div>
              <ol>
                {route.map((step, index) => (
                  <li key={`${step.k}-${index}`} style={{ "--about-i": index }}>
                    <span className="about-proof-route-index mono">0{index + 1}</span>
                    <strong>{step.k}</strong>
                    <span>{step.v}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="about-proof-facts" aria-label={t.about.facts_label}>
            <span className="about-proof-facts-label mono">{t.about.facts_label}</span>
            <div className="about-stats">
              {t.about.stats.map((stat, index) => (
                <AboutStat key={index} stat={stat} index={index} />
              ))}
            </div>
          </div>

          <div className="about-proof-focus">
            <span className="about-proof-focus-label mono">{t.about.currently_label}</span>
            <ol>
              {currentlyPhrases.slice(0, 3).map((item, index) => (
                <li key={index}>
                  <span className="mono">0{index + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <footer className="about-proof-signature mono">
            <strong>{t.about.signature}</strong>
            <span>{t.about.location}</span>
          </footer>
        </article>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTS — floating product screens
// ─────────────────────────────────────────────────────────────────────────────

// Per-project editorial still lifes — one purpose-generated image per product.
// Keyed by stable project SLUG (not display name) so a translation or a future
// title edit can never break the visual link. `bg` matches each image's own
// dominant dark tone, so the monitor chrome never shows a seam while the image
// is still lazy-loading.
// (Superseded the earlier hand-drawn SVG blueprint set, which was keyed by
// display name — that map and its 13 .svg files were removed with this change.)
const PROJ_CARD = (window.PRODUCT_REGISTRY || []).reduce((cards, product) => {
  const sourceRoot = product.image.replace(/\.webp$/i, "");
  const responsiveRoot = sourceRoot.replace(/\/([^/]+)$/, "/responsive/$1");
  cards[product.slug] = {
    src: product.image,
    srcSet: `${responsiveRoot}-768.webp 768w, ${responsiveRoot}-1152.webp 1152w, ${product.image} 1536w`,
    bg: "#1F1E1B",
    accent: product.accent || "var(--accent)",
  };
  return cards;
}, {});

function ProjectCard({ p, i, labels }) {
  const cardRef = useRef(null);
  const visualVariant = i % 4;

  // Cards that open an in-site landing get a stable anchor (id="proj-<slug>") so
  // returning from that landing lands the reader back on THIS exact card (see
  // Projects' deep-link effect + App's scroll-to-hash). onClick also drops a
  // history entry with that anchor so the browser Back button restores here too.
  const landingSlug = (p.url && p.url.indexOf("projects/") === 0)
    ? p.url.replace(/^projects\//, "").replace(/\/+$/, "")
    : null;
  const isExternal = Boolean(p.url && p.url.indexOf("http") === 0);
  const primaryLabel = isExternal ? (labels.open_live || labels.cta) : labels.cta;
  function onCtaClick(e) {
    if (!p.url) { e.preventDefault(); return; }
    if (landingSlug) {
      try { history.replaceState(null, "", "#proj-" + landingSlug); } catch (err) { /* opportunistic */ }
      // Cross-document View Transitions can be cancelled by a fast navigation
      // and surface an AbortError even when the page appears to work. The
      // shared act engine owns this hand-off instead, so there is one
      // deterministic transition and the native link remains the fallback.
      const plainPrimaryClick = !e.defaultPrevented && e.button === 0 &&
        !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
      try {
        if (plainPrimaryClick && window.__SM_ACTS && window.__SM_ACTS.navigate) {
          e.preventDefault();
          window.__SM_ACTS.navigate(p.url);
        }
      } catch (err) { /* native navigation remains available */ }
    }
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
      id={p.slug ? "proj-" + p.slug : (landingSlug ? "proj-" + landingSlug : undefined)}
      className={`proj-card card proj-visual-${visualVariant} ${i < 4 ? "proj-card--feature" : "proj-card--archive"} ${i % 2 ? "is-reverse" : ""}`}
      data-project={p.slug || undefined}
      style={{
        "--proj-i": i,
        "--proj-accent": (PROJ_CARD[p.slug] && PROJ_CARD[p.slug].accent) || "var(--accent)",
        "--proj-object-x": `${[50, 48, 52, 50][visualVariant]}%`,
      }}
    >
      <div className="proj-glow" />
      <span className="proj-num mono" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
      <div className="proj-head">
        <span className="mono proj-tag">{p.tag}</span>
        <span className={`proj-status proj-status-${String(p.status || "").toLowerCase()}`}>{p.status}</span>
      </div>
      <h3 className="proj-name">{p.name}</h3>

      <div className="proj-screen" aria-hidden="true">
        <div className="proj-screen-bar">
          <div className="proj-screen-dots"><i></i><i></i><i></i></div>
          <span className="mono">/{p.slug || p.name.toLowerCase().replace(/\s+/g, "-")}</span>
        </div>
        {PROJ_CARD[p.slug] ? (
          <div
            className="proj-screen-body proj-screen-body--img"
            data-imgfx
            style={{ background: PROJ_CARD[p.slug].bg }}
          >
            {/* Purpose-built editorial still life inside the shared project
                frame. alt="" because the frame is aria-hidden decoration and
                the card's visible content already names and explains it. */}
            <img
              className="proj-screen-img"
              src={PROJ_CARD[p.slug].src}
              srcSet={PROJ_CARD[p.slug].srcSet}
              sizes="(max-width: 900px) 87vw, (max-width: 1280px) 46vw, 590px"
              width="1536"
              height="512"
              alt=""
              // The four curated cards are already mounted while the authored
              // Intro is doing useful readiness work. Load their small mobile
              // sources now so a fast first scroll does not trigger four image
              // fetch/decode jobs inside the animation frame that reveals
              // Projects. Archive artwork stays native-lazy after expansion.
              loading={i < 4 ? "eager" : "lazy"}
              fetchPriority={i < 4 ? "low" : undefined}
              decoding="async"
              onError={(event) => {
                const image = event.currentTarget;
                image.hidden = true;
                const frame = image.parentElement;
                if (frame) frame.classList.add("is-image-fallback");
              }}
            />
          </div>
        ) : (
          <div className="proj-screen-body">
            <div className="proj-screen-row" style={{ width: "82%" }}></div>
            <div className="proj-screen-row" style={{ width: "60%" }}></div>
            <div className="proj-screen-row" style={{ width: "72%" }}></div>
            <div className="proj-screen-grid">
              {[...Array(6)].map((_, k) => <div key={k} className="proj-screen-cell" />)}
            </div>
          </div>
        )}
        {/* Scanline overlay — adds CRT-monitor texture without the pixel-
            dither overhead. CSS-driven, zero JS, GPU-composited. */}
        <div className="proj-screen-scanlines" />
      </div>

      <dl className="proj-meta">
        <div><dt className="mono">{labels.problem_label || "problem"}</dt><dd>{p.problem}</dd></div>
        <div><dt className="mono">{labels.solution_label || "solution"}</dt><dd>{p.solution}</dd></div>
        <div><dt className="mono">{labels.role_label || "role"}</dt><dd>{p.role}</dd></div>
        <div><dt className="mono">{labels.outcome_label || "outcome"}</dt><dd className="proj-outcome">{p.outcome}</dd></div>
      </dl>

      <div className="proj-stack">
        {p.stack.map((s, k) => <span key={k} className="proj-chip mono">{s}</span>)}
      </div>

      <div className="proj-actions">
        <a
          href={p.url || "#"}
          className="proj-cta mono"
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          onClick={onCtaClick}
        >
          {primaryLabel} <span className="arrow">→</span>
        </a>
        {p.github ? (
          <a
            href={p.github}
            className="proj-repo mono"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${p.githubLabel || labels.github || "GitHub"} · ${p.name}`}
          >
            {p.githubLabel || labels.github || "GitHub"} <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

// Mobile chapter-indicator: shows N dots above the project grid, highlights
// whichever card is most-in-view, taps scroll to that card. Only meaningful
// on small screens where the grid collapses to one column.
function ProjectChapterDots({ items, gridRef, labels }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const cardRefs = useRef([]);
  const dotsRef = useRef(null);
  // How many dots actually FIT. A fixed window of 7 overflowed the row on the
  // most common phone widths once the catalog expanded to 21 projects: each
  // dot carries a 44px tap area (12px pill + 2×16px padding, see the mobile
  // tap-target block in sections.css) plus an 8px gap, and the active dot is
  // 16px wider — so n dots need 52n + 8 px. At 390px that made 7 dots 372px
  // wide inside a 350px row and the last one was clipped off-screen.
  const [dotWindow, setDotWindow] = useState(5);

  useEffect(() => {
    const cards = gridRef.current
      ? Array.from(gridRef.current.querySelectorAll(".proj-card"))
          .filter((card) => getComputedStyle(card).display !== "none")
      : [];
    if (!cards.length) return undefined;
    cardRefs.current = cards;
    setActiveIdx((current) => Math.min(current, cards.length - 1));
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
  }, [gridRef, items]);

  // Re-measure on mount and on resize/orientation change. Derived from the
  // row's own clientWidth rather than a viewport breakpoint, so it stays
  // correct whatever the gutter is at that width.
  useEffect(() => {
    function measure() {
      const el = dotsRef.current;
      if (!el) return;
      const avail = el.clientWidth;
      if (!avail) return;
      const fit = Math.floor((avail - 8) / 52); // 52n + 8 <= avail
      setDotWindow(Math.max(3, Math.min(9, fit)));
    }
    measure();
    if (!("ResizeObserver" in window)) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(dotsRef.current);
    return function cleanup() { ro.disconnect(); };
  }, []);

  function onDot(i) {
    const el = cardRefs.current[i];
    // Horizontal peek-carousel: scroll the carousel sideways to center the
    // card (inline), never scroll the page vertically (block: nearest).
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  function onStep(delta) {
    const next = Math.max(0, Math.min(cardRefs.current.length - 1, activeIdx + delta));
    onDot(next);
  }

  const maxStart = Math.max(0, items.length - dotWindow);
  const windowStart = Math.max(0, Math.min(maxStart, activeIdx - Math.floor(dotWindow / 2)));
  const visibleItems = items.slice(windowStart, windowStart + dotWindow);

  return (
    <nav
      className="proj-chapters"
      aria-label={(labels && labels.list_label) || "project list"}
      style={{
        "--proj-accent": (PROJ_CARD[items[activeIdx]?.slug] && PROJ_CARD[items[activeIdx].slug].accent) || "var(--accent)",
      }}
    >
      <ol className="proj-chapters-dots" ref={dotsRef}>
        {visibleItems.map((p, localIndex) => {
          const i = windowStart + localIndex;
          return (
          <li key={p.slug || i}>
            <button
              type="button"
              className={`proj-chapters-dot ${i === activeIdx ? "is-active" : ""}`}
              aria-label={p.name}
              onClick={() => onDot(i)}
            />
          </li>
          );
        })}
      </ol>
      <div className="proj-chapters-label mono">
        <span className="proj-chapters-num">{String(activeIdx + 1).padStart(2, "0")}</span>
        <span className="proj-chapters-of">/ {String(items.length).padStart(2, "0")}</span>
        <span className="proj-chapters-name">{items[activeIdx]?.name || ""}</span>
      </div>
      <div className="proj-chapters-controls">
        <button type="button" onClick={() => onStep(-1)} disabled={activeIdx <= 0} aria-label={(labels && labels.previous_project) || "Previous project"}>←</button>
        <button type="button" onClick={() => onStep(1)} disabled={activeIdx >= items.length - 1} aria-label={(labels && labels.next_project) || "Next project"}>→</button>
      </div>
    </nav>
  );
}

function ProjectFilters({ items, active, onChange, labels }) {
  const names = (labels && labels.filters) || {};
  const options = ["all"].concat(Object.keys(names)).map((id) => {
    const count = id === "all"
      ? items.length
      : items.filter((item) => Array.isArray(item.categories) && item.categories.indexOf(id) !== -1).length;
    return { id, count, label: id === "all" ? ((labels && labels.filter_all) || "All") : names[id] };
  }).filter((option) => option.id === "all" || option.count > 0);

  return (
    <div className="proj-filter" role="group" aria-label={(labels && labels.filter_label) || "Project filter"}>
      <div className="proj-filter-head mono">
        <span>{(labels && labels.filter_label) || "Project filter"}</span>
        <span>{String(items.length).padStart(2, "0")} · 2024–26</span>
      </div>
      <div className="proj-filter-list">
        {options.map((option) => {
          const selected = active === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`proj-filter-chip mono ${selected ? "is-active" : ""}`}
              data-project-filter={option.id}
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
            >
              <span className="proj-filter-check" aria-hidden="true">{selected ? "✓" : "·"}</span>
              <span>{option.label}</span>
              <span className="proj-filter-count">{String(option.count).padStart(2, "0")}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Index row — the catalogue half of the projects section ──────────────────
// 21 identically-weighted cards read as a database dump, not a curated body of
// work. So the section splits: a few hero projects get poster treatment, and
// everything else becomes a dense typographic index — the way a studio's work
// page or a book's contents actually behaves. Nothing is hidden behind a
// archive is mounted only after explicit intent (or a deep-link return), so
// the first viewport does not pay to build twenty-two hidden records.
// The typographic index that briefly lived here — 4 poster cards followed by a
// list of 17 name/tag/status rows with a floating hover preview — is gone. It
// read as a spreadsheet: seventeen identical rows in a portfolio whose entire
// argument is that the work is varied. The section is back to ONE presentation
// for every project (a card), collapsed to the six strongest on desktop and
// expandable on intent, and a swipe carousel on mobile.
function Projects({ t }) {
  const ref = useRevealRoot([t]);
  const gridRef = useRef(null);
  const items = t.projects.items;
  // Six strongest product families lead the section on every viewport. The
  // complete catalog expands on intent; mobile keeps its swipe carousel, but
  // nobody has to swipe through 21 cards just to leave the block.
  const FEATURED_PROJECT_COUNT = 6;
  const [isMobileCatalog, setIsMobileCatalog] = useState(() => (
    typeof window.matchMedia === "function" && window.matchMedia("(max-width: 900px)").matches
  ));
  const [activeFilter, setActiveFilter] = useState("all");
  // Resolve a returning case-page anchor synchronously. Waiting for an effect
  // leaves the requested card display:none during the browser's native anchor
  // resolution and is especially unreliable on mobile under CPU pressure.
  const [expanded, setExpanded] = useState(() => {
    const id = (window.location.hash || "").replace(/^#/, "");
    if (id.indexOf("proj-") !== 0) return false;
    const slug = id.slice(5);
    return items.findIndex((p) => p.slug === slug) >= FEATURED_PROJECT_COUNT;
  });
  const hiddenCount = Math.max(0, items.length - FEATURED_PROJECT_COUNT);
  const filteredItems = activeFilter === "all"
    ? items
    : items.filter((item) => Array.isArray(item.categories) && item.categories.indexOf(activeFilter) !== -1);
  // Mobile is the complete catalogue by design: all products are mounted
  // immediately and the filter reduces the filmstrip without hiding the rest
  // behind an expansion command. Desktop keeps a curated six-card opening.
  const chapterItems = isMobileCatalog
    ? filteredItems
    : (expanded ? items : items.slice(0, FEATURED_PROJECT_COUNT));
  const catalogUnit = t.projects.catalog_unit || "products";

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(max-width: 900px)");
    function applyLayout() {
      setIsMobileCatalog(query.matches);
      if (!query.matches) setActiveFilter("all");
    }
    applyLayout();
    if (query.addEventListener) query.addEventListener("change", applyLayout);
    else if (query.addListener) query.addListener(applyLayout);
    return function cleanup() {
      if (query.removeEventListener) query.removeEventListener("change", applyLayout);
      else if (query.removeListener) query.removeListener(applyLayout);
    };
  }, []);

  function changeProjectFilter(nextFilter) {
    setActiveFilter(nextFilter);
    requestAnimationFrame(() => {
      if (gridRef.current) gridRef.current.scrollTo({ left: 0, behavior: "auto" });
    });
  }

  // Deep-link: arriving at #proj-<slug> (returning from that product's landing)
  // for a card the collapsed desktop grid hides (index >= 6) → expand the grid
  // so App's scroll-to-hash can actually reach it. Runs once on mount.
  useEffect(() => {
    const id = (window.location.hash || "").replace(/^#/, "");
    if (id.indexOf("proj-") !== 0) return;
    const slug = id.slice(5);
    const idx = items.findIndex((p) => p.slug === slug);
    if (idx >= FEATURED_PROJECT_COUNT) setExpanded(true);
  }, [items]);

  // A focused action must stay inside the real reading window, not merely the
  // layout viewport. On a short landscape phone the fixed navigation and the
  // command dock remove a meaningful slice from both edges; after a rotation,
  // native focus scrolling may otherwise settle a card CTA behind the dock.
  // Run on the next frame so this correction wins after the browser's own
  // focus scroll and after any just-completed breakpoint reflow.
  function keepProjectFocusVisible(event) {
    const control = event.target && event.target.closest
      ? event.target.closest(".proj-cta, .proj-repo, .proj-expand, .proj-chapters button, .proj-filter-chip")
      : null;
    if (!control) return;
    function alignFocusedProjectControl() {
      if (!control.isConnected || document.activeElement !== control) return;
      const nav = document.querySelector(".nav");
      const dock = document.querySelector(".mobile-dock.is-visible");
      const navRect = nav ? nav.getBoundingClientRect() : null;
      const dockRect = dock && getComputedStyle(dock).display !== "none"
        ? dock.getBoundingClientRect()
        : null;
      const topBoundary = Math.max(0, navRect ? navRect.bottom : 0) + 12;
      const bottomBoundary = Math.min(window.innerHeight, dockRect ? dockRect.top : window.innerHeight) - 12;
      const rect = control.getBoundingClientRect();
      if (rect.top >= topBoundary && rect.bottom <= bottomBoundary) return;
      const targetTop = topBoundary + Math.max(0, (bottomBoundary - topBoundary - rect.height) / 2);
      const root = document.documentElement;
      const previous = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      try {
        window.scrollTo({ top: Math.max(0, window.scrollY + rect.top - targetTop), behavior: "auto" });
      } finally {
        root.style.scrollBehavior = previous;
      }
    }
    alignFocusedProjectControl();
    if (typeof queueMicrotask === "function") queueMicrotask(alignFocusedProjectControl);
    requestAnimationFrame(alignFocusedProjectControl);
  }

  return (
    <section data-section="projects" id="projects" data-enter="rise" ref={ref} onFocusCapture={keepProjectFocusVisible}>
      <div className="shell">
        <SecHead num="04" eyebrow={t.projects.eyebrow} title={t.projects.title} meta={`${items.length} ${catalogUnit} · 2024–26`} />

        <ProjectFilters items={items} active={activeFilter} onChange={changeProjectFilter} labels={t.projects} />

        {/* On touch the chapter rail belongs before the filmstrip: orientation
            is available before the first swipe and never ends up below a tall
            card. CSS keeps it out of the desktop composition. */}
        <ProjectChapterDots items={chapterItems} gridRef={gridRef} labels={t.projects} />

        <div className={`proj-grid ${(isMobileCatalog || expanded) ? "is-expanded" : "is-collapsed"}`} ref={gridRef}>
          {chapterItems.map((p) => {
            const catalogIndex = items.findIndex((item) => item.slug === p.slug);
            return <ProjectCard key={p.slug} p={p} i={catalogIndex} labels={t.projects} />;
          })}
        </div>

        {!isMobileCatalog && hiddenCount > 0 ? (
          <button
            type="button"
            className="proj-expand mono"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            data-cursor="link"
            data-cursor-label={expanded ? "collapse" : "show all"}
          >
            <span className="proj-expand-txt">
              {/* `!= null` rather than `||`: the RU suffix is deliberately an
                  EMPTY string ("Показать ещё 17"), and `"" || " more"` falls
                  through to the English fallback — which is exactly how the
                  button ended up reading "Показать ещё 17 more" in Russian. */}
              {expanded
                ? (t.projects.collapse || "Collapse")
                : `${t.projects.more_prefix != null ? t.projects.more_prefix : "Show "}${hiddenCount}${t.projects.more_suffix != null ? t.projects.more_suffix : " more"}`}
            </span>
            <span className="proj-expand-ico" aria-hidden="true">{expanded ? "↑" : "↓"}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILLS — THE MATRIX
//
// What was here: an SVG radar dish with six spokes, a sweeping scan triangle,
// three stacked depth layers and a cursor-driven parallax loop, wired to a tab
// strip on desktop and an accordion on mobile. About 350 lines, one rAF loop
// running whenever the section existed, and — the actual problem — it showed
// you SIX TOOLS AT A TIME. A stack is a claim about breadth; a widget that
// reveals it one sixth at a time is arguing against its own content, and it
// spent a radar's worth of machinery to do it. Radar sweeps are also the single
// most over-used "technical" ornament on developer portfolios.
//
// This shows all thirty-one tools at once, as type. No tabs, no accordion, no
// panel to route through: the whole stack is one wall you read in a glance.
// Hovering a row is the entire interaction — that row comes forward, the rest
// recede — which is a reading aid, not a gate.
//
// QA IS NOT THE SIXTH GROUP. It was listed as a peer of Frontend and Backend,
// which quietly said "one of the six things I do". The positioning it should
// carry is that quality is a layer over all the others, so it is drawn as one:
// a full-width band across the top of the matrix, with an accent spine running
// down the left of every row beneath it. Same data, correct claim.
// ─────────────────────────────────────────────────────────────────────────────

function SkillsRow({ group, index, active, onEnter }) {
  return (
    <div
      className={`skx-row${active ? " is-active" : ""}`}
      style={{ "--row-i": index }}
      data-reveal
      data-reveal-from="translateY(20px)"
      data-reveal-delay={(index * 0.05).toFixed(2)}
      onMouseEnter={onEnter}
      onFocus={onEnter}
      tabIndex={0}
    >
      <div className="skx-key">
        <span className="mono skx-num">/{String(index + 1).padStart(2, "0")}</span>
        <span className="skx-name">{group.k}</span>
      </div>
      <div className="skx-items">
        {group.items.map((it, i) => (
          <span key={i} className="skx-item" style={{ "--item-i": i }}>{it}</span>
        ))}
      </div>
    </div>
  );
}

function Skills({ t }) {
  const ref = useRevealRoot([t]);
  // Which row is under the pointer. -1 (nothing) is the resting state and is
  // deliberately reachable: with no row active every row reads at full
  // strength, so the section's default is "all of it", not "one of it".
  const [active, setActive] = useState(-1);

  const groups = t.skills.groups || [];
  // The QA group is pulled out by slug rather than by position: content.js
  // orders it last today, but that is a content decision and this is a
  // structural one — reordering the list must not silently demote QA back to
  // being a peer row.
  const qa = groups.find((g) => g.slug === "qa");
  const rows = groups.filter((g) => g.slug !== "qa");

  return (
    <section data-section="skills" id="skills" data-enter="converge" ref={ref}>
      <div className="shell">
        <SecHead num="06" eyebrow={t.skills.eyebrow} title={t.skills.title} meta="stack.matrix" />
        <p className="lead-line" data-reveal>{t.skills.lead}</p>

        <div
          className={`skx${active >= 0 ? " is-focused" : ""}`}
          onMouseLeave={() => setActive(-1)}
        >
          {qa ? (
            <div className="skx-qa" data-reveal data-reveal-from="translateY(16px)">
              <div className="skx-qa-head">
                <span className="skx-qa-name">{qa.k}</span>
                <span className="mono skx-qa-note">{t.skills.qa_note || "across everything"}</span>
              </div>
              <div className="skx-items skx-items--qa">
                {qa.items.map((it, i) => (
                  <span key={i} className="skx-item" style={{ "--item-i": i }}>{it}</span>
                ))}
              </div>
            </div>
          ) : null}

          {/* The spine — a single accent hairline dropping out of the QA band
              and running the full height of the rows below it. This is the
              whole "layer over everything" claim, made with one pseudo-element
              instead of a paragraph asking the reader to believe it. */}
          <div className="skx-rows">
            {rows.map((g, i) => (
              <SkillsRow
                key={g.slug || i}
                group={g}
                index={i}
                active={active === i}
                onEnter={() => setActive(i)}
              />
            ))}
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
