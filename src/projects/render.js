/* render.js — single source of truth for the product-landing markup.
 *
 * Dual-mode: this same file is `require()`d by build.js (Node) to bake each
 * landing into a static HTML file, AND loaded as a plain <script> on the landing
 * page (browser) so the language switcher can re-render client-side. There is
 * therefore exactly ONE render function — no server/client template drift.
 *
 * Everything here is pure string-building over trusted, authored content, but
 * every interpolated value still passes through esc() so a stray "<" or "&" in
 * copy can never break markup (defensive, and correct if content is ever edited
 * by a less-trusted hand).
 */
(function (root) {
  "use strict";

  var TG = "https://t.me/killallofthem13"; // primary Telegram channel (see main site links)

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // UI chrome strings (section headings, buttons) per language. Product COPY
  // lives in landings-data.js; these are the fixed labels around it.
  var UI = {
    ru: {
      allProjects: "Все проекты",
      closed: "Закрытый проект",
      discuss: "Обсудить проект",
      viewGithub: "Смотреть на GitHub",
      requestAccess: "Запросить доступ",
      quickView: "Кратко",
      product: "Продукт",
      complexity: "Сложность",
      impact: "Эффект",
      what: "Что это",
      problem: "Какую проблему решает",
      stack: "Технический стек",
      architecture: "Архитектура",
      systemMap: "Карта системы",
      why: "Почему именно так",
      unique: "Сильные стороны",
      employer: "Что это доказывает",
      quality: "Как обеспечивалось качество",
      boundary: "Честные границы",
      qaMatrix: "Полная матрица QA-доказательств",
      backHome: "К портфолио",
      footNote: "Часть портфолио Samandar · Full-Stack · AI Automation · QA",
      builtBy: "один инженер · код · архитектура · деплой · QA",
      ctaHead: "Нужен похожий продукт?",
      ctaSub: "Соберу под ключ — от архитектуры до деплоя и QA. Отвечу с оценкой за 24 часа.",
      telegram: "Написать в Telegram",
    },
    en: {
      allProjects: "All projects",
      closed: "Private project",
      discuss: "Discuss a project",
      viewGithub: "View on GitHub",
      requestAccess: "Request access",
      quickView: "At a glance",
      product: "Product",
      complexity: "Complexity",
      impact: "Impact",
      what: "What it is",
      problem: "The problem it solves",
      stack: "Technical stack",
      architecture: "Architecture",
      systemMap: "System map",
      why: "Why this architecture",
      unique: "Strengths",
      employer: "What it proves",
      quality: "How quality was engineered",
      boundary: "Honest boundaries",
      qaMatrix: "Full QA evidence matrix",
      backHome: "Back to portfolio",
      footNote: "Part of Samandar's portfolio · Full-Stack · AI Automation · QA",
      builtBy: "one engineer · code · architecture · deploy · QA",
      ctaHead: "Need something like this?",
      ctaSub: "I'll build it end-to-end — from architecture to deploy and QA. Reply with an estimate within 24h.",
      telegram: "Message on Telegram",
    },
    uz: {
      allProjects: "Barcha loyihalar",
      closed: "Yopiq loyiha",
      discuss: "Loyihani muhokama qilish",
      viewGithub: "GitHub'da ko'rish",
      requestAccess: "Kirish so'rash",
      quickView: "Qisqacha",
      product: "Mahsulot",
      complexity: "Murakkablik",
      impact: "Samara",
      what: "Bu nima",
      problem: "Qanday muammoni yechadi",
      stack: "Texnik stek",
      architecture: "Arxitektura",
      systemMap: "Tizim xaritasi",
      why: "Nega aynan shunday",
      unique: "Kuchli tomonlari",
      employer: "Bu nimani isbotlaydi",
      quality: "Sifat qanday ta'minlangan",
      boundary: "Halol chegaralar",
      qaMatrix: "To'liq QA-dalillar matritsasi",
      backHome: "Portfolioga qaytish",
      footNote: "Samandar portfoliosining bir qismi · Full-Stack · AI Automation · QA",
      builtBy: "bitta muhandis · kod · arxitektura · deploy · QA",
      ctaHead: "Shunga o'xshash mahsulot kerakmi?",
      ctaSub: "Kalit topshiriladigan holda quraman — arxitekturadan deploy va QA'gacha. 24 soatda baho bilan javob beraman.",
      telegram: "Telegram'da yozish",
    },
  };

  function chips(stack) {
    return (stack || [])
      .map(function (s) { return '<span class="lp-chip mono">' + esc(s) + "</span>"; })
      .join("");
  }

  function quickItems(q, ui) {
    var labels = [ui.product, ui.complexity, ui.impact];
    return (q || [])
      .map(function (row, i) {
        return (
          '<div class="lp-quick-item">' +
          '<span class="lp-quick-k mono">' + esc(labels[i] || row.k || "") + "</span>" +
          '<span class="lp-quick-v">' + esc(row.v) + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function block(title, body) {
    if (!body) return "";
    return (
      '<div class="lp-block">' +
      '<h2 class="lp-h2">' + esc(title) + "</h2>" +
      '<p class="lp-p">' + esc(body) + "</p>" +
      "</div>"
    );
  }

  function flowMap(flow, title) {
    if (!flow || !flow.length) return "";
    return (
      '<section class="lp-flow">' +
        '<div class="lp-flow-head">' +
          '<span class="lp-eyebrow mono">SYSTEM · 0' + esc(flow.length) + "</span>" +
          '<h2 class="lp-h2">' + esc(title) + "</h2>" +
        "</div>" +
        '<ol class="lp-flow-track">' +
          flow.map(function (node, i) {
            return (
              '<li class="lp-flow-node">' +
                '<span class="lp-flow-index mono">' + String(i + 1).padStart(2, "0") + "</span>" +
                '<span class="lp-flow-name">' + esc(node) + "</span>" +
              "</li>"
            );
          }).join("") +
        "</ol>" +
      "</section>"
    );
  }

  // Build the full <body> inner HTML for one product in one language.
  // `p` is the whole product record (with .i18n); `lang` selects the copy.
  function LP_render(p, lang) {
    var ui = UI[lang] || UI.ru;
    var c = (p.i18n && p.i18n[lang]) || (p.i18n && p.i18n.ru) || {};
    var base = "../../";               // pages live at /projects/<slug>/
    var visual = base + "assets/proj/" + esc(p.visual);
    var langs = ["ru", "en", "uz"];

    var langBtns = langs
      .map(function (L) {
        return (
          '<button type="button" class="lp-lang-btn' +
          (L === lang ? " is-active" : "") +
          '" data-lang="' + L + '" aria-pressed="' + (L === lang) + '">' +
          L.toUpperCase() +
          "</button>"
        );
      })
      .join("");

    // Secondary CTA. For a private/NDA product the whole card lives on THIS page
    // already, so "request access" goes to the contact form (talk to me) rather
    // than looping back to a GitHub card. Public code-bearing products link to
    // their real repo instead.
    var githubBtn;
    if (p.github) {
      githubBtn =
        '<a class="lp-btn lp-btn-ghost" href="' + esc(p.github) + '" target="_blank" rel="noopener noreferrer">' +
        esc(ui.viewGithub) + ' <span class="lp-arr">↗</span></a>';
    } else if (p.private || p.status === "NDA") {
      githubBtn =
        '<a class="lp-btn lp-btn-ghost" href="' + base + '#contact">' +
        esc(ui.requestAccess) + ' <span class="lp-arr">→</span></a>';
    } else {
      githubBtn = "";
    }

    var qaLink = p.qa
      ? '<a class="lp-qa-link mono" href="' + esc(p.qa) + '" target="_blank" rel="noopener noreferrer">' +
        esc(ui.qaMatrix) + " →</a>"
      : "";

    return (
      // ── top bar ──
      '<header class="lp-bar">' +
        // Back to the exact card this landing was opened from (App scroll-to-hash
        // centres #proj-<slug>; the intro is skipped for hashed loads).
        '<a class="lp-back mono" href="' + base + "#proj-" + esc(p.slug) + '">' +
          '<span class="lp-back-arr">←</span> SAMANDAR' +
        "</a>" +
        '<div class="lp-bar-right">' +
          (p.status ? '<span class="lp-status mono lp-status--' + esc(String(p.status).toLowerCase()) + '">' + esc(p.status) + "</span>" : "") +
          '<div class="lp-lang" role="group" aria-label="language">' + langBtns + "</div>" +
        "</div>" +
      "</header>" +

      '<main class="lp" id="lp-main">' +

        // ── hero ──
        '<section class="lp-hero">' +
          '<div class="lp-hero-text">' +
            '<div class="lp-eyebrow mono">' + esc(c.tag || "") + "</div>" +
            '<h1 class="lp-title">' + esc(p.name) + "</h1>" +
            '<p class="lp-signal">' + esc(c.signal || "") + "</p>" +
            // Credibility line — reinforces the Builder+QA positioning on every
            // product page: who built it + the fact that one person owned the
            // whole cycle including quality.
            '<div class="lp-cred mono">' +
              '<span class="lp-cred-dot" aria-hidden="true"></span>' +
              (c.role ? '<b class="lp-cred-role">' + esc(c.role) + "</b> · " : "") +
              esc(ui.builtBy) +
            "</div>" +
            '<div class="lp-cta">' +
              '<a class="lp-btn lp-btn-primary" href="' + base + '#contact">' +
                esc(ui.discuss) + ' <span class="lp-arr">→</span></a>' +
              githubBtn +
            "</div>" +
          "</div>" +
          '<div class="lp-hero-visual" aria-hidden="true">' +
            '<div class="lp-screen">' +
              '<div class="lp-screen-bar"><i></i><i></i><i></i><span class="mono">/' + esc(p.slug) + "</span></div>" +
              '<div class="lp-screen-body"><img src="' + visual + '" alt="" loading="eager" decoding="async" width="1536" height="512"></div>' +
            "</div>" +
          "</div>" +
        "</section>" +

        // ── at a glance ──
        (c.quick && c.quick.length
          ? '<section class="lp-quick" aria-label="' + esc(ui.quickView) + '">' + quickItems(c.quick, ui) + "</section>"
          : "") +

        // ── what + problem ──
        '<section class="lp-grid2">' +
          block(ui.what, c.what) +
          block(ui.problem, c.problem) +
        "</section>" +

        // ── stack ──
        (p.stack && p.stack.length
          ? '<section class="lp-stack">' +
              '<h2 class="lp-h2">' + esc(ui.stack) + "</h2>" +
              '<div class="lp-chips">' + chips(p.stack) + "</div>" +
            "</section>"
          : "") +

        // ── architecture + why ──
        '<section class="lp-grid2">' +
          block(ui.architecture, c.architecture) +
          block(ui.why, c.why) +
        "</section>" +

        // ── architecture map ──
        flowMap(p.flow, ui.systemMap) +

        // ── strengths + proof ──
        '<section class="lp-grid2">' +
          block(ui.unique, c.unique) +
          block(ui.employer, c.employer) +
        "</section>" +

        // ── quality / QA (the Builder+QA money shot) ──
        (c.quality
          ? '<section class="lp-quality">' +
              '<div class="lp-quality-glow" aria-hidden="true"></div>' +
              '<div class="lp-eyebrow mono lp-quality-eyebrow">Quality · QA</div>' +
              '<h2 class="lp-h2">' + esc(ui.quality) + "</h2>" +
              '<p class="lp-p">' + esc(c.quality) + "</p>" +
              qaLink +
            "</section>"
          : "") +

        // ── honest boundary / residual risk ──
        (c.boundary
          ? '<section class="lp-boundary">' +
              '<span class="lp-boundary-mark mono" aria-hidden="true">!</span>' +
              '<div><div class="lp-eyebrow mono">' + esc(ui.boundary) + "</div>" +
              '<p class="lp-p">' + esc(c.boundary) + "</p></div>" +
            "</section>"
          : "") +

        // ── closing conversion block (the selling climax) ──
        '<section class="lp-final">' +
          '<div class="lp-final-glow" aria-hidden="true"></div>' +
          '<h2 class="lp-final-head">' + esc(ui.ctaHead) + "</h2>" +
          '<p class="lp-final-sub">' + esc(ui.ctaSub) + "</p>" +
          '<div class="lp-cta lp-final-cta">' +
            '<a class="lp-btn lp-btn-primary" href="' + base + '#contact">' +
              esc(ui.discuss) + ' <span class="lp-arr">→</span></a>' +
            '<a class="lp-btn lp-btn-ghost" href="' + TG + '" target="_blank" rel="noopener noreferrer">' +
              esc(ui.telegram) + ' <span class="lp-arr">↗</span></a>' +
          "</div>" +
        "</section>" +

        // ── footer ──
        // Footer goes to the full list — matching its own label ("Все проекты").
        // Returning to the exact card is already covered by the top-bar
        // "← SAMANDAR" link, so both exits exist and neither label lies.
        '<footer class="lp-foot">' +
          '<a class="lp-foot-back mono" href="' + base + '#projects"><span class="lp-back-arr">←</span> ' + esc(ui.allProjects) + "</a>" +
          '<span class="lp-foot-note mono">' + esc(ui.footNote) + "</span>" +
        "</footer>" +

      "</main>"
    );
  }

  root.LP_render = LP_render;
  root.LP_UI = UI;
  root.LP_esc = esc;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { LP_render: LP_render, LP_UI: UI, LP_esc: esc };
  }
})(typeof window !== "undefined" ? window : this);
