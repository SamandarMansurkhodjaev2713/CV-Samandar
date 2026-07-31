// components.jsx — Section components for the Executive AI Code Lab portfolio
// Each section consumes the current i18n bundle (`t`) and renders its slice.

const { useEffect, useRef, useState, useMemo } = React;

// ── Reveal hook — just returns ref; delays set inline in JSX
function useRevealRoot(deps) {
  const rootRef = useRef(null);
  return rootRef;
}

// ── Reusable section header
function SecHead({ num, eyebrow, title, meta, em, titleId }) {
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
    // data-reveal-from="none": the head itself only FADES in — all the motion
    // belongs to the line-mask below (title slides out from under an invisible
    // mask, cinema-titles style). Without this the reveal engine would ALSO
    // translate the whole block 48px and the two movements would fight.
    <header className="sec-head" data-reveal data-reveal-from="none" data-plx="0.045">
      <div>
        <div className="num">{num ? <>{num} · </> : null}{eyebrow}</div>
        <h2 id={titleId} style={{ marginTop: 14 }}>
          <span className="lm"><span className="lm-i">{titleNode}</span></span>
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

// One masked, depth-planed span per letter. `--l-i` drives the entrance
// stagger; `--hd` the pointer lean. The arc (0 at the centre of the word, 1 at
// its ends) is what makes the lean read as a curved surface rather than a
// uniform slide — a uniform one would just be the whole word moving, which is
// exactly the "sticker" effect this is avoiding.
function heroLetters(word, depthScale) {
  const n = word.length;
  const mid = (n - 1) / 2;
  return word.split("").map((ch, i) => (
    <span
      key={i}
      className="hn-l"
      style={{
        "--l-i": i,
        "--hd": ((0.3 + (mid > 0 ? Math.abs(i - mid) / mid : 0) * 1.1) * depthScale).toFixed(2),
      }}
    >
      <span className="hn-i">{ch}</span>
    </span>
  ));
}

// The role lines get the same per-character treatment, for one reason that has
// nothing to do with animation: on mobile they are set flush to both margins,
// and CSS cannot do that to a single word.
//
// `text-align-last: justify` was the obvious first answer and it is a trap —
// justification distributes slack at word boundaries, so "FULL-STACK" (no
// spaces at all) does not move a pixel, and "AI AUTOMATION" opens one grotesque
// canyon at its single space instead of spreading. Measured: the first line
// stopped 12px short of the margin, the others "justified" into two words at
// opposite ends of the screen.
//
// Characters in a `justify-content: space-between` row distribute the slack
// evenly, which is what tracking-to-fit actually means. No mask or depth plane
// here — these are supporting lines, and on desktop the spans simply flow back
// inline as ordinary text.
function spreadChars(text) {
  return text.split("").map((ch, i) =>
    ch === " "
      ? <span className="hr-sp" key={i}>&nbsp;</span>
      : <span className="hr-c" key={i}>{ch}</span>
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

  // Hero depth consumes the shared motion runtime. It never owns scroll,
  // pointer or resize listeners and never creates a private animation loop.
  // The semantic frame remains fully readable when the runtime is absent,
  // reduced or parked on a low tier.
  useEffect(() => {
    const heroEl = document.getElementById("hero");
    const runtime = window.__SM_MOTION_RUNTIME;
    if (!heroEl || !runtime || typeof runtime.subscribe !== "function") return undefined;
    const state = { rect: null, hx: 0, hy: 0, fieldX: 0, fieldY: 0 };
    const unsubscribe = runtime.subscribe({
      id: "hero-depth-field",
      priority: 34,
      measure(context) {
        if (context.input.scrolled || context.input.resized || context.input.pointerMoved || !state.rect) {
          state.rect = heroEl.getBoundingClientRect();
        }
      },
      compute(context) {
        const rect = state.rect;
        const active = rect && rect.bottom > 0 && rect.top < context.input.viewportHeight;
        const canLean = active && !context.policy.reducedMotion && context.policy.tier !== "low" &&
          context.policy.pointerClass === "fine" && context.input.pointerActive;
        state.hx = canLean ? (context.input.pointerX / Math.max(1, context.input.viewportWidth) - 0.5) : 0;
        state.hy = canLean ? (context.input.pointerY / Math.max(1, context.input.viewportHeight) - 0.5) : 0;
        const progress = active && rect ? Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height))) : 0;
        state.fieldX = state.hx * 10;
        state.fieldY = progress * 24 + state.hy * 8;
      },
      mutate() {
        heroEl.style.setProperty("--hx", state.hx.toFixed(3));
        heroEl.style.setProperty("--hy", state.hy.toFixed(3));
        heroEl.style.setProperty("--hero-field-x", state.fieldX.toFixed(1) + "px");
        heroEl.style.setProperty("--hero-field-y", state.fieldY.toFixed(1) + "px");
      },
      dispose() {
        heroEl.style.removeProperty("--hx");
        heroEl.style.removeProperty("--hy");
        heroEl.style.removeProperty("--hero-field-x");
        heroEl.style.removeProperty("--hero-field-y");
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
  const proofSteps = Array.isArray(t.hero.proof_steps) && t.hero.proof_steps.length
    ? t.hero.proof_steps
    : [
        { code: "01", k: "BUILD", v: "full-stack" },
        { code: "02", k: "VERIFY", v: "QA" },
        { code: "03", k: "SHIP", v: "production" },
      ];

  // Mobile roles are justified character-by-character, so a font size chosen
  // from character count alone breaks as soon as a locale contains wider
  // glyphs. Fit the actual loaded Oswald metrics to the available line width.
  // This runs under the intro curtain on first load and again after a language
  // switch; the conservative CSS fallback keeps the pre-fit frame contained.
  useEffect(() => {
    const heroEl = document.getElementById("hero");
    if (!heroEl) return undefined;
    let cancelled = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    function fitRoles() {
      if (cancelled || !ctx || !window.matchMedia("(max-width: 900px)").matches) return;
      const list = heroEl.querySelector(".hero-roles");
      if (!list) return;
      const available = list.clientWidth;
      if (!available) return;
      list.querySelectorAll(".hero-role").forEach((role) => {
        const copy = role.querySelector(".a11y-only");
        const text = (copy ? copy.textContent : role.textContent || "").toUpperCase();
        const family = getComputedStyle(role).fontFamily;
        ctx.font = `600 100px ${family}`;
        let units = 0;
        for (const ch of text) units += /\s/.test(ch) ? 16 : ctx.measureText(ch).width;
        if (!units) return;
        const cap = Math.min(76, window.innerWidth * 0.188);
        const fitted = Math.max(30, Math.min(cap, (available * 0.985 * 100) / units));
        role.style.setProperty("--role-size", `${fitted.toFixed(2)}px`);
      });
    }

    const list = heroEl.querySelector(".hero-roles");
    fitRoles();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitRoles);
    const ro = list && "ResizeObserver" in window ? new ResizeObserver(fitRoles) : null;
    if (ro) ro.observe(list);
    return () => {
      cancelled = true;
      if (ro) ro.disconnect();
    };
  }, [t]);

  return (
    <section
      data-section="hero" id="hero" className={`hero${lit ? " is-lit" : ""}`} ref={ref}
    >
      {/* A material calibration field, not borrowed sci-fi imagery. The three
          physical checkpoints echo the Build → Verify → Ship proof rail while
          the angled slab gives the full-bleed type real depth. Everything is
          CSS-native, so frame zero and reduced motion stay equally complete. */}
      <div className="hero-material-field" aria-hidden="true">
        <span className="hero-material-plane" />
        <span className="hero-material-cut" />
        <span className="hero-material-spine"><i /><i /><i /></span>
      </div>
      <div className="hero-seam" aria-hidden="true" />

      {/* Four horizontal bands, top to bottom: identification, the masthead,
          the roles rule, the action row. The masthead is the only one that
          escapes `.shell` — it runs to the viewport edges, because a name that
          stops at a content margin is a heading, and a name that reaches the
          edges is a masthead. */}
      <div className="hero-stack">
        <div className="shell hero-band hero-band--top">
          <span className="eyebrow">{t.hero.eyebrow}</span>
          <span className="hero-status">
            <span className="status-dot" />
            <span className="mono">{t.hero.status}</span>
          </span>
        </div>

        {/* aria-label carries the name as one readable string — the letters are
            individual spans for the animation, and a screen reader walking 22
            of them would spell the name out loud. */}
        <h1 className="hero-name" aria-label={`${HERO_GIVEN} ${HERO_FAMILY}`}>
          <span className="hn-line hn-line--given" aria-hidden="true">{heroLetters(HERO_GIVEN, 1)}</span>
          <span className="hn-line hn-line--family" aria-hidden="true">{heroLetters(HERO_FAMILY, 0.55)}</span>
        </h1>

        <div className="shell hero-band hero-band--rule">
          <p className="hero-roles">
            {roles.map((r, i) => (
              <React.Fragment key={i}>
                {i ? <i className="hero-roles-sep" aria-hidden="true">/</i> : null}
                {/* The visible text is one span per character, which a screen
                    reader on the mobile layout would spell out letter by
                    letter (each char is a flex item there, i.e. its own text
                    run). So the characters are hidden from the a11y tree and
                    a plain, off-screen copy of the string carries the meaning. */}
                <span
                  className="hero-role"
                  style={{ "--role-size": "12vw" }}
                >
                  <span className="a11y-only">{r}</span>
                  <span className="hero-role-ink" aria-hidden="true">{spreadChars(r)}</span>
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
          <p className="hero-tagline">{t.hero.tagline}</p>
          <div className="hero-ctas">
            <a
              href="#contact" className="btn btn-primary" data-magnetic
              data-cursor="send" data-cursor-label="send → contact"
              onMouseEnter={onCtaFocus} onMouseLeave={onCtaBlur}
              onFocus={onCtaFocus} onBlur={onCtaBlur}
              >
                <span className="btn-label">{t.hero.cta_primary}</span>
                <span className="arrow">→</span>
              </a>
              <a href="#projects" className="btn btn-ghost" data-magnetic data-cursor="link" data-cursor-label="→ projects">
                <span className="btn-label">{t.hero.cta_secondary}</span>
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


function AboutStat({ stat, index }) {
  return (
    <div className="about-stat" data-reveal data-reveal-delay={(index * 0.05).toFixed(2)}>
      <div className="about-stat-v num-tab">{stat.v}</div>
      <div className="about-stat-k mono">{stat.k}</div>
    </div>
  );
}

const TECH_CHIPS = ["TypeScript", "React", "Next.js", "Node.js", "Postgres", "OpenAI", "Anthropic", "LangChain", "n8n", "Three.js", "Telegram Bot", "Docker"];

// Coarse relative age for the "last push" read-out. Coarse on purpose: a
// minute-accurate figure invites the reader to watch it tick, which is not what
// this line is for — it exists to say "the account is alive", once.
// The unit strings carry their own "ago" per locale (RU " ч назад", EN "h ago"),
// because appending a hardcoded English "ago" to a localised unit produced
// exactly the tell it was meant to avoid: "last push 21 ч ago".
function relativeAge(ts, words) {
  const w = words || {};
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return w.now || "today";
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}${w.h || "h ago"}`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}${w.d || "d ago"}`;
  return `${Math.round(days / 30)}${w.mo || "mo ago"}`;
}

function About({ t }) {
  const ref = useRevealRoot([t]);
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [clock, setClock] = useState(() => formatTashkentTime(new Date()));
  // null until the GitHub fetch resolves, and null forever if it fails. The
  // section renders its static copy in that case — never a synthetic graph.
  const [gh, setGh] = useState(null);
  const currentlyPhrases = t.about.currently || [];

  // Section-in-view only controls time-sensitive telemetry. Static content is
  // present in frame zero; the clock sleeps while About is off-screen.
  useEffect(() => {
    if (!cardRef.current) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        setIsVisible(e.isIntersecting);
      });
    }, { threshold: [0, 0.15] });
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, []);

  // Tashkent clock — ticks once per second. Uses fixed UTC+5 offset.
  useEffect(() => {
    if (!isVisible) return undefined;
    setClock(formatTashkentTime(new Date()));
    const id = setInterval(() => setClock(formatTashkentTime(new Date())), 1000);
    return () => clearInterval(id);
  }, [isVisible]);

  // Live GitHub telemetry. Fired on mount rather than on scroll-into-view: the
  // request is two cached GETs against a CDN, it costs nothing to have the
  // answer ready before the reader arrives, and deferring it would mean the
  // activity strip pops in under their eyes instead of already being there.
  // Resolves to null on any failure — see src/engine/gh.js.
  useEffect(() => {
    let alive = true;
    if (!window.__SM_GH) return undefined;
    window.__SM_GH.load().then(function (data) { if (alive && data) setGh(data); });
    return function () { alive = false; };
  }, []);


  const recentItems = t.about.recent || [];
  const statusLabel = t.about.status_label || "Available";
  const currentlyLabel = t.about.currently_label || "Currently";
  const recentLabel = t.about.recent_label || "Recent work";
  const contribLabel = t.about.contrib_label || "Public activity · 28 days";
  const ghStats = t.about.gh_stats || "";
  const ghWords = t.about.gh || {};

  return (
    <section data-section="about" id="about" data-enter="develop" ref={ref}>
      <div className="shell">
        <SecHead num="03" eyebrow={t.about.eyebrow} title={t.about.title} meta="readme.md" />

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

          {/* Current focus — stable, truthful and readable without waiting for
              a typewriter loop to reveal the rest of the sentence. */}
          <div className="about-currently mono">
            <span className="about-currently-key">{currentlyLabel}:</span>
            <ul className="about-currently-list">
              {currentlyPhrases.slice(0, 3).map((item, index) => (
                <li key={index} className="about-currently-val">{item}</li>
              ))}
            </ul>
          </div>

          {/* Stats counters */}
          <div className="about-stats">
            {t.about.stats.map((s, i) => (
              <AboutStat key={i} stat={s} index={i} />
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

          {/* ── LIVE ACTIVITY ────────────────────────────────────────────
              Real GitHub public events, 28 daily buckets — see src/engine/gh.js
              for why this is events rather than the contribution calendar, and
              for the rate-limit / offline behaviour.

              The thing that used to be here was a 7×28 grid of deterministic
              pseudo-random cells with a timer flashing random ones to make it
              look live. It was decoration in the exact shape of a factual
              claim. When the fetch fails there is no graph at all — falling
              back to the synthetic one would reintroduce precisely the problem
              this replaced. */}
          {gh && gh.days ? (
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
                className="about-contrib-grid about-contrib-grid--days"
                style={{ gridTemplateColumns: `repeat(${gh.days.length}, 1fr)` }}
                aria-hidden="true"
              >
                {gh.days.map((d, idx) => (
                  <span
                    key={idx}
                    className="about-contrib-cell"
                    data-level={d.level}
                    style={{ animationDelay: `${idx * 26}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Instrument strip — the live read-out under the activity. Every
              figure here is fetched, not written: repo count, events in the
              window, and how long ago the last public push landed. */}
          <div className="about-gh-stats mono">
            {gh ? (
              <>
                <span className="about-gh-live"><span className="about-gh-dot" />github</span>
                {gh.repos != null ? <span>{gh.repos} {ghWords.repos || "public repos"}</span> : null}
                <span>{gh.events} {ghWords.events || "events / 28d"}</span>
                {gh.lastPush ? <span>{ghWords.push || "last push"} {relativeAge(gh.lastPush, ghWords)}</span> : null}
              </>
            ) : ghStats ? (
              <span>{ghStats}</span>
            ) : null}
          </div>
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

// Per-project cinematic 3D dioramas — one purpose-generated image per product.
// Keyed by stable project SLUG (not display name) so a translation or a future
// title edit can never break the visual link. `bg` matches each image's own
// dominant dark tone, so the monitor chrome never shows a seam while the image
// is still lazy-loading.
// (Superseded the earlier hand-drawn SVG blueprint set, which was keyed by
// display name — that map and its 13 .svg files were removed with this change.)
const PROJ_CARD = (window.PRODUCT_REGISTRY || []).reduce((cards, product) => {
  cards[product.slug] = {
    src: product.image,
    bg: "#1F1E1B",
    accent: product.accent || "var(--accent)",
  };
  return cards;
}, {});

function ProjectCard({ p, i, labels }) {
  const cardRef = useRef(null);

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
      // Cross-document morph: name this card's image the same thing the landing
      // names ITS hero image, and the browser tweens between them across the
      // navigation. The name is assigned only at click time so that 21 cards
      // never carry 21 live transition names at once (duplicate names on one
      // page abort the transition entirely). Browsers without cross-document
      // view transitions simply navigate — nothing to detect, nothing to break.
      try {
        const img = e.currentTarget.closest(".proj-card");
        const target = img && img.querySelector(".proj-screen-body--img, .proj-screen-img");
        if (target) target.style.viewTransitionName = "lp-hero-" + landingSlug;
      } catch (err) { /* opportunistic */ }
      // Belt and braces for the browsers that DON'T morph: run the same
      // instrument-hatch shutter the act changes use, so the jump is never a
      // bare white flash.
      try { if (window.__SM_ACTS && window.__SM_ACTS.shutter) window.__SM_ACTS.shutter(); } catch (err) { /* opportunistic */ }
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
      className="proj-card card"
      // Alternating parallax rates. The two desktop columns are already offset
      // vertically in CSS; this makes the offset LIVE — the left column lags
      // the scroll, the right column leads it, so the pair drifts apart and
      // back as you move instead of sitting in a fixed staggered grid. Signs
      // are opposite on purpose: same-sign values at different magnitudes read
      // as "one column is slightly broken", opposite signs read as depth.
      // motion.js writes --plx from this; the card's own transform composes it
      // with the card's CSS hover/focus states (see sections.css).
      data-plx={i % 2 === 0 ? "0.05" : "-0.03"}
      style={{ "--proj-i": i, "--proj-accent": (PROJ_CARD[p.slug] && PROJ_CARD[p.slug].accent) || "var(--accent)" }}
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
            {/* Purpose-built 3D product diorama inside the shared monitor
                chrome. alt="" because the frame is aria-hidden decoration and
                the card's visible content already names and explains it. */}
            <img
              className="proj-screen-img"
              src={PROJ_CARD[p.slug].src}
              alt=""
              loading="lazy"
              decoding="async"
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
        <div><dt className="mono">problem</dt><dd>{p.problem}</dd></div>
        <div><dt className="mono">solution</dt><dd>{p.solution}</dd></div>
        <div><dt className="mono">role</dt><dd>{p.role}</dd></div>
        <div><dt className="mono">outcome</dt><dd className="proj-outcome">{p.outcome}</dd></div>
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
            aria-label={`${labels.github || "GitHub"} · ${p.name}`}
          >
            {labels.github || "GitHub"} <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

// Mobile chapter-indicator: shows N dots above the project grid, highlights
// whichever card is most-in-view, taps scroll to that card. Only meaningful
// on small screens where the grid collapses to one column.
function ProjectChapterDots({ items, gridRef, label }) {
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
    <nav className="proj-chapters" aria-label={label || "project list"}>
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
        <button type="button" onClick={() => onStep(-1)} disabled={activeIdx <= 0} aria-label="Previous project">←</button>
        <button type="button" onClick={() => onStep(1)} disabled={activeIdx >= items.length - 1} aria-label="Next project">→</button>
      </div>
    </nav>
  );
}

// ── Index row — the catalogue half of the projects section ──────────────────
// 21 identically-weighted cards read as a database dump, not a curated body of
// work. So the section splits: a few hero projects get poster treatment, and
// everything else becomes a dense typographic index — the way a studio's work
// page or a book's contents actually behaves. Nothing is hidden behind a
// "show more" button any more: every project is in the DOM, indexable and
// reachable by deep link, which also makes the return-to-card flow trivial.
// The typographic index that briefly lived here — 4 poster cards followed by a
// list of 17 name/tag/status rows with a floating hover preview — is gone. It
// read as a spreadsheet: seventeen identical rows in a portfolio whose entire
// argument is that the work is varied. The section is back to ONE presentation
// for every project (a card), collapsed to the four strongest on desktop and
// expandable on intent, and a swipe carousel on mobile.
function Projects({ t }) {
  const ref = useRevealRoot([t]);
  const gridRef = useRef(null);
  const items = t.projects.items;
  // Four strongest product families lead the section on every viewport. The
  // complete catalog expands on intent; mobile keeps its swipe carousel, but
  // nobody has to swipe through 21 cards just to leave the block.
  const FEATURED_PROJECT_COUNT = 4;
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
  const chapterItems = expanded ? items : items.slice(0, FEATURED_PROJECT_COUNT);

  // Deep-link: arriving at #proj-<slug> (returning from that product's landing)
  // for a card the collapsed desktop grid hides (index >= 4) → expand the grid
  // so App's scroll-to-hash can actually reach it. Runs once on mount.
  useEffect(() => {
    const id = (window.location.hash || "").replace(/^#/, "");
    if (id.indexOf("proj-") !== 0) return;
    const slug = id.slice(5);
    const idx = items.findIndex((p) => p.slug === slug);
    if (idx >= FEATURED_PROJECT_COUNT) setExpanded(true);
  }, [items]);

  return (
    <section data-section="projects" id="projects" data-enter="rise" ref={ref}>
      <div className="shell">
        <SecHead num="04" eyebrow={t.projects.eyebrow} title={t.projects.title} meta={`${items.length} cases · 2024–26`} />
        <div className={`proj-grid ${expanded ? "is-expanded" : "is-collapsed"}`} ref={gridRef}>
          {items.map((p, i) => <ProjectCard key={p.slug || i} p={p} i={i} labels={t.projects} />)}
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

        {/* Mobile-only carousel pager (CSS hides it on desktop). */}
        <ProjectChapterDots items={chapterItems} gridRef={gridRef} label={t.projects.list_label} />
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
