/* Product landing runtime: language, chapter navigation and lightweight motion. */
(function () {
  "use strict";

  var slug = window.__LP_SLUG__;
  var root = document.getElementById("lp-root");
  var product = (window.LANDINGS || {})[slug];
  if (!root || !product || typeof window.LP_render !== "function") return;

  var KEY = "sm-lp-lang";
  var LANGS = ["ru", "en", "uz"];
  var revealObserver = null;
  var chapterObserver = null;
  var activeChapter = "thesis";

  function validLang(value) { return LANGS.indexOf(value) !== -1 ? value : null; }
  function getStored() {
    try {
      var urlLang = validLang(new URL(window.location.href).searchParams.get("lang"));
      if (urlLang) return urlLang;
      var saved = validLang(localStorage.getItem(KEY));
      if (saved) return saved;
    } catch (e) { /* URL/storage can be restricted */ }
    return "ru";
  }
  function setStored(lang) {
    try {
      localStorage.setItem(KEY, lang);
      var url = new URL(window.location.href);
      if (lang === "ru") url.searchParams.delete("lang");
      else url.searchParams.set("lang", lang);
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    } catch (e) { /* progressive enhancement */ }
  }
  function titleFor(lang) {
    var copy = (product.i18n && product.i18n[lang]) || {};
    return product.name + (copy.tag ? " — " + copy.tag.replace(/ · /g, " / ") : "");
  }

  function currentChapterId() {
    var chapters = ["thesis", "context", "system", "evidence", "boundary"];
    var hashChapter = (window.location.hash || "").replace(/^#/, "");
    // A chapter click writes the semantic destination immediately, while the
    // smooth scroll may still be travelling. Prefer that explicit intent so a
    // language switch mid-flight cannot snap the reader back a chapter.
    if (chapters.indexOf(hashChapter) !== -1) return hashChapter;
    var sections = root.querySelectorAll("[data-lp-chapter]");
    var best = "thesis"; var bestDistance = Infinity;
    Array.prototype.forEach.call(sections, function (section) {
      var distance = Math.abs(section.getBoundingClientRect().top - 150);
      if (distance < bestDistance) { bestDistance = distance; best = section.getAttribute("data-lp-chapter") || best; }
    });
    return best;
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
    var sections = root.querySelectorAll("[data-lp-chapter]");
    chapterObserver = new IntersectionObserver(function (entries) {
      var visible = entries.filter(function (entry) { return entry.isIntersecting; })
        .sort(function (a, b) { return Math.abs(a.boundingClientRect.top - 150) - Math.abs(b.boundingClientRect.top - 150); });
      if (visible[0]) setActiveChapter(visible[0].target.getAttribute("data-lp-chapter"));
    }, { rootMargin: "-22% 0px -64% 0px", threshold: [0, .01, .2] });
    Array.prototype.forEach.call(sections, function (section) { chapterObserver.observe(section); });

    Array.prototype.forEach.call(root.querySelectorAll("[data-lp-chapter-link]"), function (link) {
      link.addEventListener("click", function (event) {
        var id = link.getAttribute("data-lp-chapter-link");
        var target = root.querySelector('[data-lp-chapter="' + id + '"]');
        if (!target) return;
        event.preventDefault();
        setActiveChapter(id);
        try { history.replaceState(history.state, "", "#" + id); } catch (e) {}
        target.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
    });
    setActiveChapter(activeChapter);
  }

  function wireLanguage(lang) {
    Array.prototype.forEach.call(root.querySelectorAll(".lp-lang-btn"), function (button) {
      button.addEventListener("click", function () {
        var next = validLang(button.getAttribute("data-lang"));
        if (!next || next === lang) return;
        var chapter = currentChapterId();
        setStored(next);
        render(next, chapter, true);
      });
    });
  }

  function wirePointer() {
    var page = root.querySelector(".lp-page");
    if (!page || window.matchMedia("(pointer: coarse)").matches) return;
    page.addEventListener("pointermove", function (event) {
      page.style.setProperty("--lp-pointer-x", ((event.clientX / window.innerWidth) * 100).toFixed(1) + "%");
      page.style.setProperty("--lp-pointer-y", ((event.clientY / window.innerHeight) * 100).toFixed(1) + "%");
    }, { passive: true });
  }

  function render(lang, chapter, preserveChapter) {
    if (revealObserver) revealObserver.disconnect();
    if (chapterObserver) chapterObserver.disconnect();
    activeChapter = chapter || activeChapter || "thesis";
    root.innerHTML = window.LP_render(product, lang);
    document.documentElement.setAttribute("lang", lang);
    document.title = titleFor(lang);
    wireLanguage(lang);
    wireReveal();
    wireChapters();
    wirePointer();
    if (preserveChapter) {
      // The new tree is already committed by innerHTML, so land synchronously;
      // then re-assert once after fonts/layout settle. This also works in hidden
      // tabs where requestAnimationFrame can be suspended indefinitely.
      instantToChapter(activeChapter);
      window.setTimeout(function () { instantToChapter(activeChapter); }, 120);
    }
  }

  var initial = getStored();
  var initialHash = (window.location.hash || "").replace(/^#/, "");
  if (["thesis", "context", "system", "evidence", "boundary"].indexOf(initialHash) !== -1) activeChapter = initialHash;
  if (initial !== "ru") render(initial, activeChapter, false);
  else {
    wireLanguage("ru");
    wireReveal();
    wireChapters();
    wirePointer();
  }
})();
