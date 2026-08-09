/* The optional project-image shader is intent-loaded. Coarse pointer and
   reduced-motion sessions never download its 3D dependency. */
(function () {
  "use strict";

  var ownScript = document.currentScript;
  var ownUrl = ownScript && ownScript.src ? ownScript.src : "";
  var versionMatch = ownUrl.match(/[?&]v=(\d+)/);
  var version = versionMatch ? "?v=" + versionMatch[1] : "";
  var loading = null;

  function allowed() {
    var policy = window.__SM_MOTION_POLICY || window.__SM_PERF;
    return !!policy && policy.allows("shader") && policy.getState().pointerClass === "fine";
  }

  function loadScript(source) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = source + version;
      script.onload = resolve;
      script.onerror = function () { reject(new Error("OPTIONAL_ASSET " + source)); };
      document.head.appendChild(script);
    });
  }

  function ensure() {
    if (window.__SM_IMGFX) return Promise.resolve(window.__SM_IMGFX);
    if (!allowed()) return Promise.resolve(null);
    if (!loading) {
      loading = loadScript("vendor/three.min.js")
        .then(function () { return loadScript("src/engine/img-fx.js"); })
        .then(function () { return window.__SM_IMGFX || null; })
        .catch(function () { return null; });
    }
    return loading;
  }

  function surface(target) {
    return target && target.closest ? target.closest("[data-imgfx]") : null;
  }

  function onIntent(event) {
    var element = surface(event.target);
    if (!element) return;
    ensure().then(function (effect) {
      if (effect && (event.type === "focusin" || element.matches(":hover"))) effect.attach(element);
    });
  }

  document.addEventListener("pointerover", onIntent, { passive: true });
  document.addEventListener("focusin", onIntent, { passive: true });
  window.__SM_LAZY_EFFECTS = {
    ensure: ensure,
    loaded: function () { return !!window.__SM_IMGFX; },
  };
})();
