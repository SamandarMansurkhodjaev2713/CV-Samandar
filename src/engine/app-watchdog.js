/* Pre-React recovery watchdog. Kept external so the production CSP does not
   need unsafe-inline for executable JavaScript. */
(function () {
  "use strict";

  function recover(code) {
    var root = document.getElementById("root");
    if (!root || root.childElementCount) return;
    var intro = document.getElementById("sm-intro");
    if (intro) intro.remove();
    document.documentElement.classList.remove("intro-lock");
    root.innerHTML =
      '<main class="fatal-shell" role="alert">' +
        '<span class="fatal-code mono">RECOVERY · ' + (code || "00") + '</span>' +
        "<h1>Сайт не загрузился</h1>" +
        "<p>Обновите страницу. Если соединение нестабильно, напишите мне напрямую — контакты работают независимо от интерфейса.</p>" +
        '<div class="fatal-actions">' +
          '<button type="button" data-sm-reload>Обновить страницу</button>' +
          '<a href="https://t.me/killallofthem13" rel="noopener noreferrer">Написать в Telegram</a>' +
        "</div>" +
      "</main>";
    var reload = root.querySelector("[data-sm-reload]");
    if (reload) reload.addEventListener("click", function () { window.location.reload(); });
  }

  window.__SM_APP_RECOVER = recover;
  window.__SM_APP_WATCHDOG = window.setTimeout(function () { recover("00"); }, 5500);
})();
