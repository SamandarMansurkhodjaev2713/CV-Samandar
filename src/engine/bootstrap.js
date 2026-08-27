/* Cooperative application bootstrap.
   Fetching is parallel through index.html preloads; execution is ordered and
   yields between dependencies so the intro can paint throughout startup. */
(function () {
  "use strict";

  var ownScript = document.currentScript;
  var ownUrl = ownScript && ownScript.src ? ownScript.src : "";
  var versionMatch = ownUrl.match(/[?&]v=(\d+)/);
  var version = versionMatch ? "?v=" + versionMatch[1] : "";
  var CORE_SCRIPTS = [
    "vendor/react.production.min.js",
    "vendor/react-dom.production.min.js",
    "src/content/product-registry.js",
    "src/content/content.js",
    "src/engine/themes.js",
    "src/engine/perf.js",
    "src/engine/motion-runtime.js",
    "src/engine/builder-estimator.js",
    "src/engine/acts.js",
    "src/engine/motion.js",
    "src/engine/scene-cinema.js",
    "src/engine/lazy-effects.js",
    "src/components/tweaks-panel.js",
    "src/components/components-1.js",
    "src/components/components-2.js",
    "src/components/app.js",
  ];

  function load(source) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = source + version;
      script.async = false;
      script.onload = function () { resolve(source); };
      script.onerror = function () { reject(new Error("BOOT_ASSET " + source)); };
      document.head.appendChild(script);
    });
  }

  function yieldFrame() {
    return new Promise(function (resolve) {
      var settled = false;
      var timer = window.setTimeout(done, 34);
      function done() {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve();
      }
      if (typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(done);
      else done();
    });
  }

  async function boot() {
    for (var index = 0; index < CORE_SCRIPTS.length; index += 1) {
      await load(CORE_SCRIPTS[index]);
      // Yield after the three meaningful startup boundaries. Dynamic script
      // load events already split individual executions into separate tasks;
      // yielding after every tiny file would unnecessarily delay low-FPS tabs.
      if (index === 1 || index === 3 || index === 13) await yieldFrame();
    }
    document.documentElement.setAttribute("data-app-boot", "ready");
    try { window.dispatchEvent(new CustomEvent("sm:bootstrap-ready")); } catch (error) { /* optional */ }
  }

  boot().catch(function (error) {
    document.documentElement.setAttribute("data-app-boot", "failed");
    window.__SM_BOOT_ERROR = String(error && error.message || error || "BOOT_UNKNOWN");
    if (typeof window.__SM_APP_RECOVER === "function") window.__SM_APP_RECOVER("01");
  });
})();
