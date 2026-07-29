// img-fx.js — living project imagery. The site's signature moment.
//
// Every project illustration becomes a piece of glass: the pointer pushes a
// ripple through it, a scroll carries a wave across it, and the accent light of
// the current act pools where the hand is. Static in a screenshot, alive the
// moment you touch it.
//
// ════════════════════════════════════════════════════════════════════════════
// WHY ONE CONTEXT, NOT ONE PER CARD
// ─────────────────────────────────────────────────────────────────────────────
// The obvious build — a WebGL canvas per card — dies at 21 cards: browsers cap
// live contexts (~16) and silently kill the oldest, and each one costs memory
// and a draw call whether or not anyone is looking at it.
//
// But a pointer can only be in ONE place. So there is exactly one renderer for
// the whole site, and it MOVES: on hover it re-parents into that card, uploads
// that card's texture, and fades in over the plain <img> underneath. On leave
// it fades out, stops its loop and parks. One context, one draw call, and only
// while a human is actually looking at the thing.
//
// The <img> is never removed — it stays as the real, indexable, printable
// content. The canvas is a decorative overlay on top of it, so a WebGL failure,
// a blocked context or a low-power device degrades to exactly what the site
// looked like before: a sharp still image.
//
// TOUCH: there is no hover, so the effect follows the centre-stage card (the
// one crossing the middle of the viewport — see motion.js initCenterStage),
// and only when the frame governor says a shader is affordable at all.
// ════════════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  if (window.__SM_TEST_MODE) return;

  var THREE = window.THREE;
  if (!THREE) return;

  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* opportunistic */ }
  if (reduced) return; // a rippling image is motion, and motion was declined

  var coarse = false;
  try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (e) { /* opportunistic */ }

  var VERT = [
    "varying vec2 vUv;",
    "void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }",
  ].join("\n");

  // The ripple is a ring travelling out from the pointer, not a blob: a blob
  // reads as a smudge, a ring reads as a surface responding.
  var FRAG = [
    "precision mediump float;",
    "varying vec2 vUv;",
    "uniform sampler2D uTex;",
    "uniform vec2 uMouse;",
    "uniform vec2 uCover;",
    "uniform vec3 uAccent;",
    "uniform float uTime;",
    "uniform float uHover;",
    "uniform float uVel;",
    "void main(){",
    // object-fit: cover, done in UV space so the plane never distorts the art
    "  vec2 uv = (vUv - 0.5) * uCover + 0.5;",
    "  vec2 d = uv - uMouse;",
    "  float dist = length(d);",
    "  float falloff = smoothstep(0.45, 0.0, dist);",
    "  float ring = sin(dist * 24.0 - uTime * 3.2) * 0.5 + 0.5;",
    "  vec2 dir = d / max(dist, 0.0001);",
    "  vec2 disp = dir * ring * falloff * 0.020 * uHover;",
    // a scroll drags a slow swell across the whole surface
    "  disp.y += sin(uv.x * 5.5 + uTime * 0.9) * uVel * 0.018;",
    "  vec2 suv = clamp(uv - disp, 0.002, 0.998);",
    // chromatic split tied to the SAME falloff — glass, not an RGB glitch
    "  float ca = falloff * uHover * 0.0038 + abs(uVel) * 0.0022;",
    "  vec4 col = vec4(0.0);",
    "  col.r = texture2D(uTex, clamp(suv + vec2(ca, 0.0), 0.002, 0.998)).r;",
    "  col.g = texture2D(uTex, suv).g;",
    "  col.b = texture2D(uTex, clamp(suv - vec2(ca, 0.0), 0.002, 0.998)).b;",
    "  col.a = 1.0;",
    // the current act's light pools under the hand
    "  col.rgb += uAccent * falloff * uHover * 0.11;",
    "  gl_FragColor = col;",
    "}",
  ].join("\n");

  var renderer = null, scene = null, camera = null, mesh = null, uniforms = null;
  var canvas = null, host = null, raf = 0, disposed = false;
  var loader = new THREE.TextureLoader();
  var textures = {};                 // src → THREE.Texture (shared; images repeat across views)
  var mouse = { x: 0.5, y: 0.5 }, target = { x: 0.5, y: 0.5 };
  var hover = 0, hoverTarget = 0, vel = 0;
  var clock = 0;

  function tierAllows() {
    var P = window.__SM_PERF;
    return !P || P.allows("shader");
  }

  function build() {
    if (renderer) return true;
    try {
      canvas = document.createElement("canvas");
      canvas.className = "imgfx-canvas";
      canvas.setAttribute("aria-hidden", "true");
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      scene = new THREE.Scene();
      camera = new THREE.Camera();
      uniforms = {
        uTex: { value: null },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uCover: { value: new THREE.Vector2(1, 1) },
        uAccent: { value: new THREE.Color(0.85, 0.47, 0.34) },
        uTime: { value: 0 },
        uHover: { value: 0 },
        uVel: { value: 0 },
      };
      mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: uniforms, transparent: true })
      );
      scene.add(mesh);
      return true;
    } catch (e) {
      // No WebGL / context creation refused → the plain <img> is the experience.
      renderer = null;
      return false;
    }
  }

  // Replicate CSS `object-fit: cover` as UV scale factors.
  function coverFactors(imgW, imgH, boxW, boxH) {
    if (!imgW || !imgH || !boxW || !boxH) return [1, 1];
    var imgA = imgW / imgH, boxA = boxW / boxH;
    return imgA > boxA ? [boxA / imgA, 1] : [1, imgA / boxA];
  }

  function readAccent() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue("--act-accent-rgb").trim() ||
              getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
      var p = v.split(/[\s,/]+/).map(Number).filter(function (n) { return !isNaN(n); });
      if (p.length >= 3) return [p[0] / 255, p[1] / 255, p[2] / 255];
    } catch (e) { /* opportunistic */ }
    return [0.85, 0.47, 0.34];
  }

  function attach(el) {
    if (disposed || !tierAllows() || !el || el === host) return;
    var img = el.querySelector("img");
    if (!img || !img.getAttribute("src")) return;
    if (!build()) return;

    host = el;
    var src = img.getAttribute("src");

    function ready(tex) {
      if (host !== el) return; // pointer already moved on — drop this late load
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      uniforms.uTex.value = tex;
      var box = el.getBoundingClientRect();
      var iw = (tex.image && tex.image.width) || 1536, ih = (tex.image && tex.image.height) || 512;
      var cf = coverFactors(iw, ih, box.width, box.height);
      uniforms.uCover.value.set(cf[0], cf[1]);
      var a = readAccent();
      uniforms.uAccent.value.setRGB(a[0], a[1], a[2]);
      resize();
      window.clearTimeout(parkTimer); // a re-entry cancels a pending park
      el.appendChild(canvas);
      el.classList.add("has-imgfx");
      hoverTarget = 1;
      loop();
    }

    if (textures[src]) { ready(textures[src]); return; }
    loader.load(src, function (tex) { textures[src] = tex; ready(tex); }, undefined, function () { detach(el); });
  }

  var parkTimer = 0;
  function detach(el) {
    if (el && host !== el) return;
    hoverTarget = 0; // the loop fades out, then parks the canvas (see loop())
    // Wall-clock backstop. The fade-and-park lives inside the rAF loop, and rAF
    // stops in a backgrounded tab — without this, leaving the page mid-hover
    // would strand the canvas mounted (and the still image hidden under it)
    // until the tab was focused again. park() is idempotent.
    window.clearTimeout(parkTimer);
    parkTimer = window.setTimeout(park, 900);
  }

  function park() {
    window.clearTimeout(parkTimer);
    hover = 0; hoverTarget = 0;
    if (host) {
      host.classList.remove("has-imgfx");
      if (canvas && canvas.parentNode === host) host.removeChild(canvas);
      host = null;
    }
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function resize() {
    if (!host || !renderer) return;
    var b = host.getBoundingClientRect();
    if (b.width < 2 || b.height < 2) return;
    renderer.setSize(b.width, b.height, false);
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!renderer || !host) { park(); return; }
    clock += 0.016;

    // Critically damped follow — the ripple trails the hand instead of snapping
    // to it, which is what makes it read as a material rather than a cursor.
    mouse.x += (target.x - mouse.x) * 0.09;
    mouse.y += (target.y - mouse.y) * 0.09;
    hover += (hoverTarget - hover) * 0.13;
    vel *= 0.92;

    uniforms.uTime.value = clock;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uHover.value = hover;
    uniforms.uVel.value = vel;
    renderer.render(scene, camera);

    if (hoverTarget === 0 && hover < 0.01) park(); // fully faded → release
  }

  // ── Pointer wiring (delegated: React re-renders replace these nodes) ──────
  if (!coarse) {
    document.addEventListener("pointerover", function (e) {
      var el = e.target.closest && e.target.closest("[data-imgfx]");
      if (el) attach(el);
    }, { passive: true });

    document.addEventListener("pointerout", function (e) {
      var el = e.target.closest && e.target.closest("[data-imgfx]");
      if (el && (!e.relatedTarget || !el.contains(e.relatedTarget))) detach(el);
    }, { passive: true });

    document.addEventListener("pointermove", function (e) {
      if (!host) return;
      var b = host.getBoundingClientRect();
      target.x = (e.clientX - b.left) / b.width;
      target.y = 1 - (e.clientY - b.top) / b.height; // GL origin is bottom-left
    }, { passive: true });
  } else {
    // Touch: follow the centre-stage card. motion.js toggles .in-focus on the
    // card crossing the middle of the viewport; we mirror that here.
    window.addEventListener("sm:focus-card", function (e) {
      var card = e && e.detail && e.detail.el;
      if (!card) { if (host) detach(host); return; }
      var box = card.querySelector("[data-imgfx]");
      if (box) { target.x = 0.5; target.y = 0.55; attach(box); }
      else if (host) detach(host);
    });
  }

  // Scroll velocity feeds the swell. Cheap: two reads and a subtraction.
  var lastY = window.pageYOffset || 0;
  window.addEventListener("scroll", function () {
    var y = window.pageYOffset || 0;
    var dy = y - lastY;
    lastY = y;
    if (host) vel = Math.max(-1, Math.min(1, vel + dy * 0.006));
  }, { passive: true });

  window.addEventListener("resize", resize, { passive: true });

  // A tier drop mid-session must actually take the effect off screen.
  if (window.__SM_PERF) {
    window.__SM_PERF.on(function (t) { if (t === "low" && host) { hoverTarget = 0; park(); } });
  }

  window.__SM_IMGFX = {
    attach: attach,
    detach: function () { if (host) detach(host); },
    active: function () { return !!host; },
    hostEl: function () { return host; },
    dispose: function () {
      disposed = true; park();
      if (renderer) { try { renderer.dispose(); } catch (e) { /* opportunistic */ } renderer = null; }
    },
  };
})();
