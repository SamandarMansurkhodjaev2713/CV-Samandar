// app.jsx — Main app: single Ember theme, fonts, scroll-driven 3D background

const { useEffect: useE, useRef: useR, useState: useS } = React;

// ── Error Boundary (class component — required by React API)
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error("[ErrorBoundary]", err, info); }
  render() {
    if (this.state.error) {
      return React.createElement("div", {
        style: {
          position: "fixed", inset: 0, background: "#1F1E1B", color: "#D97757",
          fontFamily: "monospace", fontSize: "13px", padding: "80px 40px",
          zIndex: 9999, overflowY: "auto", whiteSpace: "pre-wrap"
        }
      },
        "⚠ RENDER ERROR\n\n" + String(this.state.error) + "\n\n" +
        (this.state.error.stack || "")
      );
    }
    return this.props.children;
  }
}

const LINKS = { github: "github.com/SamandarMansurkhodjaev2713", telegram: "t.me/killallofthem13", email: "sam4k27@gmail.com" };
const NAV_SECTIONS = ["about", "projects", "skills", "services", "cv", "faq", "contact"];
const FULL_MENU_SECTIONS = ["hero", "signal", "about", "projects", "skills", "services", "cv", "process", "builder", "faq", "trust", "contact"];
const FULL_MENU_LABELS = {
  ru: { hero: "Старт", signal: "Почему со мной", process: "Метод", builder: "Конструктор", trust: "Гарантия качества" },
  en: { hero: "Start", signal: "Why me", process: "Method", builder: "Project builder", trust: "Quality proof" },
  uz: { hero: "Boshlanish", signal: "Nega men", process: "Jarayon", builder: "Konstruktor", trust: "Sifat kafolati" },
};

// ── Haptic helper.
// `navigator.vibrate` is supported on Android Chrome and ~most Android browsers.
// iOS Safari silently no-ops — that's correct, we don't want to fight iOS.
// Calls are short (6-12ms) so they read as "click confirm", not a phone-ringer.
const HAPTIC_MS = {
  tap: 6,
  toggle: 8,
  submit: 14,
};
function haptic(kind) {
  const ms = HAPTIC_MS[kind] || HAPTIC_MS.tap;
  if (typeof navigator === "undefined") return;
  if (!navigator.vibrate) return;
  try { navigator.vibrate(ms); } catch (e) { /* silently ignore — vibration is opportunistic */ }
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "lang": "ru",
  "theme": "claude",
  "font": "geist",
  "motion": 1,
  "density": "regular"
}/*EDITMODE-END*/;

function useScrollEngine(bgFxRef, setActiveSection) {
  useE(() => {
    const progressEl = document.querySelector(".scroll-progress");
    let raf = 0;
    function tick() {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = max > 0 ? window.scrollY / max : 0;
      if (progressEl) progressEl.style.width = `${(y * 100).toFixed(2)}%`;
      if (bgFxRef.current && bgFxRef.current.setScroll) bgFxRef.current.setScroll(y);
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(tick); }
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();
    const sections = document.querySelectorAll("section[data-section]");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.3) {
          const id = e.target.getAttribute("data-section");
          setActiveSection(id);
          if (bgFxRef.current && bgFxRef.current.setSection) bgFxRef.current.setSection(id);
          // Single source of truth for "which section is the reader in" —
          // acts.js (colour dramaturgy) and future engines subscribe to this.
          try { window.dispatchEvent(new CustomEvent("sm:section", { detail: { id } })); } catch (err) { /* opportunistic */ }
        }
      });
    }, { threshold: [0.3, 0.5, 0.7] });
    sections.forEach((s) => io.observe(s));
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); io.disconnect(); };
  }, []);
}

// Labels for the section COUNTER — sections that live outside t.nav (they are
// real [data-section] chapters but not primary nav destinations).
const EXTRA_SECTION_LABELS = {
  ru: { hero: "Старт", signal: "Сигнал", process: "Метод", builder: "Конструктор", trust: "Качество" },
  en: { hero: "Start", signal: "Signal", process: "Method", builder: "Builder", trust: "Quality" },
  uz: { hero: "Boshlanish", signal: "Signal", process: "Metod", builder: "Konstruktor", trust: "Sifat" },
};

// "Flight with focus": menu/anchor navigation reads as travel through the
// site's space, not a page scroll. A vignette closes in (body::after via the
// html.is-flying class), bg-fx's own scroll-energy does the motion drama for
// free, and the landing section briefly carries .fly-in so its heading can
// flash its entrance. Native wheel/touch scrolling is untouched — this runs
// ONLY on explicit navigation clicks. Reduced-motion falls back to the plain
// jump (scroll-behavior:auto already handles the scroll itself).
function flyTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.SceneCinema && typeof window.SceneCinema.navigate === "function") {
    window.SceneCinema.navigate(id);
    return;
  }
  const reduced = typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try { history.replaceState(null, "", "#" + id); } catch (e) { /* opportunistic */ }
  if (!reduced) {
    document.documentElement.classList.add("is-flying");
    el.classList.add("fly-in");
    window.clearTimeout(flyTo._t1); window.clearTimeout(flyTo._t2);
    flyTo._t1 = window.setTimeout(() => document.documentElement.classList.remove("is-flying"), 950);
    flyTo._t2 = window.setTimeout(() => el.classList.remove("fly-in"), 1600);
  }
  try { el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); }
  catch (e) { window.location.hash = id; }
}

// Odometer-style digit drum for the section counter: remounting .drum-n on a
// number change (React key) replays the roll-in keyframe — no state to manage.
function Drum({ value }) {
  return (
    <span className="drum" aria-hidden="true">
      <span key={value} className="drum-n">{value}</span>
    </span>
  );
}

// Per-chapter accents for the menu preview. Deliberately the SAME values
// acts.js paints when you arrive, so the peek is a promise the page keeps.
// Kept as a plain map rather than read from acts.js: the menu must render
// correctly even if that engine failed to load.
const MENU_ACCENT = {
  hero: "110, 139, 166", signal: "110, 139, 166", about: "217, 119, 87",
  projects: "205, 122, 74", skills: "122, 145, 168", services: "196, 160, 108",
  cv: "122, 145, 168", process: "122, 145, 168", builder: "196, 160, 108",
  faq: "196, 160, 108", trust: "200, 155, 94", contact: "200, 155, 94",
};

function Nav({ t, lang, setLang, active }) {
  const [open, setOpen] = useS(false);
  const [peek, setPeek] = useS(null);
  // Capsule state — the bar condenses into a floating pill once the reader
  // leaves the very top. Passive + rAF-throttled; no layout reads besides scrollY.
  const [capsule, setCapsule] = useS(false);
  // Real chapter order straight from the DOM — single source of truth shared
  // with the dock (same querySelectorAll pattern), so the counter can never
  // disagree with the actual page.
  const [secOrder, setSecOrder] = useS([]);
  const [clock, setClock] = useS("");

  useE(() => {
    setSecOrder([...document.querySelectorAll("section[data-section]")].map((el) => el.getAttribute("data-section")));
    let raf = 0;
    function read() { raf = 0; setCapsule(window.scrollY > 64); }
    function onScroll() { if (!raf) raf = requestAnimationFrame(read); }
    window.addEventListener("scroll", onScroll, { passive: true });
    read();
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  // Lock scroll while the fullscreen menu is open; Escape closes. The live
  // Tashkent clock only ticks while the menu is visible (zero idle cost).
  useE(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    function tick() {
      const d = new Date(Date.now() + (5 * 60 + new Date().getTimezoneOffset()) * 60000);
      setClock([d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":"));
    }
    tick();
    const iv = window.setInterval(tick, 1000);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearInterval(iv);
    };
  }, [open]);

  const total = secOrder.length || 11;
  const idx = Math.max(0, secOrder.indexOf(active));
  const num = String(idx + 1).padStart(2, "0");
  const extra = EXTRA_SECTION_LABELS[lang] || EXTRA_SECTION_LABELS.ru;
  const activeLabel = t.nav[active] || extra[active] || "";
  const progress = total > 1 ? idx / (total - 1) : 0;

  function go(e, id) {
    e.preventDefault();
    setOpen(false);
    flyTo(id);
  }

  return (
    <nav className={`nav ${open ? "nav-open" : ""} ${capsule ? "is-capsule" : ""}`}>
      <div className="nav-inner">
        <a href="#hero" className="brand" data-cursor="link" data-cursor-label="↑ top" onClick={(e) => go(e, "hero")}>
          <span className="brand-mark" />
          <span className="brand-name">SAMANDAR<span className="brand-sub"> · EXEC.AI.LAB</span></span>
        </a>

        {/* Section counter — capsule-mode telemetry: 04 / 11 · Проекты with an
            odometer roll on change and a hairline progress track underneath. */}
        <div className="nav-counter mono" aria-hidden="true">
          <Drum value={num} />
          <span className="nav-counter-sep">/ {String(total).padStart(2, "0")}</span>
          <span key={active} className="nav-counter-name">{activeLabel}</span>
          <span className="nav-counter-track"><i style={{ transform: `scaleX(${progress})` }} /></span>
        </div>

        <ul className="nav-links">
          {NAV_SECTIONS.map((k) => (
            <li key={k}><a href={`#${k}`} onClick={(e) => go(e, k)} className={active === k ? "active" : ""} data-cursor="link" data-cursor-label={`→ ${t.nav[k]}`}>{t.nav[k]}</a></li>
          ))}
        </ul>

        <div className="nav-right">
          <div className="lang" role="group" aria-label="language">
            {["ru", "en", "uz"].map((L) => (
              <button key={L} onClick={() => setLang(L)} className={lang === L ? "active" : ""} aria-pressed={lang === L}>{L.toUpperCase()}</button>
            ))}
          </div>
          {/* Persistent primary CTA — always one click from a conversation. */}
          <a href="#contact" className="nav-cta" data-magnetic data-cursor="send" data-cursor-label="send → contact" onClick={(e) => go(e, "contact")}>
            <span className="nav-cta-dot" aria-hidden="true" />
            {t.hero.cta_primary}
          </a>
          <button
            type="button"
            className="nav-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => { haptic("toggle"); setOpen((o) => !o); }}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Fullscreen menu — the navigation SCENE (desktop + mobile). Huge type,
          chapter numbering, live telemetry. Items line-mask in with a stagger. */}
      <div className={`nav-menu ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="nav-menu-glow" aria-hidden="true" />
        <div className="nav-menu-inner">
          <ul className="nav-menu-links" onMouseLeave={() => setPeek(null)}>
            {FULL_MENU_SECTIONS.map((k, i) => (
              <li key={k} style={{ "--i": i }}>
                <a
                  href={`#${k}`} onClick={(e) => go(e, k)} className={active === k ? "active" : ""}
                  onMouseEnter={() => setPeek({ k, i })} onFocus={() => setPeek({ k, i })}
                >
                  <span className="nav-menu-num mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="nav-menu-mask"><span className="nav-menu-word">{t.nav[k] || FULL_MENU_LABELS[lang][k]}</span></span>
                  <span className="nav-menu-arrow" aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>

          {/* Live chapter preview. The menu stops being a list of words and
              becomes a map: hovering an entry paints the panel in THAT act's
              colour (the same value acts.js uses when you actually get there)
              and blows its chapter number up. No invented facts, no thumbnails
              to keep in sync — just the chapter's own identity, early. */}
          <div className={`nav-peek ${peek ? "is-on" : ""}`} aria-hidden="true">
            {/* Comma alpha (`rgba(r, g, b, a)`) — MENU_ACCENT is comma-separated,
                and the slash form only accepts space-separated channels. */}
            <div className="nav-peek-wash" style={peek ? { background: `radial-gradient(ellipse 90% 80% at 50% 20%, rgba(${MENU_ACCENT[peek.k] || "217, 119, 87"}, 0.30), transparent 70%)` } : undefined} />
            <div key={peek ? peek.k : "none"} className="nav-peek-body">
              <span className="nav-peek-num" style={peek ? { color: `rgb(${MENU_ACCENT[peek.k] || "217, 119, 87"})` } : undefined}>
                {peek ? String(peek.i + 1).padStart(2, "0") : "00"}
              </span>
              <span className="nav-peek-name">{peek ? (t.nav[peek.k] || FULL_MENU_LABELS[lang][peek.k]) : ""}</span>
            </div>
          </div>
          <div className="nav-menu-foot">
            <a href="#contact" className="nav-menu-cta" data-magnetic onClick={(e) => go(e, "contact")}>
              {t.hero.cta_primary} <span className="arrow">→</span>
            </a>
            {/* Sound layer opt-in — state lives on html.sm-sound (sound.js),
                so a language re-render can never show a stale label. */}
            <button type="button" className="sound-toggle mono" aria-label="Toggle UI sound">
              <span className="sound-toggle-dot" aria-hidden="true" />
              SOUND
            </button>
            <div className="lang nav-menu-lang" role="group" aria-label="language">
              {["ru", "en", "uz"].map((L) => (
                <button key={L} onClick={() => setLang(L)} className={lang === L ? "active" : ""} aria-pressed={lang === L}>{L.toUpperCase()}</button>
              ))}
            </div>
            <div className="nav-menu-tele mono">
              <span>TASHKENT · 41.31°N 69.24°E</span>
              <span>UTC+5 · {clock}</span>
              <span>EXECUTIVE AI CODE LAB · v.2026</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ── Mobile UI overlay primitives ──────────────────────────────────────────
// Both dock + sticky CTA share the same visibility rule: appear after the user
// scrolls past hero, hide near contact. We use the SAME hooks rather than two
// observers to keep the truth source single and avoid races between them.

function useMidScrollVisibility() {
  const [visible, setVisible] = useS(false);
  useE(() => {
    const heroEl = document.getElementById("hero");
    const contactEl = document.getElementById("contact");
    if (!heroEl || !contactEl) return undefined;

    // Truth source: IntersectionObserver where available.
    let inHero = true;
    let inContact = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target.id === "hero") inHero = e.isIntersecting;
        else if (e.target.id === "contact") inContact = e.isIntersecting;
      });
      setVisible(!inHero && !inContact);
    }, { threshold: 0.1 });
    io.observe(heroEl);
    io.observe(contactEl);

    // Scroll-based fallback — covers environments where IO is unreliable
    // (some embedded webviews, headless previews). Computes visibility from
    // bounding rects each rAF-throttled scroll event.
    let raf = 0;
    function recompute() {
      raf = 0;
      const vh = window.innerHeight;
      const heroRect = heroEl.getBoundingClientRect();
      const contactRect = contactEl.getBoundingClientRect();
      const heroVisible = heroRect.top < vh && heroRect.bottom > 0;
      const contactVisible = contactRect.top < vh && contactRect.bottom > 0;
      inHero = heroVisible;
      inContact = contactVisible;
      setVisible(!heroVisible && !contactVisible);
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(recompute); }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    recompute();

    return function cleanup() {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return visible;
}

// The page has 11 real [data-section] chapters, but the dock only has room for
// the 7 that mirror the primary nav menu (about/projects/skills/services/cv/
// faq/contact) — signal, process ("Method") and trust ("Quality") ride between
// them with no dot of their own. The OLD logic compared activeSection to
// NAV_SECTIONS with a plain `indexOf`: for any of those 3 "gap" sections that
// returns -1, which silently fell back to index 0 ("about") for BOTH the label
// text and (via a separate, un-synced comparison) left every dot unlit — so a
// reader deep in Method or Quality saw the indicator confidently claim "01 · О
// себе" while no dot agreed with it. That's the "misleading" bug.
// Fix: resolve every real section to the nearest NAV_SECTIONS entry AT OR
// BEFORE it in actual DOM order (standard scrollspy behavior — highlight the
// last landmark the reader has passed) and derive BOTH the dot and the label
// from that single resolved index, so they can never disagree.
function useSectionOrder() {
  const [order, setOrder] = useS(null);
  useE(() => {
    setOrder([...document.querySelectorAll("[data-section]")].map((el) => el.getAttribute("data-section")));
  }, []);
  return order;
}
function resolveNavIndex(activeSection, order) {
  if (!order) return 0;
  const pos = order.indexOf(activeSection);
  if (pos === -1) return 0;
  for (let i = pos; i >= 0; i--) {
    const navIdx = NAV_SECTIONS.indexOf(order[i]);
    if (navIdx !== -1) return navIdx;
  }
  return 0; // nothing but hero/signal precede us — next landmark is "about"
}

function MobileScrollDock({ t, lang, activeSection, visible }) {
  // 6 dots for the main NAV sections. Tap → smooth scroll + light haptic.
  function onDotClick(id) {
    haptic("tap");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const order = useSectionOrder();
  const activeIdx = resolveNavIndex(activeSection, order);
  const activeId = NAV_SECTIONS[activeIdx];
  const extra = EXTRA_SECTION_LABELS[lang] || EXTRA_SECTION_LABELS.ru;
  const activeLabel = (t.nav && t.nav[activeSection]) || extra[activeSection] || (t.nav && t.nav[activeId]) || "";
  const chapterIdx = Math.max(0, (order || []).indexOf(activeSection));
  return (
    <div className={`mobile-dock ${visible ? "is-visible" : ""}`} role="navigation" aria-label="sections">
      <ol className="mobile-dock-dots">
        {NAV_SECTIONS.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              className={`mobile-dock-dot ${i === activeIdx ? "is-active" : ""}`}
              aria-label={t.nav && t.nav[id] ? t.nav[id] : id}
              onClick={() => onDotClick(id)}
            />
          </li>
        ))}
      </ol>
      <div className="mobile-dock-label mono" aria-live="polite">
        <span className="mobile-dock-label-num">/{String(chapterIdx + 1).padStart(2, "0")}</span>
        <span>{activeLabel}</span>
      </div>
      <a className="mobile-dock-cta" href="#contact" onClick={() => haptic("toggle")}>
        <span>{t.hero.cta_primary}</span><span className="arrow" aria-hidden="true">→</span>
      </a>
    </div>
  );
}

function MobileStickyCta({ t, visible }) {
  function onTap() { haptic("toggle"); }
  return (
    <a
      href="#contact"
      className={`mobile-sticky-cta ${visible ? "is-visible" : ""}`}
      onClick={onTap}
      aria-label={t.hero.cta_primary}
    >
      <span>{t.hero.cta_primary}</span>
      <span className="arrow">→</span>
    </a>
  );
}

function PortfolioTweaks({ t, setTweak }) {
  const fontOptions = Object.keys(window.FONT_STACKS);
  return (
    <TweaksPanel>
      <TweakSection label="Language" />
      <TweakRadio label="Lang" value={t.lang} options={["ru","en","uz"]} onChange={(v) => setTweak("lang", v)} />

      <TweakSection label="Font" />
      <TweakSelect label="Font" value={t.font} options={fontOptions} onChange={(v) => setTweak("font", v)} />

      <TweakSection label="Layout" />
      <TweakRadio label="Density" value={t.density} options={["compact","regular","airy"]} onChange={(v) => setTweak("density", v)} />
      <TweakSlider label="Motion" value={t.motion} min={0} max={1.6} step={0.1} onChange={(v) => setTweak("motion", v)} />
    </TweaksPanel>
  );
}

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [activeSection, setActiveSection] = useS("hero");
  const [coreReady, setCoreReady] = useS(false);
  const canvasRef = useR(null);
  const bgFxCanvasRef = useR(null);
  const bgFxRef = useR(null);
  const lang = tweaks.lang in window.CONTENT ? tweaks.lang : "ru";
  const t = window.CONTENT[lang];

  // Backfill CV doc fields (id, langs, strengths, foot) so the resume layout
  // renders even if the content bundles haven't been extended yet.
  useE(() => {
    const I18N = {
      ru: {
        id: { name: "Самандар", role: "Full-Stack · AI Automation · QA",
              meta: ["Ташкент · UTC+5", "Открыт к проектам", "3 курс · Software Engineering"],
              stats: [{ k: "опыт", v: "1.5+ года" }, { k: "проектов", v: "10+" }, { k: "стек", v: "TS / Py / SQL" }, { k: "ответ", v: "< 24h" }] },
        exp_title: "опыт", langs_title: "языки", strengths_title: "сильные стороны",
        strengths: [
          { t: "Системное мышление от прод-идеи до прод-деплоя", p: "TTYL Platform — от архитектуры и API до деплоя и багфиксов в проде: весь цикл на одном человеке." },
          { t: "AI-интеграции уровня продакшна, не демки", p: "Klawis (klawis.uz): RAG, гибридный поиск и цитирование источников в живом юридическом AI-продукте." },
          { t: "Качество как часть разработки, а не отдельный этап", p: "QA на TTYL: test plans, Playwright E2E со скриншотами и traces, контроль регрессий перед релизом." },
          { t: "Тёплая коммуникация с клиентами — проверено на практике", p: "UniCall: специалист по работе с клиентами, лучший сотрудник месяца за качество коммуникации." },
        ],
        langs: [{ k: "Русский", lv: 100, label: "native" }, { k: "Oʻzbek", lv: 92, label: "свободный" }, { k: "English", lv: 85, label: "C1 · продвинутый" }],
        foot: "сгенерировано 2026 · подписанная версия по запросу",
      },
      en: {
        id: { name: "Samandar", role: "Full-Stack · AI Automation · QA",
              meta: ["Tashkent · UTC+5", "Open to projects", "3rd-year · Software Engineering"],
              stats: [{ k: "experience", v: "1.5+ yr" }, { k: "projects", v: "10+" }, { k: "stack", v: "TS / Py / SQL" }, { k: "reply", v: "< 24h" }] },
        exp_title: "experience", langs_title: "languages", strengths_title: "strengths",
        strengths: [
          { t: "End-to-end ownership from product idea to prod deploy", p: "TTYL Platform — from architecture and API to deploy and prod bugfixes: the whole cycle on one person." },
          { t: "Production AI integrations, not demos", p: "Klawis (klawis.uz): RAG, hybrid search and source citation in a live legal AI product." },
          { t: "Quality baked into building, not a separate stage", p: "QA at TTYL: test plans, Playwright E2E with screenshots and traces, regression control before release." },
          { t: "Warm client communication — proven in practice", p: "UniCall: customer support specialist, employee of the month for communication quality." },
        ],
        langs: [{ k: "Russian", lv: 100, label: "native" }, { k: "Uzbek", lv: 92, label: "fluent" }, { k: "English", lv: 85, label: "C1 · advanced" }],
        foot: "generated 2026 · signed copy on request",
      },
      uz: {
        id: { name: "Samandar", role: "Full-Stack · AI Automation · QA",
              meta: ["Toshkent · UTC+5", "Loyihalarga ochiq", "3-kurs · Software Engineering"],
              stats: [{ k: "tajriba", v: "1.5+ yil" }, { k: "loyiha", v: "10+" }, { k: "stek", v: "TS / Py / SQL" }, { k: "javob", v: "< 24h" }] },
        exp_title: "tajriba", langs_title: "tillar", strengths_title: "kuchli tomonlar",
        strengths: [
          { t: "Mahsulot g'oyasidan prod-deploygacha to'liq egalik", p: "TTYL Platform — arxitektura va API'dan deploy va prod-bagfikslargacha: butun sikl bitta odamda." },
          { t: "Production darajadagi AI integratsiyalar", p: "Klawis (klawis.uz): jonli yuridik AI-mahsulotda RAG, gibrid qidiruv va manba iqtiboslari." },
          { t: "Sifat — bosqich emas, ishlab chiqishning bir qismi", p: "TTYL'da QA: test-rejalar, Playwright E2E skrinshot va traces bilan, relizdan oldin regressiya nazorati." },
          { t: "Mijozlar bilan iliq muloqot — amaliyotda sinalgan", p: "UniCall: mijozlar bilan ishlash bo'yicha mutaxassis, muloqot sifati uchun oyning eng yaxshi xodimi." },
        ],
        langs: [{ k: "Ruscha", lv: 100, label: "native" }, { k: "Oʻzbek", lv: 92, label: "erkin" }, { k: "English", lv: 85, label: "C1 · ilg'or" }],
        foot: "2026 yil · imzolangan nusxa so'rov asosida",
      },
    };
    Object.entries(I18N).forEach(([L, patch]) => {
      const cv = window.CONTENT?.[L]?.cv;
      if (!cv) return;
      for (const k of Object.keys(patch)) if (cv[k] == null) cv[k] = patch[k];
    });
  }, []);

  // Apply the (single) theme: set CSS variables + push accent to the bg-fx
  // renderer. Kept dependency-driven so a future re-introduction of theming
  // would just work.
  useE(() => {
    const theme = window.applyTheme(tweaks.theme);
    if (bgFxRef.current && theme) {
      bgFxRef.current.setAccent(theme.accent, theme.accent2);
    }
  }, [tweaks.theme]);
  useE(() => { window.applyFontStack(tweaks.font); }, [tweaks.font]);

  // Deep-link scroll — on a fresh load carrying a #section or #proj-<slug> hash
  // (returning from a product landing, or any shared section link), jump to that
  // target once it has rendered AND become visible. The collapsed projects grid
  // may need a frame to expand (Projects has its own effect for that), so we
  // retry across frames until the element is on-screen. Cards centre in view;
  // sections align to their top (scroll-margin-top clears the fixed nav). The
  // intro loader is already skipped for hashed loads (index.html head-boot), so
  // this lands cleanly instead of after a curtain + top-of-page.
  useE(() => {
    const id = (window.location.hash || "").replace(/^#/, "");
    if (!id) return;
    if ("scrollRestoration" in history) { try { history.scrollRestoration = "manual"; } catch (e) { /* opportunistic */ } }
    let cancelled = false;
    const timers = [];
    function cancelOnIntent() { cancelled = true; }
    window.addEventListener("wheel", cancelOnIntent, { passive: true, once: true });
    window.addEventListener("touchstart", cancelOnIntent, { passive: true, once: true });
    window.addEventListener("pointerdown", cancelOnIntent, { passive: true, once: true });
    window.addEventListener("keydown", cancelOnIntent, { once: true });
    function tryScroll() {
      if (cancelled) return;
      const el = document.getElementById(id);
      if (el && el.offsetParent !== null) {
        // Force an instant jump even though the root stylesheet declares
        // smooth scrolling. This prevents the delayed two-stage return that
        // was visible for cards near the end of the 21-item catalog.
        const root = document.documentElement;
        const previous = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        try {
          el.scrollIntoView({ behavior: "instant", block: id.indexOf("proj-") === 0 ? "center" : "start" });
        } finally {
          root.style.scrollBehavior = previous;
        }
      }
    }
    // React mount, project expansion and pin-host binding each change layout at
    // a different moment. Re-assert the same deterministic target across those
    // milestones, but stop instantly on any real user intent so the page never
    // fights manual scrolling.
    [0, 120, 360, 760, 1280].forEach((delay) => {
      timers.push(window.setTimeout(tryScroll, delay));
    });
    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("wheel", cancelOnIntent);
      window.removeEventListener("touchstart", cancelOnIntent);
      window.removeEventListener("pointerdown", cancelOnIntent);
      window.removeEventListener("keydown", cancelOnIntent);
    };
  }, []);
  useE(() => {
    document.documentElement.setAttribute("data-density", tweaks.density);
    document.documentElement.setAttribute("lang", lang);
  }, [tweaks.density, lang]);
  useE(() => {
    document.documentElement.style.setProperty("--motion", String(tweaks.motion));
    if (bgFxRef.current && bgFxRef.current.setMotion) bgFxRef.current.setMotion(tweaks.motion);
  }, [tweaks.motion]);

  // Apply theme/font once on mount + init bg-fx canvas
  useE(() => {
    window.applyTheme(tweaks.theme);
    window.applyFontStack(tweaks.font);
    setCoreReady(true);
    if (bgFxCanvasRef.current && window.BgFx) {
      const rootStyles = getComputedStyle(document.documentElement);
      const a1 = rootStyles.getPropertyValue("--accent").trim() || "#D97757";
      const a2 = rootStyles.getPropertyValue("--accent-2").trim() || "#C89B5E";
      bgFxRef.current = window.BgFx.create(bgFxCanvasRef.current, {
        accent: a1, accent2: a2, motion: tweaks.motion,
      });
    }
    return () => {
      if (bgFxRef.current && bgFxRef.current.dispose) bgFxRef.current.dispose();
      bgFxRef.current = null;
    };
  }, []);

  useScrollEngine(bgFxRef, setActiveSection);

  // Motion: init smart cursor + reveal observers after first paint, refresh on lang change.
  // isInViewport check in motion.js handles the "no-flash" problem for visible elements.
  useE(() => {
    document.body.classList.add("page-loaded");
    // Motion-lite flag: set on <html> when the device is weak OR the user
    // prefers reduced motion. CSS keys the heaviest scroll effects (pinned
    // overlap, scale reveals) off this so they degrade automatically.
    var tierLow = (typeof window.getDeviceTier === "function") && window.getDeviceTier() === "low";
    var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (tierLow || prefersReduced) {
      document.documentElement.setAttribute("data-motion-lite", "");
    }
    // On low-tier devices strip the pinned-overlap hosts entirely — the
    // sticky/scroll-linked overlap is the heaviest scroll effect and not
    // worth its cost on weak hardware. (CSS handles reduced-motion via the
    // data-motion-lite attribute + @media query.)
    if (tierLow) {
      document.querySelectorAll("[data-pin]").forEach(function (p) {
        p.removeAttribute("data-pin");
        p.removeAttribute("data-pinned");
      });
    }
    if (window.Motion) window.Motion.init();
    // Wire the View Transitions API navigator. It binds a global click handler
    // on anchor[href^="#"] and replaces the default scroll with a cinematic
    // cross-fade. Safe to call multiple times — second call is a no-op.
    if (window.SceneCinema && typeof window.SceneCinema.init === "function") {
      window.SceneCinema.init();
    }
    return () => {
      if (window.SceneCinema && typeof window.SceneCinema.dispose === "function") {
        window.SceneCinema.dispose();
      }
    };
  }, []);
  useE(() => {
    if (!window.Motion) return;
    const id = requestAnimationFrame(() => window.Motion.refresh());
    return () => cancelAnimationFrame(id);
  }, [lang, tweaks.density]);

  // Mid-scroll visibility for mobile dock + sticky CTA.
  const midScrollVisible = useMidScrollVisibility();

  return (
    <>
      {/* Keyboard/screen-reader skip link — first focusable element. */}
      <a href="#main" className="skip-link">{(t.nav && t.nav.skip) || "К содержимому"}</a>

      <canvas ref={bgFxCanvasRef} className="bg-fx-canvas" aria-hidden="true" />
      <div className="bg-grid" />
      <div className="bg-noise" />
      <div className="scroll-progress" />

      <Nav
        t={t}
        lang={lang}
        setLang={(v) => setTweak("lang", v)}
        active={activeSection}
      />

      <main id="main">
        {/* Hero→Signal cover — NATIVE position:sticky (features.css
            .pin-host--hero rules). No data-pin here: unlike the two JS-driven
            pairs below, this pair needs zero JavaScript — Hero sticks to the
            viewport top (the .pin-host wrapper bounds the sticky) while Signal
            scrolls up over it. Composited, jitter-free. Works because <body>
            uses overflow-x:clip (not hidden), which no longer breaks sticky —
            verified empirically. The wrapper keeps position:relative so it is
            the sticky containing block. */}
        <div className="pin-host pin-host--hero">
          <Hero t={t} links={LINKS} />
          <Signal t={t} />
        </div>
        <Interlude data={(t.interludes||[])[0]} index={0} />
        <About t={t} />
        <Interlude data={(t.interludes||[])[1]} index={1} />
        <Projects t={t} />
        <Skills t={t} />
        {/* Pinned-overlap #1 — Services recedes as CV (the centerpiece) rises.
            Depth handoff via --pin-p (motion.js bindPins); transform/opacity
            only, no sticky. The two sections are DOM-adjacent (required). */}
        <div className="pin-host" data-pin>
          <Services t={t} />
          <CV t={t} links={LINKS} />
        </div>
        <Process t={t} />
        {/* Signature interactive — "Живой конструктор проекта". Standalone band
            between Process and FAQ (no data-section, so it stays out of the nav /
            scroll-spy). Replaces the old CLI cinema + cursor constellation. */}
        <ProjectBuilder t={t} links={LINKS} />
        <Faq t={t} />
        {/* Pinned-overlap #2 — Trust recedes as Contact (the closing CTA) rises. */}
        <div className="pin-host" data-pin>
          <Trust t={t} />
          <Interlude data={(t.interludes||[])[2]} index={2} />
          <Contact t={t} links={LINKS} />
        </div>
      </main>

      <Footer t={t} links={LINKS} />

      {/* Mobile-only overlays — sticky CTA stacks above dock. */}
      <MobileScrollDock t={t} lang={lang} activeSection={activeSection} visible={midScrollVisible && activeSection !== "contact"} />

      <PortfolioTweaks t={tweaks} setTweak={setTweak} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
