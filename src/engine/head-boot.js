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
    // Mark that path before returning: the Hero reveal is normally prepared
    // behind Intro, but a deep link has no curtain to hide its starting pose.
    // A deterministic final pose also prevents a back-navigation from showing
    // half-clipped headline lines while fonts and React settle.
    if (window.location && window.location.hash && window.location.hash.length > 1) {
      document.documentElement.classList.add("sm-intro-skip");
      return;
    }

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
      '<div class="sm-boot-frame-object" aria-hidden="true" style="position:absolute;right:5vw;top:14vh;width:min(52vw,720px);height:min(58vh,520px);border:1px solid rgba(200,155,94,.14);opacity:.78">' +
        '<i style="position:absolute;left:9%;right:15%;top:17%;height:18%;border:1px solid rgba(245,240,230,.12);background:linear-gradient(90deg,rgba(245,240,230,.035),transparent);transform:translateX(-4%)"></i>' +
        '<i style="position:absolute;left:15%;right:9%;top:41%;height:18%;border:1px solid rgba(200,155,94,.26);background:linear-gradient(90deg,rgba(200,155,94,.045),transparent)"></i>' +
        '<i style="position:absolute;left:21%;right:3%;top:65%;height:18%;border:1px solid rgba(245,240,230,.12);background:linear-gradient(90deg,rgba(245,240,230,.035),transparent);transform:translateX(4%)"></i>' +
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
      var mountedRoot = document.getElementById("root");
      if (mountedRoot && mountedRoot.getAttribute("data-sm-intro-lock") === "head") {
        mountedRoot.inert = false;
        mountedRoot.removeAttribute("aria-hidden");
        mountedRoot.removeAttribute("data-sm-intro-lock");
      }
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

    // The parser creates #root after this head script. Lock it at the exact
    // moment it appears instead of waiting for a passive React effect: the
    // Intro then owns both pointer input and the accessibility tree from the
    // first semantic frame, even on a saturated browser.
    function lockMountedRoot() {
      var mountedRoot = document.getElementById("root");
      if (!mountedRoot) return false;
      mountedRoot.inert = true;
      mountedRoot.setAttribute("aria-hidden", "true");
      mountedRoot.setAttribute("data-sm-intro-lock", "head");
      return true;
    }
    if (!lockMountedRoot() && typeof MutationObserver !== "undefined") {
      var rootObserver = new MutationObserver(function () {
        if (!lockMountedRoot()) return;
        rootObserver.disconnect();
      });
      rootObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    // The critical shell must always release even if the main intro module is
    // blocked or starts and then loses its final rAF/transition callback. This
    // independent wall-clock ceiling stays armed for the whole Intro; the
    // authored module may finish earlier, but must never cancel its backstop.
    // E2E mode shortens only the independent backstop. Normal visitors keep
    // the authored 3.8 s ceiling; deterministic failure-path tests reach the
    // same release branch before optional application work can starve WebKit's
    // timer queue on a contended host.
    var safetyDelayMs = window.__SM_TEST_MODE ? 900 : 3800;
    var safetyDeadline = createdAt + safetyDelayMs;
    function releaseHeadSafety() {
      if (!panel.parentNode) return;
      var root = document.getElementById("root");
      // This is an exceptional hard ceiling, not the normal visual exit.
      // Remove synchronously instead of depending on another delayed timer.
      // If React is still absent, app-watchdog owns the honest fatal shell at
      // 5.5s; keeping this dialog above a late successful mount is worse.
      panel.remove();
      window.__SM_INTRO.release(root && root.childElementCount ?
        "head-safety-shell" : "head-safety-empty");
    }
    window.__SM_INTRO.safety = setTimeout(releaseHeadSafety, safetyDelayMs);

    // WebKit may starve a timer while parser/defer work saturates the main
    // thread. The safety contract is a wall-clock deadline, not a promise that
    // one timer task will be delivered promptly. Re-check it synchronously at
    // lifecycle boundaries so an already-expired Intro cannot remain above a
    // healthy late shell. These listeners never shorten the authored window.
    function releaseExpiredHeadSafety() {
      if (!panel.parentNode) return;
      var now = performance && performance.now ? performance.now() : Date.now();
      if (now >= safetyDeadline) releaseHeadSafety();
    }
    document.addEventListener("DOMContentLoaded", releaseExpiredHeadSafety, { once: true });
    window.addEventListener("pageshow", releaseExpiredHeadSafety, { once: true });
  } catch (e) { /* DOM/matchMedia unavailable: skip the intro safely. */ }
})();
