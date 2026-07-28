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
    // data-reveal-from="none": the head itself only FADES in — all the motion
    // belongs to the line-mask below (title slides out from under an invisible
    // mask, cinema-titles style). Without this the reveal engine would ALSO
    // translate the whole block 48px and the two movements would fight.
    <header className="sec-head" data-reveal data-reveal-from="none" data-plx="0.045">
      <div>
        <div className="num">{num ? <>{num} · </> : null}{eyebrow}</div>
        <h2 style={{ marginTop: 14 }}>
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

  // ── Hero as ONE scene ────────────────────────────────────────────────────
  // The pointer drives a single depth field: every letter, the roles rule and
  // the tagline read the same --hx/--hy, each at its own --hd multiplier.
  // Written straight to CSS custom properties on the section: no React state,
  // so pointer movement never triggers a re-render of the most expensive
  // component on the page. rAF-throttled; skipped entirely on touch (no hover)
  // and under reduced-motion.
  const heroFxRef = useRef({ raf: 0, x: 0, y: 0 });
  function writeHeroDepth(el, nx, ny) {
    el.style.setProperty("--hx", nx.toFixed(3));
    el.style.setProperty("--hy", ny.toFixed(3));
  }
  function onHeroMove(e) {
    if (e.pointerType === "touch") return;
    const el = e.currentTarget;
    const st = heroFxRef.current;
    const r = el.getBoundingClientRect();
    st.x = (e.clientX - r.left) / r.width - 0.5;   // -0.5 … 0.5
    st.y = (e.clientY - r.top) / r.height - 0.5;
    if (st.raf) return;
    st.raf = requestAnimationFrame(() => { st.raf = 0; writeHeroDepth(el, st.x, st.y); });
  }
  function onHeroLeave(e) {
    const el = e.currentTarget;
    const st = heroFxRef.current;
    if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
    writeHeroDepth(el, 0, 0); // CSS transitions the scene back to rest
  }
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
    const curtain = window.__SM_INTRO && window.__SM_INTRO.panel;
    if (!curtain || !curtain.parentNode) { setLit(true); return undefined; }
    let fired = false;
    const light = () => { if (fired) return; fired = true; setLit(true); };
    window.addEventListener("sm:intro-done", light);
    const backstop = window.setTimeout(light, 4200);
    return () => {
      window.removeEventListener("sm:intro-done", light);
      window.clearTimeout(backstop);
    };
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

  // The roles were an <h1> of three stacked lines ("Full-stack." / "AI
  // Automation." / "Product Engineer."). The name is the <h1> now, so these
  // become a single tracked rule under it — one horizontal line of small mono
  // on desktop, three edge-to-edge display lines on mobile (see .hero-roles).
  // Trailing full stops are dropped: they belonged to the stacked reading and
  // read as noise inside a slash-separated rule.
  const roles = (t.hero.title_lines || []).map((s) => s.replace(/\.\s*$/, ""));

  return (
    <section
      data-section="hero" id="hero" className={`hero${lit ? " is-lit" : ""}`} ref={ref}
      onPointerMove={onHeroMove}
      onPointerLeave={onHeroLeave}
    >
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
                <span className="hero-role">
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
              {t.hero.cta_primary}
              <span className="arrow">→</span>
            </a>
            <a href="#projects" className="btn btn-ghost" data-magnetic data-cursor="link" data-cursor-label="→ projects">
              {t.hero.cta_secondary}
              <span className="arrow">↘</span>
            </a>
          </div>
        </div>
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
  // Prefer the card's own localized tail (identity signals); fall back to the
  // legacy hardcoded list only if a cached content bundle lacks per-card tails.
  const tail = card.tail || SIGNAL_TAILS[index] || "";
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

// The section's eyebrow has always read "10-second signal". It was a figure of
// speech attached to a static accordion — the one thing on the page that made a
// concrete promise and then didn't keep it. Now it is literal: arriving in the
// section starts a real ten-second run that opens each of the six reasons in
// turn, roughly 1.6s apart, with a hairline counting the ten seconds down. Read
// nothing, do nothing, and you still get every reason inside ten seconds.
//
// It yields immediately and permanently to the reader. Any hover, focus or tap
// cancels the run for good — a timer that fights you for control of what you
// are reading is worse than no timer. It also only ever runs once, and only
// while the section is actually on screen (an IntersectionObserver gate), so
// scrolling back never restarts a show you already sat through.
const SIGNAL_RUN_MS = 10000;

function Signal({ t }) {
  const ref = useRevealRoot([t]);
  // -1 = nothing open. Hover/focus opens the hovered row and "sticks" (doesn't
  // reset on mouse-leave) until another row is hovered or the open one is
  // clicked. Click/tap toggles (accordion behavior on touch — see SignalRow's
  // hasHover branching for why desktop click doesn't use the toggle path).
  const [openIndex, setOpenIndex] = useState(-1);
  // "idle" before the section is reached, "running" during the ten seconds,
  // "done" once it finishes or the reader takes over. Drives the countdown
  // hairline and the state read-out beside it.
  const [runState, setRunState] = useState("idle");
  const timersRef = useRef([]);
  const hasHoverRef = useRef(null);
  if (hasHoverRef.current === null) {
    hasHoverRef.current = typeof window.matchMedia === "function"
      && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  const cards = t.signal.cards;
  const total = cards.length;

  function stopRun() {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];
  }

  const handleToggle = (i, isHover) => {
    // The reader touched it — the run is over, permanently.
    stopRun();
    setRunState("done");
    setOpenIndex((prev) => {
      if (isHover) return i;
      return prev === i ? -1 : i;
    });
  };

  useEffect(() => {
    const el = document.getElementById("signal");
    let reduced = false;
    try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* opportunistic */ }
    // Reduced motion gets the whole point without the performance: opening all
    // six at once is not an option (six expanded rows is a wall), so instead
    // nothing auto-opens and the countdown never appears. The rows are still
    // fully readable on hover/tap — the content was never gated on the run.
    if (!el || reduced) return undefined;

    // ── The trigger is motion.js's `.sec-in`, not an IntersectionObserver of
    // our own. Two reasons, and the second is the important one:
    //
    //   1. A private IO needs its own answer to "how much of this section
    //      counts as arrived", and both obvious answers are wrong here. A
    //      ratio threshold is unreachable on a section taller than a couple of
    //      viewports (this one is 1256px against a 900px window — max possible
    //      ratio 0.72, so `threshold: 0.35` was one added row away from
    //      silently never firing). A rootMargin band works, but then two
    //      different definitions of "in view" live on the same section.
    //   2. motion.js's version already has a fallback for environments where
    //      IntersectionObserver callbacks never arrive — measured here: a raw
    //      IO on this exact element with these exact options delivered ZERO
    //      entries in 500ms while `.sec-in` was already on the section. IO
    //      callbacks are delivered on a rendering-lifecycle step, so a tab
    //      that is not compositing frames never gets them; motion.js's
    //      scroll/poll path covers that, and this now inherits it for free.
    //
    // MutationObserver is used to watch for the class because IT is delivered
    // on a microtask — no rendering step required, so the observer works in
    // exactly the situation that broke the IO.
    let started = false;
    function begin() {
      if (started) return;
      started = true;
      setRunState("running");
      const step = SIGNAL_RUN_MS / (total + 1);
      for (let i = 0; i < total; i++) {
        timersRef.current.push(window.setTimeout(function () { setOpenIndex(i); }, step * (i + 1)));
      }
      // Land on the last reason rather than closing everything: the run ends
      // with something to read, not with an empty list.
      timersRef.current.push(window.setTimeout(function () { setRunState("done"); }, SIGNAL_RUN_MS));
    }

    if (el.classList.contains("sec-in")) { begin(); return function () { stopRun(); }; }
    const mo = new MutationObserver(function () {
      if (el.classList.contains("sec-in")) { mo.disconnect(); begin(); }
    });
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return function () { mo.disconnect(); stopRun(); };
  }, [total]);

  return (
    <section data-section="signal" id="signal" data-enter="emerge" ref={ref}>
      <div className="shell">
        <SecHead
          num="01"
          eyebrow={t.signal.eyebrow}
          title={t.signal.title}
          em={t.signal.title.split(" ").pop()}
          meta={`${total} · signal`}
        />

        {/* The countdown itself: a hairline that drains left-to-right over the
            ten seconds, and a read-out that names what is happening. Purely
            decorative — aria-hidden, because the reasons below are the content
            and a screen reader has no use for a progress bar on an accordion
            it can already open directly. */}
        <div className={`signal-run signal-run--${runState}`} aria-hidden="true">
          <span className="signal-run-bar" style={{ "--run-ms": `${SIGNAL_RUN_MS}ms` }} />
          <span className="signal-run-read mono">
            {runState === "running" ? "10s · signal running" : runState === "done" ? "signal complete" : "10s · signal"}
          </span>
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


function useAnimatedCounter(target, durationMs, runWhen, precision) {
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
      const factor = Math.pow(10, precision || 0);
      setValue(Math.round(eased * target * factor) / factor);
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, runWhen]);
  return value;
}

// Pull numeric "target" out of a string like "1.5+", "30+", "12", "RU/EN/UZ".
// Non-numeric strings render as-is (RU/EN/UZ).
function extractCounterTarget(stat) {
  const v = String(stat.v || "");
  const m = v.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return { kind: "text", text: v };
  const normalized = m[1].replace(",", ".");
  const fraction = normalized.split(".")[1] || "";
  return { kind: "num", number: Number(normalized), precision: fraction.length, suffix: v.slice(m.index + m[1].length) };
}

function AboutStat({ stat, runCounters, index }) {
  const parsed = extractCounterTarget(stat);
  const counterValue = useAnimatedCounter(
    parsed.kind === "num" ? parsed.number : 0,
    1100 + index * 90,
    parsed.kind === "num" && runCounters,
    parsed.kind === "num" ? parsed.precision : 0,
  );
  return (
    <div className="about-stat" data-reveal data-reveal-delay={(index * 0.05).toFixed(2)}>
      <div className="about-stat-v num-tab">
        {parsed.kind === "num" ? `${counterValue.toFixed(parsed.precision)}${parsed.suffix}` : parsed.text}
      </div>
      <div className="about-stat-k mono">{stat.k}</div>
    </div>
  );
}

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
  const [runCounters, setRunCounters] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [clock, setClock] = useState(() => formatTashkentTime(new Date()));
  // null until the GitHub fetch resolves, and null forever if it fails. The
  // section renders its static copy in that case — never a synthetic graph.
  const [gh, setGh] = useState(null);
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
  const moveFrameRef = useRef(0);
  const cardRectRef = useRef(null);
  const latestPointerRef = useRef({ x: 0, y: 0 });
  function onMove(e) {
    const el = cardRef.current;
    if (!el) return;
    if (!cardRectRef.current) cardRectRef.current = el.getBoundingClientRect();
    latestPointerRef.current = { x: e.clientX, y: e.clientY };
    if (moveFrameRef.current) return;
    moveFrameRef.current = requestAnimationFrame(() => {
      moveFrameRef.current = 0;
      const r = cardRectRef.current;
      if (!r || !r.width || !r.height) return;
      const x = (latestPointerRef.current.x - r.left) / r.width - 0.5;
      const y = (latestPointerRef.current.y - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${(-y * 2.8).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * 2.8).toFixed(2)}deg`);
      el.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
    });
  }
  function onLeave() {
    const el = cardRef.current;
    if (!el) return;
    cardRectRef.current = null;
    if (moveFrameRef.current) cancelAnimationFrame(moveFrameRef.current);
    moveFrameRef.current = 0;
    el.style.setProperty("--rx", `0deg`);
    el.style.setProperty("--ry", `0deg`);
  }

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
      // with the hover tilt (see `.proj-grid > .proj-card` in sections.css).
      data-plx={i % 2 === 0 ? "0.05" : "-0.03"}
      style={{ "--proj-i": i, "--proj-accent": (PROJ_CARD[p.slug] && PROJ_CARD[p.slug].accent) || "var(--accent)" }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
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
    window.addEventListener("resize", measure, { passive: true });
    return function cleanup() { window.removeEventListener("resize", measure); };
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
  // Four strongest product families lead the section on every viewport. The
  // complete catalog expands on intent; mobile keeps its swipe carousel, but
  // nobody has to swipe through 21 cards just to leave the block.
  const FEATURED_PROJECT_COUNT = 4;
  const [expanded, setExpanded] = useState(false);
  const items = t.projects.items;
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
        <SecHead num="03" eyebrow={t.projects.eyebrow} title={t.projects.title} meta={`${items.length} cases · 2024–26`} />
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
        <SecHead num="04" eyebrow={t.skills.eyebrow} title={t.skills.title} meta="stack.matrix" />
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
