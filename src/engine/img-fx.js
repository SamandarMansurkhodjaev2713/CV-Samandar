// img-fx.js — one reusable WebGL image surface with a finite lifecycle.
//
// The real <img> always remains underneath. This module owns at most one
// renderer, never owns a private RAF, caches only a small LRU of textures and
// degrades to the still image on reduced motion, low tier or context loss.
(function () {
  "use strict";

  var THREE = window.THREE;
  var policy = window.__SM_MOTION_POLICY || window.__SM_PERF || null;
  var runtime = window.__SM_MOTION_RUNTIME || null;
  var MAX_TEXTURES = 6;
  var FADE_BACKSTOP_MS = 900;
  var disposed = false;
  var contextLost = false;
  var renderer = null;
  var scene = null;
  var camera = null;
  var mesh = null;
  var material = null;
  var geometry = null;
  var uniforms = null;
  var canvas = null;
  var host = null;
  var hostRect = null;
  var hostToken = 0;
  var textureSerial = 0;
  var loader = THREE ? new THREE.TextureLoader() : null;
  var textureCache = Object.create(null);
  var textureCount = 0;
  var currentTexture = null;
  var parkTimer = 0;
  var hover = 0;
  var hoverTarget = 0;
  var velocity = 0;
  var mouse = { x: 0.5, y: 0.5 };
  var target = { x: 0.5, y: 0.5 };
  var clock = 0;
  var renderFrames = 0;
  var buildCount = 0;
  var unsubscribePolicy = function () {};
  var unsubscribeRuntime = function () {};
  var coarse = false;
  try { coarse = window.matchMedia("(pointer: coarse)").matches; } catch (error) { /* capability probe */ }

  var VERT = [
    "varying vec2 vUv;",
    "void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }",
  ].join("\n");

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
    "  vec2 uv = (vUv - 0.5) * uCover + 0.5;",
    "  vec2 d = uv - uMouse;",
    "  float dist = length(d);",
    "  float falloff = smoothstep(0.45, 0.0, dist);",
    "  float ring = sin(dist * 24.0 - uTime * 3.2) * 0.5 + 0.5;",
    "  vec2 dir = d / max(dist, 0.0001);",
    "  vec2 disp = dir * ring * falloff * 0.020 * uHover;",
    "  disp.y += sin(uv.x * 5.5 + uTime * 0.9) * uVel * 0.018;",
    "  vec2 suv = clamp(uv - disp, 0.002, 0.998);",
    "  float ca = falloff * uHover * 0.0038 + abs(uVel) * 0.0022;",
    "  vec4 col = vec4(0.0);",
    "  col.r = texture2D(uTex, clamp(suv + vec2(ca, 0.0), 0.002, 0.998)).r;",
    "  col.g = texture2D(uTex, suv).g;",
    "  col.b = texture2D(uTex, clamp(suv - vec2(ca, 0.0), 0.002, 0.998)).b;",
    "  col.a = 1.0;",
    "  col.rgb += uAccent * falloff * uHover * 0.11;",
    "  gl_FragColor = col;",
    "}",
  ].join("\n");

  function stateAllows() {
    if (disposed || contextLost || !THREE || !runtime) return false;
    if (!policy) return !document.hidden;
    return policy.allows("shader");
  }

  function emitState(reason) {
    try {
      window.dispatchEvent(new CustomEvent("sm:imgfx-state", {
        detail: { reason: reason, active: !!host, contextLost: contextLost },
      }));
    } catch (error) { /* optional diagnostics */ }
  }

  function onContextLost(event) {
    if (event && event.preventDefault) event.preventDefault();
    contextLost = true;
    park("context-lost");
    emitState("context-lost");
  }

  function onContextRestored() {
    contextLost = false;
    destroyRenderer(false);
    emitState("context-restored");
  }

  function build() {
    if (renderer) return true;
    if (!stateAllows()) return false;
    try {
      canvas = document.createElement("canvas");
      canvas.className = "imgfx-canvas";
      canvas.setAttribute("aria-hidden", "true");
      canvas.addEventListener("webglcontextlost", onContextLost, false);
      canvas.addEventListener("webglcontextrestored", onContextRestored, false);
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
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
      geometry = new THREE.PlaneGeometry(1, 1);
      material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: uniforms,
        transparent: true,
      });
      mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      buildCount += 1;
      return true;
    } catch (error) {
      destroyRenderer(false);
      return false;
    }
  }

  function destroyRenderer(markDisposed) {
    if (host) park("renderer-destroy");
    if (mesh && scene) {
      try { scene.remove(mesh); } catch (error) { /* optional */ }
    }
    if (geometry) {
      try { geometry.dispose(); } catch (error) { /* optional */ }
    }
    if (material) {
      try { material.dispose(); } catch (error) { /* optional */ }
    }
    if (renderer) {
      try { renderer.dispose(); } catch (error) { /* optional */ }
    }
    if (canvas) {
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      canvas.removeEventListener("webglcontextrestored", onContextRestored, false);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
    renderer = null;
    scene = null;
    camera = null;
    mesh = null;
    geometry = null;
    material = null;
    uniforms = null;
    canvas = null;
    currentTexture = null;
    if (markDisposed) disposed = true;
  }

  function disposeTexture(entry) {
    if (!entry || !entry.texture) return;
    try { entry.texture.dispose(); } catch (error) { /* optional */ }
    entry.texture = null;
  }

  function evictTextures() {
    var keys = Object.keys(textureCache);
    if (keys.length <= MAX_TEXTURES) return;
    keys.sort(function (a, b) { return textureCache[a].lastUsed - textureCache[b].lastUsed; });
    for (var i = 0; i < keys.length && Object.keys(textureCache).length > MAX_TEXTURES; i += 1) {
      var key = keys[i];
      var entry = textureCache[key];
      if (!entry || entry.texture === currentTexture || entry.promise) continue;
      disposeTexture(entry);
      delete textureCache[key];
      textureCount = Math.max(0, textureCount - 1);
    }
  }

  function loadTexture(src) {
    var existing = textureCache[src];
    if (existing) {
      existing.lastUsed = ++textureSerial;
      if (existing.texture) return Promise.resolve(existing.texture);
      return existing.promise;
    }
    var entry = { texture: null, promise: null, lastUsed: ++textureSerial };
    textureCache[src] = entry;
    entry.promise = new Promise(function (resolve, reject) {
      loader.load(src, function (texture) {
        entry.promise = null;
        entry.texture = texture;
        entry.lastUsed = ++textureSerial;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        textureCount += 1;
        evictTextures();
        resolve(texture);
      }, undefined, function (error) {
        entry.promise = null;
        delete textureCache[src];
        reject(error || new Error("Texture load failed"));
      });
    });
    return entry.promise;
  }

  function coverFactors(imageWidth, imageHeight, boxWidth, boxHeight) {
    if (!imageWidth || !imageHeight || !boxWidth || !boxHeight) return [1, 1];
    var imageAspect = imageWidth / imageHeight;
    var boxAspect = boxWidth / boxHeight;
    return imageAspect > boxAspect ? [boxAspect / imageAspect, 1] : [1, imageAspect / boxAspect];
  }

  function readAccent() {
    try {
      var styles = getComputedStyle(document.documentElement);
      var value = styles.getPropertyValue("--act-accent-rgb").trim() || styles.getPropertyValue("--accent-rgb").trim();
      var parts = value.split(/[\s,/]+/).map(Number).filter(function (number) { return !isNaN(number); });
      if (parts.length >= 3) return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
    } catch (error) { /* token fallback */ }
    return [0.85, 0.47, 0.34];
  }

  function removeHostSurface(previous) {
    if (!previous) return;
    previous.classList.remove("has-imgfx");
    if (canvas && canvas.parentNode === previous) previous.removeChild(canvas);
  }

  function park(reason) {
    clearTimeout(parkTimer);
    parkTimer = 0;
    hostToken += 1;
    hover = 0;
    hoverTarget = 0;
    velocity = 0;
    removeHostSurface(host);
    host = null;
    hostRect = null;
    if (runtime) runtime.wake("imgfx-park");
    emitState(reason || "park");
  }

  function resizeRenderer(rect) {
    if (!renderer || !rect || rect.width < 2 || rect.height < 2) return;
    var width = Math.round(rect.width);
    var height = Math.round(rect.height);
    var size = renderer.getSize ? renderer.getSize(new THREE.Vector2()) : null;
    if (!size || Math.round(size.x) !== width || Math.round(size.y) !== height) {
      renderer.setSize(width, height, false);
    }
  }

  function applyTexture(texture, element, token) {
    if (disposed || contextLost || host !== element || token !== hostToken || !uniforms) return;
    currentTexture = texture;
    uniforms.uTex.value = texture;
    hostRect = element.getBoundingClientRect();
    var imageWidth = texture.image && texture.image.width ? texture.image.width : 1536;
    var imageHeight = texture.image && texture.image.height ? texture.image.height : 512;
    var cover = coverFactors(imageWidth, imageHeight, hostRect.width, hostRect.height);
    uniforms.uCover.value.set(cover[0], cover[1]);
    var accent = readAccent();
    uniforms.uAccent.value.setRGB(accent[0], accent[1], accent[2]);
    resizeRenderer(hostRect);
    clearTimeout(parkTimer);
    if (canvas.parentNode !== element) element.appendChild(canvas);
    element.classList.add("has-imgfx");
    hoverTarget = 1;
    runtime.wake("imgfx-ready");
    emitState("attached");
  }

  function attach(element) {
    if (!stateAllows() || !element) {
      if (host) park("policy");
      return Promise.resolve(false);
    }
    var image = element.querySelector("img");
    // Reuse the exact candidate already selected by the browser from srcset.
    // Falling back to `src` keeps the effect compatible with older browsers
    // and images that do not expose currentSrc yet.
    var src = image && (image.currentSrc || image.getAttribute("src"));
    if (!src || !build()) return Promise.resolve(false);
    if (host === element && currentTexture) {
      clearTimeout(parkTimer);
      hoverTarget = 1;
      runtime.wake("imgfx-reenter");
      return Promise.resolve(true);
    }

    removeHostSurface(host);
    host = element;
    hostRect = null;
    currentTexture = null;
    var token = ++hostToken;
    return loadTexture(src).then(function (texture) {
      applyTexture(texture, element, token);
      return host === element && token === hostToken;
    }, function () {
      if (host === element && token === hostToken) park("texture-error");
      return false;
    });
  }

  function detach(element) {
    if (!host || (element && element !== host)) return;
    hoverTarget = 0;
    clearTimeout(parkTimer);
    parkTimer = setTimeout(function () { park("fade-backstop"); }, FADE_BACKSTOP_MS);
    if (runtime) runtime.wake("imgfx-detach");
  }

  function measureFrame(context) {
    if (!host || !renderer || !currentTexture) return;
    if (!host.isConnected || !stateAllows()) {
      park("unavailable");
      return;
    }
    if (!hostRect || context.input.resized || context.input.scrolled) {
      hostRect = host.getBoundingClientRect();
    }
  }

  function computeFrame(context) {
    if (!host || !renderer || !currentTexture || !hostRect) return;
    var input = context.input;
    if (!coarse && input.pointerActive && hostRect.width > 0 && hostRect.height > 0) {
      target.x = Math.max(0, Math.min(1, (input.pointerX - hostRect.left) / hostRect.width));
      target.y = Math.max(0, Math.min(1, 1 - (input.pointerY - hostRect.top) / hostRect.height));
    }
    if (input.scrolled) velocity = Math.max(-1, Math.min(1, velocity + input.scrollDeltaY * 0.006));
    var follow = 1 - Math.exp(-context.deltaSeconds * 7.2);
    var fade = 1 - Math.exp(-context.deltaSeconds * 8.4);
    mouse.x += (target.x - mouse.x) * follow;
    mouse.y += (target.y - mouse.y) * follow;
    hover += (hoverTarget - hover) * fade;
    velocity *= Math.pow(0.92, context.delta / 16.667);
    clock += context.deltaSeconds;
    if (hoverTarget === 0 && hover < 0.01) park("fade-complete");
  }

  function mutateFrame() {
    if (!host || !renderer || !uniforms || !hostRect) return;
    resizeRenderer(hostRect);
    uniforms.uTime.value = clock;
    uniforms.uMouse.value.set(mouse.x, mouse.y);
    uniforms.uHover.value = hover;
    uniforms.uVel.value = velocity;
  }

  function renderFrame() {
    if (!host || !renderer || !scene || !camera || !currentTexture || contextLost) return;
    try {
      renderer.render(scene, camera);
      renderFrames += 1;
    } catch (error) {
      park("render-error");
    }
  }

  function onPointerOver(event) {
    if (coarse) return;
    var element = event.target && event.target.closest ? event.target.closest("[data-imgfx]") : null;
    if (element) attach(element);
  }

  function onPointerOut(event) {
    if (coarse) return;
    var element = event.target && event.target.closest ? event.target.closest("[data-imgfx]") : null;
    if (element && (!event.relatedTarget || !element.contains(event.relatedTarget))) detach(element);
  }

  function onFocusCard(event) {
    if (!coarse) return;
    var card = event && event.detail && event.detail.el;
    if (!card) {
      detach(host);
      return;
    }
    var element = card.querySelector("[data-imgfx]");
    if (element) {
      target.x = 0.5;
      target.y = 0.55;
      attach(element);
    } else {
      detach(host);
    }
  }

  document.addEventListener("pointerover", onPointerOver, { passive: true });
  document.addEventListener("pointerout", onPointerOut, { passive: true });
  window.addEventListener("sm:focus-card", onFocusCard);

  if (runtime) {
    unsubscribeRuntime = runtime.subscribe({
      id: "image-shader",
      priority: 90,
      enabled: function () { return !disposed; },
      continuous: function () {
        return !!host && !!currentTexture && stateAllows() && (hoverTarget > 0 || hover > 0.01 || Math.abs(velocity) > 0.005);
      },
      measure: measureFrame,
      compute: computeFrame,
      mutate: mutateFrame,
      render: renderFrame,
    });
  }

  if (policy && typeof policy.on === "function") {
    unsubscribePolicy = policy.on(function (tier, state) {
      coarse = state.pointerClass === "coarse";
      if (!state.documentVisible || state.reducedMotion || state.saveData || tier === "low") {
        park("policy-change");
      }
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(parkTimer);
    parkTimer = 0;
    document.removeEventListener("pointerover", onPointerOver, { passive: true });
    document.removeEventListener("pointerout", onPointerOut, { passive: true });
    window.removeEventListener("sm:focus-card", onFocusCard);
    unsubscribePolicy();
    unsubscribeRuntime();
    park("dispose");
    Object.keys(textureCache).forEach(function (key) {
      disposeTexture(textureCache[key]);
      delete textureCache[key];
    });
    textureCount = 0;
    destroyRenderer(true);
  }

  window.__SM_IMGFX = {
    attach: attach,
    detach: detach,
    active: function () { return !!host; },
    hostEl: function () { return host; },
    dispose: dispose,
    __debug: function () {
      return {
        active: !!host,
        disposed: disposed,
        contextLost: contextLost,
        rendererReady: !!renderer,
        textureCount: textureCount,
        maxTextures: MAX_TEXTURES,
        renderFrames: renderFrames,
        buildCount: buildCount,
        ownsAnimationFrame: false,
        runtimeSubscriber: runtime ? runtime.__debug().subscriberIds.indexOf("image-shader") !== -1 : false,
      };
    },
  };
})();
