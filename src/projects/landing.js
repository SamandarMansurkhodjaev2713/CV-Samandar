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

  var KEY = "sm-lp-lang";
  var revealObserver = null;
  var chapterObserver = null;
  var activeChapter = "thesis";
  var chapterIntent = null;
  var chapterIntentUntil = 0;
  var chapterIntentTimer = 0;
  var chapterScrollHandler = null;
  var chapterScrollFrame = 0;
  var exitPending = false;
  var exitTimer = 0;

  function validLang(value) { return LANGS.indexOf(value) !== -1 ? value : null; }

  function prefersReducedMotion() {
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }

  function navigateWithExit(destination) {
    if (!destination || exitPending) return;
    exitPending = true;
    if (prefersReducedMotion()) {
      window.location.assign(destination);
      return;
    }
    document.documentElement.classList.add("lp-is-leaving");
    document.documentElement.setAttribute("aria-busy", "true");
    exitTimer = window.setTimeout(function () {
      exitTimer = 0;
      window.location.assign(destination);
    }, 440);
  }

  function cancelExitTimer() {
    if (!exitTimer) return;
    window.clearTimeout(exitTimer);
    exitTimer = 0;
  }

  function resetExitState() {
    cancelExitTimer();
    exitPending = false;
    document.documentElement.classList.remove("lp-is-leaving");
    document.documentElement.removeAttribute("aria-busy");
  }
  /* A newer browser navigation owns the page as soon as unload begins. Cancel
     the old aperture timer so a stale language/link intent cannot interrupt a
     programmatic navigation or a rapid user-initiated replacement in WebKit. */
  window.addEventListener("beforeunload", cancelExitTimer);
  window.addEventListener("pagehide", cancelExitTimer);
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

  function chapterAtViewport(sections) {
    var activationLine = Math.max(150, Math.min(window.innerHeight * .3, 260));
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
    var previous = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    try {
      target.scrollIntoView({ behavior: "instant", block: "start" });
    } catch (e) {
      target.scrollIntoView({ behavior: "auto", block: "start" });
    } finally {
      html.style.scrollBehavior = previous;
    }
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

  function wireReveal() {
    if (revealObserver) revealObserver.disconnect();
    var elements = root.querySelectorAll("[data-lp-reveal]");
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(elements, function (el) { el.classList.add("is-in"); });
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
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
        event.preventDefault();
        if (next === lang) return;
        var chapter = currentChapterId();
        setStored(next);
        navigateWithExit(languageUrl(next, chapter));
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
        event.preventDefault();
        navigateWithExit(target.href);
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
    requestAnimationFrame(function () {
      instantToChapter(chapterIntent);
      setActiveChapter(chapterIntent);
    });
  }
  window.addEventListener("pageshow", resetExitState);
})();
