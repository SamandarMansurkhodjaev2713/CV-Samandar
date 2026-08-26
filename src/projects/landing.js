/* Product landing runtime: language, chapter navigation and lightweight motion. */
(function () {
  "use strict";

  function markImageFallback(image) {
    if (!image || image.naturalWidth) return;
    image.hidden = true;
    var frame = image.closest ? image.closest(".lp-photo") : null;
    if (frame) frame.classList.add("is-image-fallback");
  }

  function installImageFallbacks() {
    var images = document.querySelectorAll(".lp-photo img");
    for (var i = 0; i < images.length; i += 1) {
      (function (image) {
        image.addEventListener("error", function () { markImageFallback(image); }, { once: true });
        if (image.complete && !image.naturalWidth) markImageFallback(image);
      })(images[i]);
    }
  }

  installImageFallbacks();

  var LANGS = ["ru", "en", "uz"];
  var slug = document.documentElement.getAttribute("data-lp-slug") || window.__LP_SLUG__;
  var staticLang = validLang(document.documentElement.getAttribute("data-lp-lang")) || "ru";
  var root = document.getElementById("lp-root");
  var product = (window.LANDINGS || {})[slug];
  if (!root || !product || typeof window.LP_render !== "function") return;

  // Locale switches preserve a semantic chapter, not an old pixel offset.
  // Browser scroll restoration can otherwise overwrite the explicit fragment
  // after load when RU/EN/UZ pages have slightly different line wrapping.
  try { history.scrollRestoration = "manual"; } catch (e) { /* progressive enhancement */ }

  var KEY = "sm-lp-lang";
  var revealObserver = null;
  var pendingReveals = [];
  var chapterObserver = null;
  var activeChapter = "thesis";
  var chapterIntent = null;
  var chapterIntentUntil = 0;
  var chapterIntentTimer = 0;
  var chapterScrollHandler = null;
  var chapterScrollFrame = 0;
  var exitPending = false;

  function validLang(value) { return LANGS.indexOf(value) !== -1 ? value : null; }

  function prefersReducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  function prepareNativeExit() {
    if (exitPending) return;
    exitPending = true;
    if (prefersReducedMotion()) return;
    document.documentElement.classList.add("lp-is-leaving");
    document.documentElement.setAttribute("aria-busy", "true");
  }

  function resetExitState() {
    exitPending = false;
    document.documentElement.classList.remove("lp-is-leaving");
    document.documentElement.removeAttribute("aria-busy");
  }
  function requestedLang() {
    try {
      var urlLang = validLang(new URL(window.location.href).searchParams.get("lang"));
      if (urlLang) return urlLang;
    } catch (e) { /* URL/storage can be restricted */ }
    return staticLang;
  }
  function setStored(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) { /* Storage can be restricted. */ }
  }
  function languageUrl(lang, chapter) {
    var url = new URL(window.location.href);
    var basePath = url.pathname.replace(/\/(?:en|uz)\/$/, "/");
    url.pathname = lang === "ru" ? basePath : basePath + lang + "/";
    url.searchParams.delete("lang");
    url.hash = chapter ? "#" + chapter : "";
    return url.pathname + url.search + url.hash;
  }

  function currentChapterId() {
    // Preserve a fresh click intent while smooth scrolling through intermediate
    // chapters. Once the movement settles, the viewport-derived chapter is the
    // source of truth; a stale URL hash must not rewind a later language switch.
    if (chapterIntent && Date.now() < chapterIntentUntil) return chapterIntent;
    if (activeChapter) return activeChapter;
    var sections = root.querySelectorAll("[data-lp-chapter]");
    var best = "thesis"; var bestDistance = Infinity;
    Array.prototype.forEach.call(sections, function (section) {
      var distance = Math.abs(section.getBoundingClientRect().top - 150);
      if (distance < bestDistance) { bestDistance = distance; best = section.getAttribute("data-lp-chapter") || best; }
    });
    return best;
  }

  function hashChapterId() {
    var value = (window.location.hash || "").replace(/^#/, "");
    return ["thesis", "context", "system", "evidence", "boundary"].indexOf(value) !== -1 ? value : null;
  }

  function chapterTopOffset() {
    var bar = root.querySelector(".lp-bar");
    var chapters = root.querySelector(".lp-chapters");
    var barHeight = bar ? bar.getBoundingClientRect().height : 0;
    var chapterHeight = chapters ? chapters.getBoundingClientRect().height : 0;
    return Math.round(barHeight + chapterHeight + 18);
  }

  function chapterAtViewport(sections) {
    // The active chapter is the one that has crossed the actual two sticky
    // navigation rails. A viewport-percentage line made long mobile chapters
    // report the preceding section even after an exact hash jump.
    var activationLine = Math.min(window.innerHeight * .42, chapterTopOffset() + 28);
    var passed = null; var passedTop = -Infinity;
    var nearest = null; var nearestDistance = Infinity;
    Array.prototype.forEach.call(sections, function (section) {
      var top = section.getBoundingClientRect().top;
      var distance = Math.abs(top - activationLine);
      if (distance < nearestDistance) { nearestDistance = distance; nearest = section; }
      if (top <= activationLine && top > passedTop) { passedTop = top; passed = section; }
    });
    var target = passed || nearest;
    return target ? target.getAttribute("data-lp-chapter") : "thesis";
  }

  function syncChapterFromViewport(sections) {
    if (chapterIntent && Date.now() < chapterIntentUntil) return;
    chapterIntent = null;
    setActiveChapter(chapterAtViewport(sections));
  }

  function instantToChapter(id) {
    var target = root.querySelector('[data-lp-chapter="' + id + '"]');
    if (!target) return;
    var html = document.documentElement;
    var body = document.body;
    var previousHtml = html.style.getPropertyValue("scroll-behavior");
    var previousHtmlPriority = html.style.getPropertyPriority("scroll-behavior");
    var previousBody = body.style.getPropertyValue("scroll-behavior");
    var previousBodyPriority = body.style.getPropertyPriority("scroll-behavior");
    html.style.setProperty("scroll-behavior", "auto", "important");
    body.style.setProperty("scroll-behavior", "auto", "important");
    var destination = Math.max(0, window.scrollY + target.getBoundingClientRect().top - chapterTopOffset());
    window.scrollTo(0, destination);
    // Keep the override through the next paint. Restoring it in the same task
    // can make Chromium continue a CSS-smooth hash transaction and expire the
    // chapter intent while it is still crossing intermediate sections.
    window.setTimeout(function () {
      if (previousHtml) html.style.setProperty("scroll-behavior", previousHtml, previousHtmlPriority);
      else html.style.removeProperty("scroll-behavior");
      if (previousBody) body.style.setProperty("scroll-behavior", previousBody, previousBodyPriority);
      else body.style.removeProperty("scroll-behavior");
    }, 0);
  }

  function setActiveChapter(id) {
    if (!id) return;
    activeChapter = id;
    if (id !== "thesis" || window.location.hash) {
      try { history.replaceState(history.state, "", "#" + id); } catch (e) { /* progressive enhancement */ }
    }
    var chapters = ["thesis", "context", "system", "evidence", "boundary"];
    var idx = Math.max(0, chapters.indexOf(id));
    var currentIndex = root.querySelector(".lp-current-index");
    var currentName = root.querySelector(".lp-current-name");
    var links = root.querySelectorAll("[data-lp-chapter-link]");
    if (currentIndex) currentIndex.textContent = String(idx + 1).padStart(2, "0");
    if (currentName && window.LP_UI) {
      var lang = document.documentElement.getAttribute("lang") || "ru";
      var ui = window.LP_UI[lang] || window.LP_UI.ru;
      currentName.textContent = ui.chapters[idx] || "";
    }
    Array.prototype.forEach.call(links, function (link) {
      var on = link.getAttribute("data-lp-chapter-link") === id;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function settleReveal(element) {
    if (!element || element.classList.contains("is-in")) return;
    element.classList.add("is-in");
    if (revealObserver) revealObserver.unobserve(element);
  }

  function settlePassedReveals() {
    if (!pendingReveals.length) return;
    var activationLine = window.innerHeight * .91;
    var ready = [];
    var waiting = [];
    // Batch all geometry reads before class writes so the shared scroll frame
    // does not alternate layout reads and mutations.
    pendingReveals.forEach(function (element) {
      if (!element.isConnected || element.classList.contains("is-in")) return;
      if (element.getBoundingClientRect().top <= activationLine) ready.push(element);
      else waiting.push(element);
    });
    pendingReveals = waiting;
    ready.forEach(settleReveal);
  }

  function wireReveal() {
    if (revealObserver) revealObserver.disconnect();
    var elements = root.querySelectorAll("[data-lp-reveal]");
    pendingReveals = Array.prototype.slice.call(elements);
    if (!("IntersectionObserver" in window)) {
      pendingReveals.forEach(settleReveal);
      pendingReveals = [];
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // A large PageDown/hash/programmatic jump can move a short reveal
        // completely from below to above the viewport between two observer
        // samples. IntersectionObserver then reports a non-intersecting entry
        // whose bottom is already negative. That element has been read past
        // and must settle into its final readable pose instead of remaining
        // transparent forever. Elements still below the viewport stay lazy.
        if (!entry.isIntersecting && entry.boundingClientRect.bottom >= 0) return;
        settleReveal(entry.target);
        pendingReveals = pendingReveals.filter(function (element) { return element !== entry.target; });
      });
    }, { rootMargin: "0px 0px -9% 0px", threshold: .08 });
    Array.prototype.forEach.call(elements, function (el) { revealObserver.observe(el); });
  }

  function wireChapters() {
    if (chapterObserver) chapterObserver.disconnect();
    if (chapterScrollHandler) window.removeEventListener("scroll", chapterScrollHandler);
    if (chapterScrollFrame) { cancelAnimationFrame(chapterScrollFrame); chapterScrollFrame = 0; }
    if (chapterIntentTimer) { clearTimeout(chapterIntentTimer); chapterIntentTimer = 0; }
    var sections = root.querySelectorAll("[data-lp-chapter]");
    chapterObserver = new IntersectionObserver(function () {
      syncChapterFromViewport(sections);
    }, { rootMargin: "-28% 0px -68% 0px", threshold: [0, .01] });
    Array.prototype.forEach.call(sections, function (section) { chapterObserver.observe(section); });

    // IntersectionObserver only reports threshold crossings. A native hash
    // jump may move between two already-intersecting long sections without a
    // new entry, so a single rAF-coalesced scroll listener is the authoritative
    // fallback for the sticky chapter indicator.
    chapterScrollHandler = function () {
      if (chapterScrollFrame) return;
      chapterScrollFrame = requestAnimationFrame(function () {
        chapterScrollFrame = 0;
        settlePassedReveals();
        syncChapterFromViewport(sections);
      });
    };
    window.addEventListener("scroll", chapterScrollHandler, { passive: true });

    if (chapterIntent && Date.now() < chapterIntentUntil) {
      chapterIntentTimer = window.setTimeout(function () {
        chapterIntentTimer = 0;
        chapterIntent = null;
        syncChapterFromViewport(sections);
      }, Math.max(0, chapterIntentUntil - Date.now()) + 40);
    }

    Array.prototype.forEach.call(root.querySelectorAll("[data-lp-chapter-link]"), function (link) {
      link.addEventListener("click", function (event) {
        var id = link.getAttribute("data-lp-chapter-link");
        var target = root.querySelector('[data-lp-chapter="' + id + '"]');
        if (!target) return;
        event.preventDefault();
        chapterIntent = id;
        chapterIntentUntil = Date.now() + 1400;
        if (chapterIntentTimer) clearTimeout(chapterIntentTimer);
        chapterIntentTimer = window.setTimeout(function () {
          chapterIntentTimer = 0;
          chapterIntent = null;
          syncChapterFromViewport(sections);
        }, 1440);
        setActiveChapter(id);
        target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
    });
    setActiveChapter(activeChapter);
  }

  function wireLanguage(lang) {
    Array.prototype.forEach.call(root.querySelectorAll(".lp-lang-btn"), function (button) {
      button.addEventListener("click", function (event) {
        var next = validLang(button.getAttribute("data-lang"));
        if (!next) return;
        if (next === lang) { event.preventDefault(); return; }
        // setActiveChapter keeps the visible chapter reflected in the URL.
        // Prefer that semantic state over a short-lived scroll intent which
        // can still reference the previous chapter on touch browsers.
        var chapter = hashChapterId() || currentChapterId();
        setStored(next);
        // Keep the anchor's native default action authoritative. Updating href
        // before it runs preserves the chapter without making a timer capable
        // of trapping navigation in a throttled or background page.
        button.setAttribute("href", languageUrl(next, chapter));
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
          prepareNativeExit();
        }
      });
    });
  }

  function wireExitLinks() {
    Array.prototype.forEach.call(root.querySelectorAll(".lp-back, .lp-foot-back, .lp-btn-primary"), function (link) {
      link.addEventListener("click", function (event) {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        var href = link.getAttribute("href");
        if (!href) return;
        var target;
        try { target = new URL(href, window.location.href); } catch (e) { return; }
        if (target.origin !== window.location.origin) return;
        // Native navigation is the reliability contract. The exit class is a
        // best-effort visual cue only and never owns or delays the URL change.
        prepareNativeExit();
      });
    });
  }

  function wirePointer() {
    var page = root.querySelector(".lp-page");
    if (!page || window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var frame = 0; var x = 50; var y = 50;
    page.addEventListener("pointermove", function (event) {
      x = (event.clientX / window.innerWidth) * 100;
      y = (event.clientY / window.innerHeight) * 100;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        page.style.setProperty("--lp-pointer-x", x.toFixed(1) + "%");
        page.style.setProperty("--lp-pointer-y", y.toFixed(1) + "%");
      });
    }, { passive: true });
  }

  var initial = requestedLang();
  var initialHash = (window.location.hash || "").replace(/^#/, "");
  if (["thesis", "context", "system", "evidence", "boundary"].indexOf(initialHash) !== -1) {
    activeChapter = initialHash;
    chapterIntent = initialHash;
    chapterIntentUntil = Date.now() + 1500;
  }
  if (initial !== staticLang) {
    window.location.replace(languageUrl(initial, activeChapter));
    return;
  }
  setStored(staticLang);
  wireLanguage(staticLang);
  wireExitLinks();
  wireReveal();
  wireChapters();
  wirePointer();
  if (chapterIntent) {
    // Fragment scrolling is a correctness contract, not decorative motion.
    // Settle synchronously and once more after native load/hash restoration so
    // a browser cannot leave the reader in the preceding sticky chapter.
    var initialChapter = chapterIntent;
    var settleInitialChapter = function () {
      instantToChapter(initialChapter);
      setActiveChapter(initialChapter);
    };
    settleInitialChapter();
    window.setTimeout(settleInitialChapter, 0);
    if (document.readyState !== "complete") {
      window.addEventListener("load", settleInitialChapter, { once: true });
    }
  }
  window.addEventListener("pageshow", resetExitState);
})();
