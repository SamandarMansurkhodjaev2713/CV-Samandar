// app.jsx — Main app: single Ember theme, fonts, scroll-driven 3D background

const { useEffect: useE, useRef: useR, useState: useS } = React;

// ── Error Boundary (class component — required by React API)
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error("[ErrorBoundary]", err, info); }
  render() {
    if (this.state.error) {
      return (
        <main className="fatal-shell" role="alert">
          <span className="fatal-code mono">RECOVERY · 01</span>
          <h1>Интерфейс не открылся</h1>
          <p>Проекты и контакты в безопасности. Обновите страницу — если сбой повторится, напишите мне напрямую.</p>
          <div className="fatal-actions">
            <button type="button" onClick={() => window.location.reload()}>Обновить страницу</button>
            <a href="https://t.me/killallofthem13">Написать в Telegram</a>
          </div>
          <span className="fatal-foot mono">SAMANDAR · EXECUTIVE AI CODE LAB</span>
        </main>
      );
    }
    return this.props.children;
  }
}

const LINKS = { github: "github.com/SamandarMansurkhodjaev2713", telegram: "t.me/killallofthem13", email: "sam4k27@gmail.com" };
const NAV_SECTIONS = ["about", "projects", "skills", "services", "cv", "faq", "contact"];
// Canonical narrative order. Keep this identical to the section order in
// <main>; tests reject drift so menu numbering, capsule telemetry and the
// mobile rail can never describe three different pages.
const FULL_MENU_SECTIONS = ["hero", "signal", "about", "projects", "builder", "skills", "services", "cv", "process", "faq", "trust", "contact"];
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

function useScrollEngine(setActiveSection) {
  useE(() => {
    const progressEl = document.querySelector(".scroll-progress");
    const sections = [...document.querySelectorAll("section[data-section]")];
    const runtime = window.__SM_MOTION_RUNTIME;
    let current = null;
    let pending = null;
    let metrics = [];
    let maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    let progress = 0;
    let layoutDirty = true;

    function publish(id) {
      if (!id || id === current) return;
      current = id;
      setActiveSection(id);
      document.body.setAttribute("data-active-section", id);
      try { window.dispatchEvent(new CustomEvent("sm:section", { detail: { id } })); } catch (err) { /* optional event channel */ }
    }

    if (runtime && typeof runtime.subscribe === "function") {
      const unsubscribe = runtime.subscribe({
        id: "app-scroll-state",
        priority: 4,
        measure(context) {
          if (layoutDirty || context.input.resized || !metrics.length) {
            const scrollY = context.input.scrollY;
            metrics = sections.map((section) => {
              const rect = section.getBoundingClientRect();
              return {
                id: section.getAttribute("data-section"),
                top: rect.top + scrollY,
                bottom: rect.bottom + scrollY,
              };
            });
            maxScroll = Math.max(0, document.documentElement.scrollHeight - context.input.viewportHeight);
            layoutDirty = false;
          }

          progress = maxScroll > 0 ? context.input.scrollY / maxScroll : 0;
          const anchor = context.input.scrollY + Math.min(320, Math.max(112, context.input.viewportHeight * 0.32));
          pending = metrics.length ? metrics[0].id : "hero";
          for (let i = 0; i < metrics.length; i += 1) {
            if (metrics[i].top <= anchor) pending = metrics[i].id;
            else break;
          }
        },
        mutate() {
          if (progressEl) progressEl.style.transform = `scaleX(${Math.max(0, Math.min(1, progress)).toFixed(4)})`;
          publish(pending);
        },
      });

      let resizeObserver = null;
      if (typeof ResizeObserver === "function") {
        resizeObserver = new ResizeObserver(() => {
          layoutDirty = true;
          runtime.wake("app-layout");
        });
        const main = document.getElementById("main");
        if (main) resizeObserver.observe(main);
      }
      runtime.wake("app-scroll-init");
      return () => {
        unsubscribe();
        if (resizeObserver) resizeObserver.disconnect();
      };
    }

    // Recovery path for old/embedded browsers where the shared runtime did not
    // initialize. It keeps content navigable; production uses the path above.
    let raf = 0;
    function fallbackTick() {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      if (progressEl) progressEl.style.transform = `scaleX(${ratio.toFixed(4)})`;
      const anchor = window.scrollY + Math.min(320, Math.max(112, window.innerHeight * 0.32));
      let next = sections[0] && sections[0].getAttribute("data-section");
      sections.forEach((section) => {
        if (section.offsetTop <= anchor) next = section.getAttribute("data-section");
      });
      publish(next);
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(fallbackTick);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    fallbackTick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
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
  const [menuPresent, setMenuPresent] = useS(false);
  const [peek, setPeek] = useS(null);
  const burgerRef = useR(null);
  const closeRef = useR(null);
  const menuRef = useR(null);
  const destinationRef = useR(null);
  const menuReleaseRef = useR({ timer: 0, release: null });
  // Capsule state — the bar condenses into a floating pill once the reader
  // leaves the very top. Passive + rAF-throttled; no layout reads besides scrollY.
  const [capsule, setCapsule] = useS(false);
  // Real chapter order straight from the DOM — single source of truth shared
  // with the dock (same querySelectorAll pattern), so the counter can never
  // disagree with the actual page.
  const [secOrder, setSecOrder] = useS([]);
  const [clock, setClock] = useS("");
  const menuCopy = {
    ru: { dialog: "Навигация по сайту", open: "Открыть меню", close: "Закрыть меню", language: "Язык", sound: "Звук интерфейса" },
    en: { dialog: "Site navigation", open: "Open menu", close: "Close menu", language: "Language", sound: "Interface sound" },
    uz: { dialog: "Sayt bo‘yicha navigatsiya", open: "Menyuni ochish", close: "Menyuni yopish", language: "Til", sound: "Interfeys ovozi" },
  }[lang] || { dialog: "Site navigation", open: "Open menu", close: "Close menu", language: "Language", sound: "Interface sound" };

  useE(() => {
    setSecOrder([...document.querySelectorAll("section[data-section]")].map((el) => el.getAttribute("data-section")));
    const runtime = window.__SM_MOTION_RUNTIME;
    if (runtime && typeof runtime.subscribe === "function") {
      const unsubscribe = runtime.subscribe({
        id: "nav-capsule",
        priority: 5,
        mutate(context) {
          setCapsule(context.input.scrollY > 64);
        },
      });
      runtime.wake("nav-capsule-init");
      return unsubscribe;
    }

    // Degraded fallback only. Production navigation consumes the shared input
    // stream and does not install a second high-frequency scroll listener.
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
    if (menuReleaseRef.current.timer) {
      window.clearTimeout(menuReleaseRef.current.timer);
      menuReleaseRef.current.timer = 0;
    }
    if (menuReleaseRef.current.release) {
      menuReleaseRef.current.release();
      menuReleaseRef.current.release = null;
    }
    const previouslyFocused = document.activeElement;
    const root = document.documentElement;
    const inertTargets = [
      document.getElementById("main"),
      document.querySelector("footer"),
      document.querySelector(".skip-link"),
      document.querySelector(".mobile-dock"),
      document.querySelector(".nav .brand"),
      document.querySelector(".nav .nav-counter"),
      document.querySelector(".nav .nav-links"),
      document.querySelector(".nav .lang"),
      document.querySelector(".nav .nav-cta"),
      burgerRef.current,
    ].filter(Boolean);
    const inertState = inertTargets.map((element) => ({
      element,
      inert: Boolean(element.inert),
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    const prev = document.body.style.overflow;
    const prevRoot = root.style.overflow;
    document.body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    root.classList.add("menu-lock");
    inertTargets.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        destinationRef.current = null;
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const menu = menuRef.current;
      const controls = (menu
        ? [...menu.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        : []
      ).filter((element, index, all) => element && !element.inert && all.indexOf(element) === index);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    window.requestAnimationFrame(() => {
      if (closeRef.current) closeRef.current.focus({ preventScroll: true });
    });
    function tick() {
      const d = new Date(Date.now() + (5 * 60 + new Date().getTimezoneOffset()) * 60000);
      setClock([d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":"));
    }
    tick();
    const iv = window.setInterval(tick, 1000);
    const release = () => {
      document.body.style.overflow = prev;
      root.style.overflow = prevRoot;
      root.classList.remove("menu-lock");
      inertState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      });
      window.removeEventListener("keydown", onKey);
      window.clearInterval(iv);
      const destination = destinationRef.current;
      destinationRef.current = null;
      if (destination) {
        const target = document.getElementById(destination);
        const focusTarget = target && (target.querySelector("h1, h2, h3") || target);
        if (focusTarget && focusTarget.isConnected) {
          focusTarget.setAttribute("tabindex", "-1");
          focusTarget.focus({ preventScroll: true });
          focusTarget.addEventListener("blur", () => focusTarget.removeAttribute("tabindex"), { once: true });
        }
      } else if (previouslyFocused && previouslyFocused.isConnected && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus({ preventScroll: true });
      }
      menuReleaseRef.current.release = null;
      menuReleaseRef.current.timer = 0;
      setMenuPresent(false);
    };
    menuReleaseRef.current.release = release;
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearInterval(iv);
      menuReleaseRef.current.timer = window.setTimeout(release, 580);
    };
  }, [open]);

  const total = secOrder.length || FULL_MENU_SECTIONS.length;
  const idx = Math.max(0, secOrder.indexOf(active));
  const num = String(idx + 1).padStart(2, "0");
  const extra = EXTRA_SECTION_LABELS[lang] || EXTRA_SECTION_LABELS.ru;
  const activeLabel = t.nav[active] || extra[active] || "";
  const progress = total > 1 ? idx / (total - 1) : 0;

  function go(e, id) {
    e.preventDefault();
    if (open) destinationRef.current = id;
    setOpen(false);
    flyTo(id);
  }

  function closeMenu() {
    destinationRef.current = null;
    haptic("toggle");
    setOpen(false);
  }

  function toggleMenu() {
    if (open) {
      closeMenu();
      return;
    }
    haptic("toggle");
    setMenuPresent(true);
    setOpen(true);
  }

  return (
    // The fullscreen menu is a SIBLING of <nav>, not a child. <nav> carries a
    // backdrop-filter, and a filtered element becomes the containing block for
    // its position:fixed descendants — which trapped the "fullscreen" menu
    // inside the 60px bar (it opened, but as a 1280x59 sliver). Keeping it
    // outside is the only robust fix; z-index keeps the burger clickable above it.
    <>
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
            <li key={k}><a href={`#${k}`} onClick={(e) => go(e, k)} className={active === k ? "active" : ""} aria-current={active === k ? "location" : undefined} data-cursor="link" data-cursor-label={`→ ${t.nav[k]}`}>{t.nav[k]}</a></li>
          ))}
        </ul>

        <div className="nav-right">
          <div className="lang" role="group" aria-label={menuCopy.language}>
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
            ref={burgerRef}
            type="button"
            className="nav-burger"
            aria-label={open ? menuCopy.close : menuCopy.open}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={toggleMenu}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>

    </nav>

      {/* Fullscreen menu — the navigation SCENE (desktop + mobile). Huge type,
          chapter numbering, live telemetry. Items line-mask in with a stagger. */}
      <div
        ref={menuRef}
        id="site-menu"
        className={`nav-menu ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={menuCopy.dialog}
        aria-hidden={!menuPresent}
      >
        <button
          ref={closeRef}
          type="button"
          className="nav-menu-close"
          aria-label={menuCopy.close}
          onClick={closeMenu}
        >
          <span /><span />
        </button>
        <div className="nav-menu-brand mono" aria-hidden="true">
          <span className="brand-mark" />
          <span>SAMANDAR · INDEX / {num}</span>
        </div>
        <div className="nav-menu-glow" aria-hidden="true" />
        <div className="nav-menu-inner">
          <ul className="nav-menu-links" onMouseLeave={() => setPeek(null)}>
            {FULL_MENU_SECTIONS.map((k, i) => (
              <li key={k} style={{ "--i": i }}>
                <a
                  href={`#${k}`} onClick={(e) => go(e, k)} className={active === k ? "active" : ""}
                  aria-current={active === k ? "location" : undefined}
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
            <button type="button" className="sound-toggle mono" aria-label={menuCopy.sound} aria-pressed={document.documentElement.classList.contains("sm-sound")}>
              <span className="sound-toggle-dot" aria-hidden="true" />
              SOUND
            </button>
            <div className="lang nav-menu-lang" role="group" aria-label={menuCopy.language}>
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
    </>
  );
}

function MobileScrollDock({ t, lang, activeSection, visible }) {
  // The rail is a truthful 12-chapter status map, not twelve tiny fake
  // buttons. Navigation lives in the persistent menu; the dock communicates
  // exact position and preserves one clear touch action.
  const activeIdx = Math.max(0, FULL_MENU_SECTIONS.indexOf(activeSection));
  const extra = EXTRA_SECTION_LABELS[lang] || EXTRA_SECTION_LABELS.ru;
  const activeLabel = (t.nav && t.nav[activeSection]) || extra[activeSection] || "";
  function onContactClick(e) {
    e.preventDefault();
    haptic("toggle");
    flyTo("contact");
  }
  return (
    <div className={`mobile-dock ${visible ? "is-visible" : ""}`} role="region" aria-label={lang === "ru" ? "Положение на странице" : lang === "uz" ? "Sahifadagi joylashuv" : "Page position"}>
      <ol className="mobile-dock-dots" aria-hidden="true">
        {FULL_MENU_SECTIONS.map((id, i) => (
          <li key={id}><span className={`mobile-dock-dot ${i === activeIdx ? "is-active" : ""}`} /></li>
        ))}
      </ol>
      <div className="mobile-dock-label mono">
        <span className="mobile-dock-label-num">/{String(activeIdx + 1).padStart(2, "0")}</span>
        <span>{activeLabel}</span>
      </div>
      <a className="mobile-dock-cta" href="#contact" onClick={onContactClick}>
        <span className="mobile-dock-cta-long">{t.hero.cta_primary}</span>
        <span className="mobile-dock-cta-short">{lang === "ru" ? "Обсудить" : lang === "uz" ? "Muhokama" : "Discuss"}</span>
        <span className="arrow" aria-hidden="true">→</span>
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
  const lang = tweaks.lang in window.CONTENT ? tweaks.lang : "ru";
  const t = window.CONTENT[lang];

  // The opening sequence is a real readiness gate, not a decorative timer.
  // While it owns the viewport the application shell is removed from the
  // accessibility tree; readiness is published as three explicit signals.
  useE(() => {
    const intent = window.__SM_INTRO;
    const root = document.getElementById("root");
    if (!intent || !intent.panel) return;

    // The hard ceiling may have shown recovery milliseconds before React
    // mounted. If the shell subsequently arrives, promote it immediately
    // instead of leaving a stale recovery dialog over a healthy application.
    if (intent.doneFired) {
      if (
        intent.reason === "recovery" &&
        intent.panel.parentNode &&
        root &&
        root.childElementCount
      ) {
        root.inert = true;
        root.setAttribute("aria-hidden", "true");
        intent.prepared = true;
        let promoted = false;
        const promoteShell = () => {
          if (promoted) return;
          promoted = true;
          if (intent.panel.parentNode) intent.panel.remove();
          root.inert = false;
          root.removeAttribute("aria-hidden");
        };
        intent.panel.addEventListener("transitionend", promoteShell, { once: true });
        intent.panel.style.transition = "opacity .16s ease";
        intent.panel.style.opacity = "0";
        window.setTimeout(promoteShell, 210);
      } else if (root) {
        root.inert = false;
        root.removeAttribute("aria-hidden");
      }
      return;
    }
    if (!intent.panel.parentNode) return;

    const previousAriaHidden = root ? root.getAttribute("aria-hidden") : null;
    const previousInert = root ? root.inert : false;
    let restored = false;
    let fontTimer = 0;

    if (root) {
      root.inert = true;
      root.setAttribute("aria-hidden", "true");
    }

    function markReady(key, fallback) {
      if (!intent.ready) intent.ready = { shell: false, fonts: false, hero: false };
      if (fallback) {
        if (!intent.fallback) intent.fallback = {};
        intent.fallback[key] = true;
      }
      if (intent.ready[key]) return;
      intent.ready[key] = true;
      if (typeof intent.notify === "function") intent.notify();
      else {
        try {
          window.dispatchEvent(new CustomEvent("sm:intro-readiness", {
            detail: intent.ready,
          }));
        } catch (e) { /* optional channel */ }
      }
    }

    function restoreShell() {
      if (restored) return;
      restored = true;
      if (!root) return;
      root.inert = previousInert;
      if (previousAriaHidden == null) root.removeAttribute("aria-hidden");
      else root.setAttribute("aria-hidden", previousAriaHidden);
    }

    markReady("shell", false);
    // Hero is CSS-native: its complete semantic and visual frame ships with
    // the mounted shell, so there is no decorative image decode to pretend to
    // wait for. The readiness gate still waits for local type metrics.
    markReady("hero", false);

    fontTimer = window.setTimeout(() => markReady("fonts", true), 1250);
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
      document.fonts.ready.then(() => {
        window.clearTimeout(fontTimer);
        markReady("fonts", false);
      }).catch(() => markReady("fonts", true));
    } else {
      window.clearTimeout(fontTimer);
      markReady("fonts", true);
    }

    window.addEventListener("sm:intro-done", restoreShell, { once: true });
    return () => {
      window.clearTimeout(fontTimer);
      window.removeEventListener("sm:intro-done", restoreShell);
      restoreShell();
    };
  }, []);

  // Backfill CV doc fields (id, langs, strengths, foot) so the resume layout
  // renders even if the content bundles haven't been extended yet.
  useE(() => {
    const I18N = {
      ru: {
        id: { name: "Самандар", role: "Software Engineer · Product Builder · QA Engineer",
              meta: ["Ташкент · UTC+5", "Открыт к проектам", "3 курс · Software Engineering"],
              stats: [{ k: "опыт", v: "1 год 8 мес" }, { k: "продуктов", v: "10+" }, { k: "фокус", v: "Builder + QA" }, { k: "языки", v: "RU · UZ · EN" }] },
        exp_title: "опыт", langs_title: "языки", strengths_title: "сильные стороны",
        strengths: [
          { t: "Системное мышление от прод-идеи до прод-деплоя", p: "TTYL Platform — от архитектуры и API до деплоя и багфиксов в проде: весь цикл на одном человеке." },
          { t: "AI-интеграции уровня продакшна, не демки", p: "Klawis (klawis.uz): RAG, гибридный поиск и цитирование источников в живом юридическом AI-продукте." },
          { t: "Качество как часть разработки, а не отдельный этап", p: "QA на TTYL: test plans, Playwright E2E со скриншотами и traces, контроль регрессий перед релизом." },
          { t: "Тёплая коммуникация с клиентами — проверено на практике", p: "UniCall: специалист по работе с клиентами, лучший сотрудник месяца за качество коммуникации." },
        ],
        langs: [{ k: "Русский", label: "свободное владение" }, { k: "Oʻzbek", label: "хороший рабочий" }, { k: "English", label: "хороший рабочий" }],
        foot: "обновлено 2026 · PDF доступен для скачивания",
      },
      en: {
        id: { name: "Samandar", role: "Software Engineer · Product Builder · QA Engineer",
              meta: ["Tashkent · UTC+5", "Open to projects", "3rd-year · Software Engineering"],
              stats: [{ k: "experience", v: "1 yr 8 mos" }, { k: "products", v: "10+" }, { k: "focus", v: "Builder + QA" }, { k: "languages", v: "RU · UZ · EN" }] },
        exp_title: "experience", langs_title: "languages", strengths_title: "strengths",
        strengths: [
          { t: "End-to-end ownership from product idea to prod deploy", p: "TTYL Platform — from architecture and API to deploy and prod bugfixes: the whole cycle on one person." },
          { t: "Production AI integrations, not demos", p: "Klawis (klawis.uz): RAG, hybrid search and source citation in a live legal AI product." },
          { t: "Quality baked into building, not a separate stage", p: "QA at TTYL: test plans, Playwright E2E with screenshots and traces, regression control before release." },
          { t: "Warm client communication — proven in practice", p: "UniCall: customer support specialist, employee of the month for communication quality." },
        ],
        langs: [{ k: "Russian", label: "fluent" }, { k: "Uzbek", label: "good working" }, { k: "English", label: "good working" }],
        foot: "updated 2026 · PDF available to download",
      },
      uz: {
        id: { name: "Samandar", role: "Software Engineer · Product Builder · QA Engineer",
              meta: ["Toshkent · UTC+5", "Loyihalarga ochiq", "3-kurs · Software Engineering"],
              stats: [{ k: "tajriba", v: "1 yil 8 oy" }, { k: "mahsulot", v: "10+" }, { k: "fokus", v: "Builder + QA" }, { k: "tillar", v: "RU · UZ · EN" }] },
        exp_title: "tajriba", langs_title: "tillar", strengths_title: "kuchli tomonlar",
        strengths: [
          { t: "Mahsulot g'oyasidan prod-deploygacha to'liq egalik", p: "TTYL Platform — arxitektura va API'dan deploy va prod-bagfikslargacha: butun sikl bitta odamda." },
          { t: "Production darajadagi AI integratsiyalar", p: "Klawis (klawis.uz): jonli yuridik AI-mahsulotda RAG, gibrid qidiruv va manba iqtiboslari." },
          { t: "Sifat — bosqich emas, ishlab chiqishning bir qismi", p: "TTYL'da QA: test-rejalar, Playwright E2E skrinshot va traces bilan, relizdan oldin regressiya nazorati." },
          { t: "Mijozlar bilan iliq muloqot — amaliyotda sinalgan", p: "UniCall: mijozlar bilan ishlash bo'yicha mutaxassis, muloqot sifati uchun oyning eng yaxshi xodimi." },
        ],
        langs: [{ k: "Ruscha", label: "erkin" }, { k: "Oʻzbek", label: "yaxshi ishchi" }, { k: "English", label: "yaxshi ishchi" }],
        foot: "2026 yil yangilangan · PDF yuklash mumkin",
      },
    };
    Object.entries(I18N).forEach(([L, patch]) => {
      const cv = window.CONTENT?.[L]?.cv;
      if (!cv) return;
      for (const k of Object.keys(patch)) if (cv[k] == null) cv[k] = patch[k];
    });
  }, []);

  // Publish the single theme identity. Palette values live in CSS so first
  // paint and hydrated paint always share one source of truth.
  useE(() => {
    window.applyTheme(tweaks.theme);
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
    let resizeObserver = null;
    let layoutTimer = 0;
    function stopSettling() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (layoutTimer) {
        window.clearTimeout(layoutTimer);
        layoutTimer = 0;
      }
    }
    function cancelOnIntent() {
      cancelled = true;
      stopSettling();
    }
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
          el.scrollIntoView({ behavior: "auto", block: id.indexOf("proj-") === 0 ? "center" : "start" });
        } finally {
          root.style.scrollBehavior = previous;
        }
      }
    }
    // React mount, project expansion and pin-host binding each change layout at
    // a different moment. Re-assert the same deterministic target across those
    // milestones, but stop instantly on any real user intent so the page never
    // fights manual scrolling.
    [0, 120, 360, 760, 1280, 2200].forEach((delay) => {
      timers.push(window.setTimeout(tryScroll, delay));
    });
    const main = document.getElementById("main");
    if (main && typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(() => {
        if (cancelled) return;
        if (layoutTimer) window.clearTimeout(layoutTimer);
        layoutTimer = window.setTimeout(tryScroll, 40);
      });
      resizeObserver.observe(main);
    }
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
      document.fonts.ready.then(() => {
        if (!cancelled) tryScroll();
      }).catch(() => {});
    }
    timers.push(window.setTimeout(stopSettling, 4200));
    return () => {
      cancelled = true;
      stopSettling();
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
  }, [tweaks.motion]);

  // Apply theme/font once on mount.
  useE(() => {
    window.applyTheme(tweaks.theme);
    window.applyFontStack(tweaks.font);
    setCoreReady(true);
  }, []);

  useScrollEngine(setActiveSection);

  // Motion: init smart cursor + reveal observers after first paint, refresh on lang change.
  // isInViewport check in motion.js handles the "no-flash" problem for visible elements.
  useE(() => {
    document.body.classList.add("page-loaded");
    // One reactive policy owns reduced motion and measured performance. Low
    // tier trims expensive continuous movement through CSS, but never removes
    // semantic DOM or sticky contracts irreversibly — a device may recover and
    // earn a higher tier during the same visit.
    var motionPolicy = window.__SM_MOTION_POLICY || window.__SM_PERF;
    var applyMotionPolicy = function (tier, state) {
      var reduced = !!(state && state.reducedMotion);
      var lite = tier === "low" || reduced;
      document.documentElement.toggleAttribute("data-motion-lite", lite);
      document.documentElement.toggleAttribute("data-reduced-motion", reduced);
    };
    var unsubscribeMotionPolicy = function () {};
    if (motionPolicy && typeof motionPolicy.on === "function") {
      unsubscribeMotionPolicy = motionPolicy.on(applyMotionPolicy);
    } else {
      var prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      applyMotionPolicy(prefersReduced ? "low" : "high", { reducedMotion: prefersReduced });
    }
    if (window.Motion) window.Motion.init();
    // Wire the View Transitions API navigator. It binds a global click handler
    // on anchor[href^="#"] and replaces the default scroll with a cinematic
    // cross-fade. Safe to call multiple times — second call is a no-op.
    if (window.SceneCinema && typeof window.SceneCinema.init === "function") {
      window.SceneCinema.init();
    }
    return () => {
      unsubscribeMotionPolicy();
      if (window.SceneCinema && typeof window.SceneCinema.dispose === "function") {
        window.SceneCinema.dispose();
      }
      if (window.Motion && typeof window.Motion.dispose === "function") {
        window.Motion.dispose();
      }
      if (window.__SM_ACTS && typeof window.__SM_ACTS.dispose === "function") {
        window.__SM_ACTS.dispose();
      }
    };
  }, []);
  useE(() => {
    if (!window.Motion) return;
    const id = requestAnimationFrame(() => window.Motion.refresh());
    return () => cancelAnimationFrame(id);
  }, [lang, tweaks.density]);

  // Active section is the only source of truth for the mobile command dock.
  const midScrollVisible = activeSection !== "hero" && activeSection !== "signal" && activeSection !== "contact";

  function skipToMain(event) {
    event.preventDefault();
    const main = document.getElementById("main");
    if (!main) return;
    try { history.replaceState(null, "", "#main"); } catch (e) { /* optional history */ }
    main.focus({ preventScroll: true });
    main.scrollIntoView({ behavior: "auto", block: "start" });
  }

  return (
    <>
      {/* Keyboard/screen-reader skip link — first focusable element. */}
      <a href="#main" className="skip-link" data-no-cinema onClick={skipToMain}>{(t.nav && t.nav.skip) || "К содержимому"}</a>

      <div className="bg-noise" />
      <div className="scroll-progress" />

      <Nav
        t={t}
        lang={lang}
        setLang={(v) => setTweak("lang", v)}
        active={activeSection}
      />

      <main id="main" tabIndex="-1">
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
        <Projects t={t} />
        {/* The constructor sits immediately after the work: you have just seen
            what gets built, so the natural next move is to price your own. It
            used to be the 9th of 12 sections — the single most distinctive
            thing on the site, buried where most readers never reached it. */}
        <ProjectBuilder t={t} links={LINKS} />
        <Skills t={t} />
        {/* Pinned-overlap #1 — Services recedes as CV (the centerpiece) rises.
            Depth handoff via --pin-p (motion.js bindPins); transform/opacity
            only, no sticky. The two sections are DOM-adjacent (required). */}
        <div className="pin-host" data-pin>
          <Services t={t} />
          <CV t={t} links={LINKS} />
        </div>
        <Process t={t} />
        <Faq t={t} />
        {/* Pinned-overlap #2 — Trust recedes as Contact (the closing CTA) rises. */}
        <div className="pin-host" data-pin>
          <Trust t={t} />
          <Interlude data={(t.interludes||[])[1]} index={1} />
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
