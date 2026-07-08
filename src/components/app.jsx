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
        }
      });
    }, { threshold: [0.3, 0.5, 0.7] });
    sections.forEach((s) => io.observe(s));
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); io.disconnect(); };
  }, []);
}

function Nav({ t, lang, setLang, active }) {
  const [open, setOpen] = useS(false);

  // Lock scroll while drawer open, restore on close/unmount.
  useE(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close drawer when section clicked or Escape pressed.
  useE(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className={`nav ${open ? "nav-open" : ""}`}>
      <div className="nav-inner">
        <a href="#hero" className="brand" data-cursor="link" data-cursor-label="↑ top">
          <span className="brand-mark" />
          <span>SAMANDAR<span className="brand-sub"> · EXEC.AI.LAB</span></span>
        </a>
        <ul className="nav-links">
          {NAV_SECTIONS.map((k) => (
            <li key={k}><a href={`#${k}`} className={active === k ? "active" : ""} data-cursor="link" data-cursor-label={`→ ${t.nav[k]}`}>{t.nav[k]}</a></li>
          ))}
        </ul>
        <div className="nav-right">
          <div className="lang" role="group" aria-label="language">
            {["ru", "en", "uz"].map((L) => (
              <button key={L} onClick={() => setLang(L)} className={lang === L ? "active" : ""} aria-pressed={lang === L}>{L.toUpperCase()}</button>
            ))}
          </div>
          {/* Persistent primary CTA — always one click from a conversation. */}
          <a href="#contact" className="nav-cta" data-cursor="send" data-cursor-label="send → contact">
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

      {/* Mobile drawer — full-height overlay with nav links + lang. */}
      <div className={`nav-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <ul className="nav-drawer-links">
          {NAV_SECTIONS.map((k, i) => (
            <li key={k} style={{ "--i": i }}>
              <a href={`#${k}`} onClick={() => setOpen(false)} className={active === k ? "active" : ""}>
                <span className="nav-drawer-num">/{String(i + 1).padStart(2, "0")}</span>
                <span>{t.nav[k]}</span>
                <span className="nav-drawer-arrow">→</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="nav-drawer-foot">
          <a href="#contact" className="nav-drawer-cta" onClick={() => setOpen(false)}>
            {t.hero.cta_primary}
            <span className="arrow">→</span>
          </a>
          <div className="nav-drawer-meta mono">EXECUTIVE AI CODE LAB · v.2026</div>
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

function MobileScrollDock({ t, activeSection, visible }) {
  // 6 dots for the main NAV sections. Tap → smooth scroll + light haptic.
  function onDotClick(id) {
    haptic("tap");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const activeIdx = Math.max(0, NAV_SECTIONS.indexOf(activeSection));
  const activeLabel = (activeSection && t.nav && t.nav[activeSection]) || (t.nav && t.nav[NAV_SECTIONS[0]]) || "";
  return (
    <div className={`mobile-dock ${visible ? "is-visible" : ""}`} role="navigation" aria-label="sections">
      <ol className="mobile-dock-dots">
        {NAV_SECTIONS.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              className={`mobile-dock-dot ${activeSection === id ? "is-active" : ""}`}
              aria-label={t.nav && t.nav[id] ? t.nav[id] : id}
              onClick={() => onDotClick(id)}
            />
          </li>
        ))}
      </ol>
      <div className="mobile-dock-label mono" aria-live="polite">
        <span className="mobile-dock-label-num">/{String(activeIdx + 1).padStart(2, "0")}</span>
        <span>{activeLabel}</span>
      </div>
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
        id: { name: "Самандар", role: "Full-Stack · AI Automation · Product Engineer",
              meta: ["Ташкент · UTC+5", "Открыт к проектам", "3 курс · Software Engineering"],
              stats: [{ k: "опыт", v: "11 мес." }, { k: "проектов", v: "10+" }, { k: "стек", v: "TS / Py / SQL" }, { k: "ответ", v: "< 24h" }] },
        exp_title: "опыт", langs_title: "языки", strengths_title: "сильные стороны",
        strengths: ["Системное мышление от прод-идеи до прод-деплоя", "AI-интеграции уровня продакшна, не демки", "Тёплая коммуникация с клиентами — проверено на горячей линии", "Самостоятельный темп, без надзора"],
        langs: [{ k: "Русский", lv: 100, label: "native" }, { k: "Oʻzbek", lv: 95, label: "fluent" }, { k: "English", lv: 35, label: "базовый" }],
        foot: "сгенерировано 2026 · подписанная версия по запросу",
      },
      en: {
        id: { name: "Samandar", role: "Full-Stack · AI Automation · Product Engineer",
              meta: ["Tashkent · UTC+5", "Open to projects", "3rd-year · Software Engineering"],
              stats: [{ k: "experience", v: "11 mo." }, { k: "projects", v: "10+" }, { k: "stack", v: "TS / Py / SQL" }, { k: "reply", v: "< 24h" }] },
        exp_title: "experience", langs_title: "languages", strengths_title: "strengths",
        strengths: ["End-to-end ownership from product idea to prod deploy", "Production AI integrations, not demos", "Warm client communication — earned on a support hotline", "Async-first; runs without supervision"],
        langs: [{ k: "Russian", lv: 100, label: "native" }, { k: "Uzbek", lv: 95, label: "fluent" }, { k: "English", lv: 35, label: "basic" }],
        foot: "generated 2026 · signed copy on request",
      },
      uz: {
        id: { name: "Samandar", role: "Full-Stack · AI Automation · Product Engineer",
              meta: ["Toshkent · UTC+5", "Loyihalarga ochiq", "3-kurs · Software Engineering"],
              stats: [{ k: "tajriba", v: "11 oy" }, { k: "loyiha", v: "10+" }, { k: "stek", v: "TS / Py / SQL" }, { k: "javob", v: "< 24h" }] },
        exp_title: "tajriba", langs_title: "tillar", strengths_title: "kuchli tomonlar",
        strengths: ["Mahsulot g'oyasidan prod-deploygacha to'liq egalik", "Production darajadagi AI integratsiyalar", "Mijozlar bilan iliq muloqot — ishonch telefonida sinalgan", "Mustaqil sur'at, nazoratsiz ishlash"],
        langs: [{ k: "Ruscha", lv: 100, label: "native" }, { k: "Oʻzbek", lv: 100, label: "ona tili" }, { k: "English", lv: 35, label: "boshlang'ich" }],
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
        <About t={t} />
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
          <Contact t={t} links={LINKS} />
        </div>
      </main>

      <Footer t={t} links={LINKS} />

      {/* Mobile-only overlays — sticky CTA stacks above dock. */}
      <MobileStickyCta t={t} visible={midScrollVisible} />
      <MobileScrollDock t={t} activeSection={activeSection} visible={midScrollVisible} />

      <PortfolioTweaks t={tweaks} setTweak={setTweak} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
