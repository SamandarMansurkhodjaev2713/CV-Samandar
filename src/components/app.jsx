// app.jsx — Main app: single Ember theme, fonts, scroll-driven 3D background

const { useEffect: useE, useRef: useR, useState: useS } = React;

const ERROR_COPY = {
  ru: { code: "ВОССТАНОВЛЕНИЕ", title: "Интерфейс не открылся", body: "Проекты и контакты в безопасности. Обновите страницу — если сбой повторится, напишите мне напрямую.", reload: "Обновить страницу", telegram: "Написать в Telegram" },
  en: { code: "RECOVERY", title: "The interface did not open", body: "Projects and contact links are safe. Reload the page — if the issue repeats, message me directly.", reload: "Reload page", telegram: "Message on Telegram" },
  uz: { code: "TIKLASH", title: "Interfeys ochilmadi", body: "Loyihalar va aloqa havolalari xavfsiz. Sahifani yangilang — muammo takrorlansa, menga to‘g‘ridan-to‘g‘ri yozing.", reload: "Sahifani yangilash", telegram: "Telegram’da yozish" },
};

function initialLanguage() {
  const requested = new URLSearchParams(window.location.search || "").get("lang");
  return requested === "en" || requested === "uz" ? requested : "ru";
}

// ── Error Boundary (class component — required by React API)
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error("[ErrorBoundary]", err, info); }
  render() {
    if (this.state.error) {
      const copy = ERROR_COPY[initialLanguage()] || ERROR_COPY.ru;
      return (
        <main className="fatal-shell" role="alert">
          <span className="fatal-code mono">{copy.code} · 01</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          <div className="fatal-actions">
            <button type="button" onClick={() => window.location.reload()}>{copy.reload}</button>
            <a href="https://t.me/killallofthem13">{copy.telegram}</a>
          </div>
          <span className="fatal-foot mono">SAMANDAR · RELEASE PROOF</span>
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
  ru: { hero: "Старт", signal: "Почему со мной", process: "Метод", builder: "Конструктор", trust: "Качество" },
  en: { hero: "Start", signal: "Why me", process: "Method", builder: "Project builder", trust: "Quality proof" },
  uz: { hero: "Boshlanish", signal: "Nega men", process: "Jarayon", builder: "Konstruktor", trust: "Sifat" },
};

const MAIN_HEAD_META = {
  ru: {
    title: "Samandar — Full-stack Product Engineer, AI Automation & QA",
    description: "Full-stack product engineer и QA-инженер из Ташкента. Создаю web-продукты и AI-автоматизации — от UX и кода до проверенного релиза. Remote, RU/UZ/EN.",
    ogTitle: "Full-stack Product Engineer · AI Automation · QA",
    ogDescription: "Проектирую, собираю и проверяю web-продукты и AI-автоматизации — один ответственный от задачи до релиза.",
    locale: "ru_RU",
  },
  en: {
    title: "Samandar — Full-stack Product Engineer, AI Automation & QA",
    description: "Full-stack product engineer and QA engineer in Tashkent. I design, build and verify web products and AI automation end to end. Remote, RU/UZ/EN.",
    ogTitle: "Full-stack Product Engineer · AI Automation · QA",
    ogDescription: "I design, build and verify web products and AI automation — one owner from the brief to a tested release.",
    locale: "en_US",
  },
  uz: {
    title: "Samandar — Full-stack Product Engineer, AI Automation va QA",
    description: "Toshkentdagi full-stack product engineer va QA muhandisi. Web-mahsulotlar va AI avtomatlashtirishni UX’dan tekshirilgan relizgacha yarataman. Remote, RU/UZ/EN.",
    ogTitle: "Full-stack Product Engineer · AI Automation · QA",
    ogDescription: "Web-mahsulotlar va AI avtomatlashtirishni loyihalayman, yarataman va tekshiraman — vazifadan relizgacha bitta mas’ul.",
    locale: "uz_UZ",
  },
};

function syncMainHead(lang) {
  const meta = MAIN_HEAD_META[lang] || MAIN_HEAD_META.ru;
  const base = "https://samandarmansurkhodjaev2713.github.io/CV-Samandar/";
  const canonical = lang === "ru" ? base : `${base}?lang=${lang}`;
  function setContent(selector, value) {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", value);
  }
  document.title = meta.title;
  setContent('meta[name="description"]', meta.description);
  setContent('meta[property="og:title"]', meta.ogTitle);
  setContent('meta[property="og:description"]', meta.ogDescription);
  setContent('meta[property="og:locale"]', meta.locale);
  setContent('meta[property="og:url"]', canonical);
  setContent('meta[name="twitter:title"]', meta.title);
  setContent('meta[name="twitter:description"]', meta.ogDescription);
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute("href", canonical);
}

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

function resolveInitialTweaks() {
  try {
    const requested = new URL(window.location.href).searchParams.get("lang");
    if (requested && window.CONTENT && requested in window.CONTENT) {
      return { ...TWEAK_DEFAULTS, lang: requested };
    }
  } catch (error) { /* URL APIs can be restricted in embedded previews */ }
  return TWEAK_DEFAULTS;
}

function useScrollEngine(setActiveSection, contentRevision) {
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
  }, [contentRevision]);
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
  if (window.SceneCinema && typeof window.SceneCinema.navigate === "function") {
    window.SceneCinema.navigate(id);
    return;
  }
  const el = document.getElementById(id);
  if (!el) return;
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

// One quiet coordinate system across all twelve chapters. This replaces the
// feeling of unrelated per-section HUD fragments with a single truthful route
// from brief to release. It is decorative; semantic navigation remains in Nav
// and the mobile command dock.
function SystemFrame({ active }) {
  const index = Math.max(0, FULL_MENU_SECTIONS.indexOf(active));
  const total = FULL_MENU_SECTIONS.length;
  const progress = total > 1 ? index / (total - 1) : 0;
  const phase = index < 4 ? "DISCOVER" : index < 8 ? "BUILD" : index < 11 ? "VERIFY" : "RELEASE";
  return (
    <div className="system-frame" aria-hidden="true" style={{ "--system-progress": progress }}>
      <div className="system-frame-tele system-frame-tele--left mono">SAMANDAR / RELEASE PROOF</div>
      <div className="system-frame-tele system-frame-tele--center mono">BRIEF / BUILD / VERIFY / RELEASE</div>
      <div className="system-frame-tele system-frame-tele--right mono">{phase} · {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</div>
      <div className="system-frame-depth"><span className="mono">DELIVERY</span><i /><b /></div>
      <span className="system-frame-corner system-frame-corner--bl" />
      <span className="system-frame-corner system-frame-corner--br" />
    </div>
  );
}

// Per-chapter accents for the menu preview. Deliberately the SAME values
// acts.js paints when you arrive, so the peek is a promise the page keeps.
// Kept as a plain map rather than read from acts.js: the menu must render
// correctly even if that engine failed to load.
const MENU_ACCENT = Object.fromEntries(FULL_MENU_SECTIONS.map((id) => [id, "205, 165, 103"]));

function Nav({ t, lang, setLang, active, contentRevision }) {
  const [open, setOpen] = useS(false);
  const [menuPresent, setMenuPresent] = useS(false);
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
  const menuCopy = {
      ru: {
        dialog: "Навигация по сайту", open: "Открыть оглавление", close: "Закрыть оглавление",
        trigger: "ОГЛАВЛЕНИЕ", language: "Язык", index: "Оглавление", choose: "Выберите главу",
        note: "Один маршрут: позиционирование, работы, процесс и прямой контакт.", current: "Текущая глава",
      },
      en: {
        dialog: "Site navigation", open: "Open index", close: "Close index",
        trigger: "INDEX", language: "Language", index: "Index", choose: "Choose a chapter",
        note: "One route through positioning, work, process and direct contact.", current: "Current chapter",
      },
      uz: {
        dialog: "Sayt bo‘yicha navigatsiya", open: "Mundarijani ochish", close: "Mundarijani yopish",
        trigger: "MUNDARIJA", language: "Til", index: "Mundarija", choose: "Bo‘limni tanlang",
        note: "Pozitsiya, ishlar, jarayon va bevosita aloqa bo‘ylab yagona yo‘l.", current: "Joriy bo‘lim",
      },
  }[lang] || { dialog: "Site navigation", open: "Open index", close: "Close index", trigger: "INDEX", language: "Language", index: "Index", choose: "Choose a chapter", note: "One clear route through the portfolio.", current: "Current chapter" };

  useE(() => {
    setSecOrder([...document.querySelectorAll("section[data-section]")].map((el) => el.getAttribute("data-section")));
    const runtime = window.__SM_MOTION_RUNTIME;
    if (runtime && typeof runtime.subscribe === "function") {
      let capsuleState = false;
      const unsubscribe = runtime.subscribe({
        id: "nav-capsule",
        priority: 5,
        mutate(context) {
          const next = context.input.scrollY > 64;
          if (next === capsuleState) return;
          capsuleState = next;
          setCapsule(next);
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
  }, [contentRevision]);

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
      // The visual shutter now clears in 360 ms. Keep the semantic/inert lock
      // only a hair longer than the pixels, otherwise a destination feels
      // frozen after it is already visible. The old 580 ms release was
      // especially obvious on touch and made the menu feel heavier than the
      // whole page transition it initiated.
      menuReleaseRef.current.timer = window.setTimeout(release, 390);
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
    <>
      <nav
        aria-label={t.nav.label || "Primary navigation"}
        className={`nav ${open ? "nav-open" : ""} ${capsule ? "is-capsule" : ""}`}
        style={{ "--nav-progress": `${Math.max(0.04, progress) * 100}%` }}
      >
        <div className="nav-inner">
          <a href="#hero" className="brand" data-cursor="link" data-cursor-label="↑ top" onClick={(e) => go(e, "hero")}>
            <span className="brand-mark" aria-hidden="true">S</span>
            <span className="brand-name">SAMANDAR<span className="brand-sub"> / PRODUCT ENGINEER</span></span>
          </a>

          <a className="nav-counter" href={`#${active}`} onClick={(e) => go(e, active)} aria-label={`${menuCopy.current}: ${activeLabel}`}>
            <span className="nav-counter-coordinate mono"><Drum value={num} /><span className="nav-counter-sep">/{String(total).padStart(2, "0")}</span></span>
            <span key={active} className="nav-counter-name">{activeLabel}</span>
            <span className="nav-counter-track" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></span>
          </a>

          <ul className="nav-links" aria-hidden="true">
            {NAV_SECTIONS.map((k) => <li key={k}><a href={`#${k}`} tabIndex="-1">{t.nav[k]}</a></li>)}
          </ul>

          <div className="nav-right">
            <a href="#contact" className="nav-cta" data-cursor="send" data-cursor-label="send → contact" onClick={(e) => go(e, "contact")}>
              <span>{t.hero.cta_primary}</span><span className="arrow" aria-hidden="true">→</span>
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
              <span className="nav-burger-label">{menuCopy.trigger}</span>
              <span className="nav-burger-lines" aria-hidden="true"><i /><i /></span>
            </button>
          </div>
        </div>
      </nav>

      <div
        ref={menuRef}
        id="site-menu"
        className={`nav-menu ${menuPresent ? "is-present" : ""} ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={menuCopy.dialog}
        aria-hidden={!menuPresent}
        inert={menuPresent ? undefined : ""}
      >
        <button ref={closeRef} type="button" className="nav-menu-close" data-cursor="close" aria-label={menuCopy.close} onClick={closeMenu}>
          <span /><span />
        </button>

        <div className="nav-menu-brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>SAMANDAR</span>
          <span className="mono">{menuCopy.index} / {String(total).padStart(2, "0")}</span>
        </div>

        <div className="nav-menu-inner">
          <header className="nav-menu-intro">
            <span className="mono">{menuCopy.index}</span>
            <h2>{menuCopy.choose}</h2>
            <p>{menuCopy.note}</p>
          </header>

          <ul className="nav-menu-links">
            {FULL_MENU_SECTIONS.map((k, i) => (
              <li key={k} style={{ "--i": i }}>
                <a href={`#${k}`} onClick={(e) => go(e, k)} className={active === k ? "active" : ""} aria-current={active === k ? "location" : undefined}>
                  <span className="nav-menu-num mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="nav-menu-mask"><span className="nav-menu-word">{t.nav[k] || FULL_MENU_LABELS[lang][k]}</span></span>
                  <span className="nav-menu-arrow" aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>

          <aside className="nav-peek is-on" aria-hidden="true">
            <span className="nav-peek-label mono">{menuCopy.current}</span>
            <span className="nav-peek-num">{num}</span>
            <span className="nav-peek-name">{activeLabel}</span>
            <span className="nav-peek-rule" />
          </aside>

          <div className="nav-menu-foot">
            <a href="#contact" className="nav-menu-cta" onClick={(e) => go(e, "contact")}>
              {t.hero.cta_primary} <span className="arrow">→</span>
            </a>
            <div className="lang nav-menu-lang" role="group" aria-label={menuCopy.language}>
              {["ru", "en", "uz"].map((L) => (
                <button key={L} onClick={() => setLang(L)} className={lang === L ? "active" : ""} aria-pressed={lang === L}>{L.toUpperCase()}</button>
              ))}
            </div>
            <div className="nav-menu-fact mono"><span>TASHKENT · UTC+5</span><span>REMOTE · RU / UZ / EN</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

function MobileScrollDock({ t, lang, activeSection, visible }) {
  const activeIdx = Math.max(0, FULL_MENU_SECTIONS.indexOf(activeSection));
  const progress = FULL_MENU_SECTIONS.length > 1 ? activeIdx / (FULL_MENU_SECTIONS.length - 1) : 0;
  const extra = EXTRA_SECTION_LABELS[lang] || EXTRA_SECTION_LABELS.ru;
  const activeLabel = (t.nav && t.nav[activeSection]) || extra[activeSection] || "";
  function onContactClick(e) {
    e.preventDefault();
    haptic("toggle");
    flyTo("contact");
  }
  return (
    <div className={`mobile-dock ${visible ? "is-visible" : ""} ${activeSection === "projects" ? "is-project-context" : ""}`} role="region" aria-label={lang === "ru" ? "Положение на странице" : lang === "uz" ? "Sahifadagi joylashuv" : "Page position"}>
      <span className="mobile-dock-progress" aria-hidden="true"><i style={{ transform: `scaleX(${progress})` }} /></span>
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
  const [tweaks, setTweak] = useTweaks(resolveInitialTweaks());
  const [activeSection, setActiveSection] = useS("hero");
  const initialSection = (window.location.hash || "").replace(/^#/, "");
  const [renderStage, setRenderStage] = useS(
    initialSection && initialSection !== "hero" && initialSection !== "signal" ? 4 : 0
  );
  const lang = tweaks.lang in window.CONTENT ? tweaks.lang : "ru";
  const t = window.CONTENT[lang];

  // Keep the first commit deliberately small. A cold mobile browser otherwise
  // has to reconcile twelve chapters and twenty-nine cards in one task, which
  // can postpone both Intro release and the first interactive Hero. Staging is
  // progressive rendering, not lazy content: every chapter is mounted within
  // the authored Intro window, while a deep link starts with the complete DOM
  // so its target can be restored synchronously.
  useE(() => {
    if (renderStage >= 4) return;
    const timers = [];
    const frames = [];
    function promote(stage, delay) {
      timers.push(window.setTimeout(() => {
        frames.push(window.requestAnimationFrame(() => {
          const update = () => setRenderStage((current) => Math.max(current, stage));
          if (typeof React.startTransition === "function") React.startTransition(update);
          else update();
        }));
      }, delay));
    }
    promote(1, 0);    // Profile proof
    promote(2, 90);   // Project catalog
    promote(3, 180);  // Builder + stack
    promote(4, 270);  // Remaining proof chapters + footer
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      frames.forEach((frame) => window.cancelAnimationFrame(frame));
    };
  }, []);

  // SceneCinema can receive a menu intent during the staged first mount. Make
  // the requested semantic chapter available immediately; the navigator then
  // waits for the committed DOM node and completes the original click.
  useE(() => {
    function ensureSection(event) {
      const id = event && event.detail && event.detail.id;
      if (id && FULL_MENU_SECTIONS.includes(id) && id !== "hero" && id !== "signal") {
        setRenderStage(4);
      }
    }
    window.addEventListener("sm:ensure-section", ensureSection);
    return () => window.removeEventListener("sm:ensure-section", ensureSection);
  }, []);

  // The opening sequence is a real readiness gate, not a decorative timer.
  // While it owns the viewport the application shell is rendered behind the
  // opaque proof layer but removed from input and the accessibility tree;
  // readiness is published as three explicit signals. Keeping the final shell
  // in layout gives LCP/CLS an honest view of the page without a pre-intro
  // flash or an actionable half-mounted interface.
  useE(() => {
    const intent = window.__SM_INTRO;
    const root = document.getElementById("root");
    if (!intent || !intent.panel) return;

    function unveilRoot() {
      if (typeof intent.unveilRoot === "function") intent.unveilRoot();
    }

    function clearCompletedOverlay() {
      // A saturated browser can commit the React tree, defer passive effects
      // until after the Intro recovery deadline, and then deliver completion
      // while the healthy shell already exists. A completed Intro must never
      // retain a full-screen interaction shield, regardless of which bounded
      // fallback produced the completion reason.
      if (
        !intent.doneFired ||
        !intent.panel.parentNode ||
        !root ||
        !root.childElementCount
      ) return false;
      intent.prepared = true;
      intent.panel.remove();
      unveilRoot();
      root.inert = false;
      root.removeAttribute("aria-hidden");
      return true;
    }

    // The hard ceiling may have completed milliseconds before React's passive
    // effect. Promote the mounted shell synchronously in that state.
    if (intent.doneFired) {
      if (!clearCompletedOverlay() && root) {
        root.inert = false;
        root.removeAttribute("aria-hidden");
      }
      return;
    }
    if (!intent.panel.parentNode) {
      // A release owner must publish state before detaching its interaction
      // shield. If an engine/extension removed the node out of band, restore
      // the same invariant here so the shell cannot remain locked with an
      // undefined completion state.
      intent.prepared = true;
      if (typeof intent.release === "function") {
        intent.release("head-safety-detached-shell");
      } else if (root) {
        root.inert = false;
        root.removeAttribute("aria-hidden");
      }
      return;
    }

    const headOwnsRootLock = root && root.getAttribute("data-sm-intro-lock") === "head";
    const previousAriaHidden = headOwnsRootLock ? null : (root ? root.getAttribute("aria-hidden") : null);
    const previousInert = headOwnsRootLock ? false : (root ? root.inert : false);
    let restored = false;
    let fontTimer = 0;

    if (root) {
      root.inert = true;
      root.setAttribute("aria-hidden", "true");
      root.removeAttribute("data-sm-intro-lock");
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
      unveilRoot();
      root.inert = previousInert;
      if (previousAriaHidden == null) root.removeAttribute("aria-hidden");
      else root.setAttribute("aria-hidden", previousAriaHidden);
    }

    function onIntroDone() {
      clearCompletedOverlay();
      restoreShell();
    }

    markReady("shell", false);

    // The proof compiler is code-native HTML/SVG and already exists in the
    // parser-painted frame zero. There is no raster decode to wait for and no
    // false media fallback to report; the mounted shell is the truthful gate.
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

    window.addEventListener("sm:intro-done", onIntroDone, { once: true });
    return () => {
      window.clearTimeout(fontTimer);
      window.removeEventListener("sm:intro-done", onIntroDone);
      restoreShell();
    };
  }, []);

  // Backfill CV doc fields (id, langs, strengths, foot) so the resume layout
  // renders even if the content bundles haven't been extended yet.
  useE(() => {
    const productCount = Array.isArray(window.PRODUCT_REGISTRY)
      ? window.PRODUCT_REGISTRY.filter((product) => product && product.catalog !== false).length
      : 30;
    const I18N = {
      ru: {
        id: { name: "Самандар", role: "Product Engineer · Full-stack Developer · AI Automation · QA Engineering",
              meta: ["Ташкент · UTC+5", "Открыт к проектам", "3 курс · Software Engineering"],
              stats: [{ k: "опыт", v: "1 год 8 мес" }, { k: "продуктов", v: String(productCount) }, { k: "фокус", v: "Builder + QA" }, { k: "языки", v: "RU · UZ · EN" }] },
        exp_title: "опыт", langs_title: "языки", strengths_title: "сильные стороны",
        strengths: [
          { t: "Системное мышление от идеи до релизной готовности", p: "TTYL Platform — архитектура, API, релизная проверка и исправление дефектов перед передачей: весь цикл на одном человеке." },
          { t: "AI-интеграции уровня продакшна, не демки", p: "Klawis (klawis.uz): RAG, гибридный поиск и цитирование источников в живом юридическом AI-продукте." },
          { t: "Качество как часть разработки, а не отдельный этап", p: "QA на TTYL: test plans, Playwright E2E со скриншотами и traces, контроль регрессий перед релизом." },
          { t: "Тёплая коммуникация с клиентами — проверено на практике", p: "UniCall: специалист по работе с клиентами, лучший сотрудник месяца за качество коммуникации." },
        ],
        langs: [{ k: "Русский", label: "свободное владение" }, { k: "Oʻzbek", label: "рабочий уровень" }, { k: "English", label: "рабочий уровень" }],
        foot: "обновлено 2026 · PDF доступен для скачивания",
      },
      en: {
        id: { name: "Samandar", role: "Product Engineer · Full-stack Developer · AI Automation · QA Engineering",
              meta: ["Tashkent · UTC+5", "Open to projects", "3rd-year · Software Engineering"],
              stats: [{ k: "experience", v: "1 yr 8 mos" }, { k: "products", v: String(productCount) }, { k: "focus", v: "Builder + QA" }, { k: "languages", v: "RU · UZ · EN" }] },
        exp_title: "experience", langs_title: "languages", strengths_title: "strengths",
        strengths: [
          { t: "End-to-end ownership from product idea to release readiness", p: "TTYL Platform — architecture, API, release verification and defect fixing before handoff: the whole cycle owned by one person." },
          { t: "Production AI integrations, not demos", p: "Klawis (klawis.uz): RAG, hybrid search and source citation in a live legal AI product." },
          { t: "Quality baked into building, not a separate stage", p: "QA at TTYL: test plans, Playwright E2E with screenshots and traces, regression control before release." },
          { t: "Warm client communication — proven in practice", p: "UniCall: customer support specialist, employee of the month for communication quality." },
        ],
        langs: [{ k: "Russian", label: "fluent" }, { k: "Uzbek", label: "working proficiency" }, { k: "English", label: "working proficiency" }],
        foot: "updated 2026 · PDF available to download",
      },
      uz: {
        id: { name: "Samandar", role: "Product Engineer · Full-stack Developer · AI Automation · QA Engineering",
              meta: ["Toshkent · UTC+5", "Loyihalarga ochiq", "3-kurs · Software Engineering"],
              stats: [{ k: "tajriba", v: "1 yil 8 oy" }, { k: "mahsulot", v: String(productCount) }, { k: "fokus", v: "Builder + QA" }, { k: "tillar", v: "RU · UZ · EN" }] },
        exp_title: "tajriba", langs_title: "tillar", strengths_title: "kuchli tomonlar",
        strengths: [
          { t: "Mahsulot g'oyasidan reliz tayyorligigacha to'liq egalik", p: "TTYL Platform — arxitektura, API, reliz tekshiruvi va topshirishdan oldingi defect fix: butun sikl bitta odamda." },
          { t: "Production darajadagi AI integratsiyalar", p: "Klawis (klawis.uz): jonli yuridik AI-mahsulotda RAG, gibrid qidiruv va manba iqtiboslari." },
          { t: "Sifat — bosqich emas, ishlab chiqishning bir qismi", p: "TTYL'da QA: test-rejalar, Playwright E2E skrinshot va traces bilan, relizdan oldin regressiya nazorati." },
          { t: "Mijozlar bilan iliq muloqot — amaliyotda sinalgan", p: "UniCall: mijozlar bilan ishlash bo'yicha mutaxassis, muloqot sifati uchun oyning eng yaxshi xodimi." },
        ],
        langs: [{ k: "Ruscha", label: "erkin" }, { k: "Oʻzbek", label: "ishchi daraja" }, { k: "Inglizcha", label: "ishchi daraja" }],
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
    let mutationObserver = null;
    let layoutTimer = 0;
    let pulseTimer = 0;
    let settling = true;
    let stableSince = 0;
    const startedAt = performance.now();
    // Production keeps ownership long enough to absorb late font, pin-host and
    // responsive-image layout. E2E mode is already parser-marked `e2e-stable`,
    // disables authored motion/WebGL and runs with deterministic local assets;
    // keeping the production 3.2s observation window there only exposes the
    // suite to headless Firefox SWGL teardown stalls without testing another
    // product state.
    const deterministicTestMode = Boolean(window.__SM_TEST_MODE);
    const minimumWatchMs = deterministicTestMode ? 0 : 3200;
    const stableWindowMs = deterministicTestMode ? 120 : 700;
    const hardCeilingMs = deterministicTestMode ? 1800 : 8000;
    document.documentElement.setAttribute("data-deep-link-settling", id);
    document.documentElement.removeAttribute("data-deep-link-settled");
    function stopSettling() {
      if (!settling) return;
      settling = false;
      document.documentElement.removeAttribute("data-deep-link-settling");
      document.documentElement.setAttribute("data-deep-link-settled", id);
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      if (layoutTimer) {
        window.clearTimeout(layoutTimer);
        layoutTimer = 0;
      }
      if (pulseTimer) {
        window.clearTimeout(pulseTimer);
        pulseTimer = 0;
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
      }
    }
    function cancelOnIntent() {
      cancelled = true;
      stopSettling();
    }
    function cancelOnNavigation(event) {
      const destination = event && event.detail && event.detail.id
        ? String(event.detail.id).replace(/^#/, "")
        : (window.location.hash || "").replace(/^#/, "");
      if (destination && destination !== id) cancelOnIntent();
    }
    window.addEventListener("wheel", cancelOnIntent, { passive: true, once: true });
    window.addEventListener("touchstart", cancelOnIntent, { passive: true, once: true });
    window.addEventListener("pointerdown", cancelOnIntent, { passive: true, once: true });
    window.addEventListener("keydown", cancelOnIntent, { once: true });
    window.addEventListener("sm:navigation-intent", cancelOnNavigation);
    window.addEventListener("hashchange", cancelOnNavigation);
    window.addEventListener("popstate", cancelOnNavigation);
    function schedulePulse(delay) {
      if (cancelled || !settling || pulseTimer) return;
      pulseTimer = window.setTimeout(() => {
        pulseTimer = 0;
        tryScroll();
      }, delay == null ? 120 : delay);
    }
    function sectionDelta(el) {
      const rect = el.getBoundingClientRect();
      if (id.indexOf("proj-") === 0) {
        return rect.top - Math.max(12, (window.innerHeight - rect.height) / 2);
      }
      const margin = Number.parseFloat(window.getComputedStyle(el).scrollMarginTop);
      const desiredTop = Number.isFinite(margin) ? margin : 0;
      return rect.top - desiredTop;
    }
    function tryScroll() {
      if (cancelled || !settling) return;
      const el = document.getElementById(id);
      if (el && el.offsetParent !== null) {
        // A fresh hash load does not pass through SceneCinema, so give it the
        // same single-motion-owner contract here. Otherwise the section can
        // be correctly positioned while its scroll entrance still holds the
        // entire scene at opacity:0/blur — a visually blank deep link.
        const scene = el.matches && el.matches("section[data-enter]")
          ? el
          : (el.closest ? el.closest("section[data-enter]") : null);
        if (scene) scene.classList.add("sec-in", "sec-nav-landed");
        // Force an instant jump even though the root stylesheet declares
        // smooth scrolling. This prevents the delayed two-stage return that
        // was visible for cards near the end of the 21-item catalog.
        const root = document.documentElement;
        const previous = root.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        try {
          const delta = sectionDelta(el);
          if (Math.abs(delta) > 2) {
            stableSince = 0;
            if (id.indexOf("proj-") === 0) {
              el.scrollIntoView({ behavior: "auto", block: "center", inline: "center" });
            } else {
              window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: "auto" });
            }
          } else if (!stableSince) {
            stableSince = performance.now();
          }
        } finally {
          root.style.scrollBehavior = previous;
        }

        // E2E pages already disable authored transitions and late visual
        // effects at parser time. Once the mounted shell owns the requested
        // target and one geometry correction has completed, waiting on font
        // or observer quiet time adds no product coverage and can starve
        // Firefox under a long serial matrix. Production keeps the full
        // stabilisation window below.
        if (
          deterministicTestMode &&
          document.documentElement.getAttribute("data-app-boot") === "ready"
        ) {
          stopSettling();
          return;
        }
      }
      const now = performance.now();
      const fontsReady = !document.fonts || document.fonts.status === "loaded";
      const shellReady = document.documentElement.getAttribute("data-app-boot") === "ready";
      const stableLongEnough = stableSince && now - stableSince >= stableWindowMs;
      if ((shellReady && fontsReady && now - startedAt >= minimumWatchMs && stableLongEnough) || now - startedAt >= hardCeilingMs) {
        // One last geometry-based correction at the ceiling. Unlike a fixed
        // delay, this survives late pin-host/font layout without fighting real
        // input: every wheel/touch/pointer/key gesture cancels ownership above.
        const finalTarget = document.getElementById(id);
        if (finalTarget && finalTarget.offsetParent !== null) {
          const finalDelta = sectionDelta(finalTarget);
          if (Math.abs(finalDelta) > 2) window.scrollTo({ top: Math.max(0, window.scrollY + finalDelta), behavior: "auto" });
        }
        stopSettling();
        return;
      }
      schedulePulse(120);
    }
    // React mount, project expansion and pin-host binding each change layout at
    // a different moment. Re-assert the same deterministic target across those
    // milestones, but stop instantly on any real user intent so the page never
    // fights manual scrolling.
    [0, 80, 220, 480, 900, 1400].forEach((delay) => {
      timers.push(window.setTimeout(tryScroll, delay));
    });
    const main = document.getElementById("main");
    if (main && typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(() => {
        if (cancelled) return;
        stableSince = 0;
        if (layoutTimer) window.clearTimeout(layoutTimer);
        layoutTimer = window.setTimeout(tryScroll, 40);
      });
      resizeObserver.observe(main);
    }
    if (main && typeof MutationObserver === "function") {
      mutationObserver = new MutationObserver(() => {
        if (cancelled) return;
        stableSince = 0;
        schedulePulse(0);
      });
      mutationObserver.observe(main, { childList: true, subtree: true });
    }
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === "function") {
      document.fonts.ready.then(() => {
        if (!cancelled) tryScroll();
      }).catch(() => {});
    }
    window.addEventListener("load", tryScroll, { once: true });
    window.addEventListener("sm:bootstrap-ready", tryScroll, { once: true });
    schedulePulse(0);
    return () => {
      cancelled = true;
      stopSettling();
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("wheel", cancelOnIntent);
      window.removeEventListener("touchstart", cancelOnIntent);
      window.removeEventListener("pointerdown", cancelOnIntent);
      window.removeEventListener("keydown", cancelOnIntent);
      window.removeEventListener("sm:navigation-intent", cancelOnNavigation);
      window.removeEventListener("hashchange", cancelOnNavigation);
      window.removeEventListener("popstate", cancelOnNavigation);
      window.removeEventListener("load", tryScroll);
      window.removeEventListener("sm:bootstrap-ready", tryScroll);
    };
  }, []);
  useE(() => {
    document.documentElement.setAttribute("data-density", tweaks.density);
    document.documentElement.setAttribute("lang", lang);
    try {
      const url = new URL(window.location.href);
      if (lang === "ru") url.searchParams.delete("lang");
      else url.searchParams.set("lang", lang);
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    } catch (error) { /* progressive enhancement */ }
    syncMainHead(lang);
  }, [tweaks.density, lang]);
  useE(() => {
    document.documentElement.style.setProperty("--motion", String(tweaks.motion));
  }, [tweaks.motion]);

  // Apply theme/font once on mount.
  useE(() => {
    window.applyTheme(tweaks.theme);
    window.applyFontStack(tweaks.font);
  }, []);

  useScrollEngine(setActiveSection, renderStage);

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
  }, [lang, tweaks.density, renderStage]);

  // Active section is the only source of truth for the mobile command dock.
  const midScrollVisible = !["hero", "signal", "cv", "trust", "contact"].includes(activeSection);

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
        contentRevision={renderStage}
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
        {renderStage >= 1 && <>
          <Interlude data={(t.interludes||[])[0]} index={0} />
          <About t={t} />
        </>}
        {renderStage >= 2 && <Projects t={t} />}
        {/* The specification sits immediately after the work: the visitor has
            seen what gets built and can now turn their own idea into a first
            scope, risk and next-step outline without a fake instant quote. */}
        {renderStage >= 3 && <>
          <ProjectBuilder t={t} links={LINKS} />
          <Skills t={t} />
        </>}
        {/* Pinned-overlap #1 — Services recedes as CV (the centerpiece) rises.
            Depth handoff via --pin-p (motion.js bindPins); transform/opacity
            only, no sticky. The two sections are DOM-adjacent (required). */}
        {renderStage >= 4 && <>
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
        </>}
      </main>

      {renderStage >= 4 && <Footer t={t} links={LINKS} />}

      {/* Mobile-only overlays — sticky CTA stacks above dock. */}
      {renderStage >= 4 && <MobileScrollDock t={t} lang={lang} activeSection={activeSection} visible={midScrollVisible && activeSection !== "contact"} />}

      {renderStage >= 4 && <PortfolioTweaks t={tweaks} setTweak={setTweak} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
