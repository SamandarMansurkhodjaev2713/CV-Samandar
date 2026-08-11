/* Critical frame-zero boot shell.
   This file is intentionally parser-blocking in <head>: the browser waits for
   it before first paint, so moving it out of index.html enables a strict CSP
   without reintroducing the pre-intro Hero flash. */
(function () {
  "use strict";

  try {
    window.__SM_TEST_MODE = /(?:^|[?&])e2e=1(?:&|$)/.test(window.location.search || "");
    if (window.__SM_TEST_MODE) document.documentElement.classList.add("e2e-stable");

    // Shared section/project deep links must open immediately at their target.
    if (window.location && window.location.hash && window.location.hash.length > 1) return;

    var mm = window.matchMedia;
    var reduced = mm && mm("(prefers-reduced-motion: reduce)").matches;
    var createdAt = performance && performance.now ? performance.now() : Date.now();
    var previousOverflow = document.documentElement.style.overflow;
    var doneFired = false;
    var panel = document.createElement("div");
    panel.id = "sm-intro";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Portfolio loading sequence");
    panel.setAttribute("aria-busy", "true");
    panel.setAttribute("data-intro-mode", reduced ? "reduced" : "full");
    panel.style.cssText =
      "position:fixed;inset:0;z-index:2147483000;background:#1F1E1B;color:#F5F0E6;" +
      "pointer-events:auto;overflow:hidden;isolation:isolate;font-family:Arial,sans-serif;";
    panel.innerHTML =
      '<div class="sm-boot-frame-object" aria-hidden="true" style="position:absolute;right:7vw;top:10vh;width:min(48vw,620px);aspect-ratio:1;border:1px solid rgba(200,155,94,.18);border-radius:50%;opacity:.72;transform:rotate(-12deg)">' +
        '<i style="position:absolute;inset:12%;border:1px solid rgba(245,240,230,.10);border-radius:50%"></i>' +
        '<i style="position:absolute;inset:28%;border:1px solid rgba(217,119,87,.32);border-radius:50%"></i>' +
      '</div>' +
      '<div class="sm-boot sm-boot--head" style="position:absolute;left:50%;top:42%;width:min(520px,82vw);transform:translate(-50%,-50%);display:flex;flex-direction:column;gap:16px">' +
        '<div class="sm-boot-label" style="font:600 10px/1.4 monospace;letter-spacing:.22em;color:#B8AC97">SAMANDAR / PRODUCT LAB <span class="sm-boot-state" style="color:#D97757">BUILD</span></div>' +
        '<div class="sm-boot-proof" aria-hidden="true" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font:500 10px/1.4 monospace;letter-spacing:.14em;color:#6B6353"><span style="color:#F5F0E6">BUILD</span><span>VERIFY</span><span>SHIP</span></div>' +
        '<div class="sm-boot-pct" aria-hidden="true" style="display:flex;align-items:flex-start;font-weight:600;line-height:.8;letter-spacing:-.06em"><span class="sm-boot-pct-n" style="font-size:clamp(64px,12vw,112px)">00</span><span class="sm-boot-pct-sign" style="margin:.08em 0 0 .12em;font:500 clamp(18px,3vw,28px)/1 monospace;color:#D97757">%</span></div>' +
        '<div class="sm-boot-line" aria-hidden="true" style="height:1px;background:rgba(217,119,87,.18);overflow:hidden"><i style="display:block;width:0;height:100%;background:#D97757"></i></div>' +
        '<div class="sm-boot-status" role="status" aria-live="polite" style="font:500 10px/1.4 monospace;letter-spacing:.16em;color:#6B6353">INITIALIZING</div>' +
      "</div>";

    window.__SM_INTRO = {
      mode: reduced ? "reduced" : "full",
      panel: panel,
      createdAt: createdAt,
      ready: { shell: false, fonts: false, hero: false },
      fallback: {},
      previousOverflow: previousOverflow,
      doneFired: false,
    };

    window.__SM_INTRO.notify = function () {
      try {
        window.dispatchEvent(new CustomEvent("sm:intro-readiness", {
          detail: window.__SM_INTRO.ready,
        }));
      } catch (e) { /* Optional readiness channel. */ }
    };

    window.__SM_INTRO.release = function (reason) {
      if (doneFired) return;
      doneFired = true;
      window.__SM_INTRO.doneFired = true;
      window.__SM_INTRO.reason = reason || "complete";
      document.documentElement.classList.remove("intro-lock");
      document.documentElement.style.overflow = previousOverflow;
      document.documentElement.removeAttribute("aria-busy");
      panel.setAttribute("aria-busy", "false");
      try {
        window.dispatchEvent(new CustomEvent("sm:intro-done", {
          detail: { reason: window.__SM_INTRO.reason },
        }));
      } catch (e) { /* Optional completion channel. */ }
    };

    window.__SM_INTRO.recover = function (code) {
      window.__SM_INTRO.prepared = true;
      if (!panel.parentNode) document.documentElement.appendChild(panel);
      panel.setAttribute("role", "alert");
      panel.setAttribute("aria-busy", "false");
      panel.style.cssText =
        "position:fixed;inset:0;z-index:2147483000;background:#1F1E1B;color:#F5F0E6;" +
        "display:grid;place-items:center;padding:24px;overflow:auto;font-family:Arial,sans-serif;";
      panel.innerHTML =
        '<div style="width:min(620px,100%);border-top:1px solid #D97757;padding-top:24px">' +
          '<div style="font:600 11px/1.4 monospace;letter-spacing:.18em;color:#D97757">RECOVERY · ' + (code || "00") + "</div>" +
          '<h1 style="font:600 clamp(34px,8vw,72px)/.98 Arial,sans-serif;margin:22px 0 18px">Сайт не загрузился</h1>' +
          '<p style="max-width:52ch;color:#B8AC97;line-height:1.6;margin:0 0 28px">Обновите страницу. Если соединение нестабильно, напишите мне напрямую — контакты работают независимо от интерфейса.</p>' +
          '<div style="display:flex;flex-wrap:wrap;gap:12px">' +
            '<button type="button" data-sm-reload style="min-height:44px;padding:0 18px;border:1px solid #D97757;background:#D97757;color:#1F1E1B;font-weight:700;cursor:pointer">Обновить страницу</button>' +
            '<a href="https://t.me/killallofthem13" rel="noopener noreferrer" style="min-height:44px;padding:0 18px;border:1px solid #6B6353;color:#F5F0E6;display:inline-flex;align-items:center;text-decoration:none">Написать в Telegram</a>' +
          "</div>" +
        "</div>";
      var reload = panel.querySelector("[data-sm-reload]");
      if (reload) reload.addEventListener("click", function () { window.location.reload(); });
      window.__SM_INTRO.release("recovery");
    };

    document.documentElement.classList.add("intro-lock");
    document.documentElement.setAttribute("aria-busy", "true");
    document.documentElement.style.overflow = "hidden";
    document.documentElement.appendChild(panel);

    // The critical shell must always release even if the main intro module is
    // blocked. This wall-clock fallback also works in background tabs.
    window.__SM_INTRO.safety = setTimeout(function () {
      if (!panel.parentNode) return;
      // release() intentionally unlocks the shell before the authored curtain
      // finishes. If that final transition is starved under CPU load, never
      // leave an invisible pointer-blocking panel in the DOM.
      if (window.__SM_INTRO.doneFired) {
        panel.remove();
        return;
      }
      var root = document.getElementById("root");
      if (root && root.childElementCount) {
        // This is an exceptional hard ceiling, not the normal visual exit.
        // Remove synchronously instead of depending on another delayed timer.
        panel.remove();
        window.__SM_INTRO.release("head-safety-shell");
      } else {
        window.__SM_INTRO.recover("00");
      }
    }, 3150);
  } catch (e) { /* DOM/matchMedia unavailable: skip the intro safely. */ }
})();
