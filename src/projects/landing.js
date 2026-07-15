/* landing.js — the only client-side logic on a product landing.
 * The page ships fully rendered in RU (baked by build.js) and works with no JS;
 * this script just adds the RU/EN/UZ switch, re-rendering the SAME markup via the
 * shared LP_render, and remembers the choice in its own key (decoupled from the
 * main app's edit-mode language state). */
(function () {
  "use strict";

  var slug = window.__LP_SLUG__;
  var root = document.getElementById("lp-root");
  var product = (window.LANDINGS || {})[slug];
  if (!root || !product || typeof window.LP_render !== "function") return;

  var KEY = "sm-lp-lang";
  var LANGS = ["ru", "en", "uz"];

  function getStored() {
    try {
      var v = localStorage.getItem(KEY);
      if (LANGS.indexOf(v) !== -1) return v;
    } catch (e) {}
    return "ru";
  }
  function setStored(l) { try { localStorage.setItem(KEY, l); } catch (e) {} }

  function titleFor(l) {
    var c = (product.i18n && product.i18n[l]) || {};
    return product.name + (c.tag ? " — " + c.tag.replace(/ · /g, " / ") : "");
  }

  function wire(current) {
    var btns = root.querySelectorAll(".lp-lang-btn");
    Array.prototype.forEach.call(btns, function (btn) {
      btn.addEventListener("click", function () {
        var l = btn.getAttribute("data-lang");
        if (!l || l === current) return;
        setStored(l);
        apply(l);
      });
    });
  }

  function apply(lang) {
    // Preserve scroll position across a language swap (re-render replaces DOM).
    var y = window.scrollY;
    root.innerHTML = window.LP_render(product, lang);
    document.documentElement.setAttribute("lang", lang);
    document.title = titleFor(lang);
    window.scrollTo(0, y);
    wire(lang);
  }

  var initial = getStored();
  if (initial !== "ru") apply(initial);
  else wire("ru");
})();
