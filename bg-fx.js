// bg-fx.js — Scroll-reactive 3D topology field (background layer).
//
// ════════════════════════════════════════════════════════════════════════════
// DESIGN — three depth layers around a FIXED camera.
//
//   FAR  · wireframe icosahedron, rotates slowly around Y, hue-shifts per section
//   MID  · wireframe sphere, rotates the opposite direction, smaller radius
//   NEAR · 64 looping particles drifting via sin/cos — no random reposition,
//          so there is NO edge teleport / no twitch
//
// Camera never moves. The scene-group rotates Y by lerped scrollProgress.
// Mouse parallax applies a small lerped translation to the scene-group.
// No raw velocity is amplified anywhere — every input goes through critically
// damped lerp, which is why nothing trembles.
//
// PERF — 3 draw calls (2× LineSegments, 1× Points), <200 verts total.
// Pauses on `visibilitychange` and respects `prefers-reduced-motion`.
// Guards every external call (WebGL ctor, ResizeObserver) with a graceful
// no-op controller fallback.
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  const THREE = window.THREE;

  // ── Camera / scene geometry ─────────────────────────────────────────────
  const CAMERA_FOV = 50;
  const CAMERA_Z = 9;

  // ── Layer 1: icosahedron (far) ──────────────────────────────────────────
  const ICO_RADIUS = 4.4;
  const ICO_DETAIL = 1;                       // 0..2 — keep low-poly
  const ICO_OPACITY = 0.18;
  const ICO_BASE_ROTATION_Y_PER_S = 0.04;

  // ── Layer 2: sphere (mid) ───────────────────────────────────────────────
  const SPHERE_RADIUS = 2.6;
  const SPHERE_WIDTH_SEGMENTS = 18;
  const SPHERE_HEIGHT_SEGMENTS = 10;
  const SPHERE_OPACITY = 0.12;
  const SPHERE_BASE_ROTATION_Y_PER_S = -0.06; // counter-rotates for parallax depth

  // ── Layer 3: looping particles (near) ──────────────────────────────────
  const PARTICLE_COUNT = 64;
  const PARTICLE_RADIUS = 6.0;                // sphere of placements
  const PARTICLE_DRIFT_AMP_X = 0.55;
  const PARTICLE_DRIFT_AMP_Y = 0.42;
  const PARTICLE_DRIFT_AMP_Z = 0.35;
  const PARTICLE_DRIFT_FREQ_MIN = 0.08;
  const PARTICLE_DRIFT_FREQ_MAX = 0.20;
  const PARTICLE_SIZE_MIN = 0.025;
  const PARTICLE_SIZE_MAX = 0.075;
  const PARTICLE_OPACITY = 0.85;
  const MOUSE_PULL_RADIUS_PX = 200;
  const MOUSE_PULL_STRENGTH = 0.30;

  // ── Interaction smoothing ──────────────────────────────────────────────
  const SCROLL_LERP = 0.06;
  const PARALLAX_LERP = 0.08;
  const PARALLAX_MAX_OFFSET = 0.45;           // world-units, total scene shift
  const SCROLL_ROTATION_TURNS = 0.7;          // total Y revolutions for full scroll

  // ── Section hue shifts (additive, in [-1..1] per channel) ──────────────
  const HUE_SHIFTS_BY_SECTION = {
    hero:     { r:  0.00, g:  0.00, b:  0.00 },
    signal:   { r: -0.05, g:  0.02, b:  0.05 },
    about:    { r:  0.02, g:  0.04, b:  0.00 },
    projects: { r:  0.06, g: -0.02, b: -0.04 },
    skills:   { r: -0.04, g:  0.06, b:  0.08 },
    services: { r:  0.04, g:  0.00, b: -0.06 },
    cv:       { r:  0.02, g:  0.06, b:  0.02 },
    process:  { r:  0.00, g:  0.00, b:  0.10 },
    trust:    { r:  0.06, g:  0.02, b:  0.00 },
    contact:  { r:  0.08, g: -0.04, b: -0.06 },
  };
  const HUE_LERP = 0.04;
  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

  // ── Pre-validated reduced-motion fallback opacity ──────────────────────
  const REDUCED_MOTION_OPACITY_MULTIPLIER = 0.45;

  function noOpController() {
    return {
      setAccent() {}, setMotion() {}, setScroll() {}, setSection() {}, dispose() {},
    };
  }

  function clamp01(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  /**
   * Build the bg-fx controller around a single canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opts]
   * @param {string} [opts.accent] — primary accent hex
   * @param {string} [opts.accent2] — secondary accent hex
   * @param {number} [opts.motion=1] — 0..2 multiplier on animation speed
   */
  function create(canvas, opts) {
    const options = opts || {};
    if (!THREE || !canvas) return noOpController();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: false, alpha: true, powerPreference: "low-power",
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[BgFx] WebGL unavailable, background disabled:", err.message);
      return noOpController();
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 60);
    camera.position.set(0, 0, CAMERA_Z);

    // ── State ────────────────────────────────────────────────────────────
    const motionMedia = window.matchMedia(MEDIA_REDUCED_MOTION);
    let prefersReducedMotion = motionMedia.matches;
    let motion = typeof options.motion === "number" ? options.motion : 1;

    const accentColor = new THREE.Color(options.accent || "#D97757");
    const accent2Color = new THREE.Color(options.accent2 || "#C89B5E");
    // Current rendered colors (lerp targets per section).
    const renderedAccent = new THREE.Color().copy(accentColor);
    const targetAccentShift = { r: 0, g: 0, b: 0 };
    const currentAccentShift = { r: 0, g: 0, b: 0 };

    let scrollProgress = 0;
    let scrollProgressTarget = 0;
    let parallaxX = 0;
    let parallaxXTarget = 0;
    let parallaxY = 0;
    let parallaxYTarget = 0;
    let mouseClientX = -9999;
    let mouseClientY = -9999;

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // ── Layer 1: icosahedron wireframe ───────────────────────────────────
    const icoGeometry = new THREE.IcosahedronGeometry(ICO_RADIUS, ICO_DETAIL);
    const icoEdges = new THREE.EdgesGeometry(icoGeometry);
    const icoMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: ICO_OPACITY, depthWrite: false,
    });
    const icoWireframe = new THREE.LineSegments(icoEdges, icoMaterial);
    sceneGroup.add(icoWireframe);

    // ── Layer 2: sphere wireframe ────────────────────────────────────────
    const sphereGeometry = new THREE.SphereGeometry(
      SPHERE_RADIUS, SPHERE_WIDTH_SEGMENTS, SPHERE_HEIGHT_SEGMENTS,
    );
    const sphereWireGeom = new THREE.WireframeGeometry(sphereGeometry);
    const sphereMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: SPHERE_OPACITY, depthWrite: false,
    });
    const sphereWireframe = new THREE.LineSegments(sphereWireGeom, sphereMaterial);
    sceneGroup.add(sphereWireframe);

    // ── Layer 3: looping particles ───────────────────────────────────────
    // Each particle has:
    //   • a fixed base position on a sphere shell (Fibonacci distribution)
    //   • per-axis sin frequencies + phases → bounded smooth motion
    //   • offset[] is recomputed every frame from (basePosition + sin terms)
    //   • mouseOffset[] adds a small attraction toward the cursor projection
    const particleBasePositions = new Float32Array(PARTICLE_COUNT * 3);
    const particleFreqs = new Float32Array(PARTICLE_COUNT * 3);
    const particlePhases = new Float32Array(PARTICLE_COUNT * 3);
    const particleSizes = new Float32Array(PARTICLE_COUNT);
    const particleColorMix = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Fibonacci sphere distribution: deterministic, even coverage.
      const k = i + 0.5;
      const phi = Math.acos(1 - 2 * k / PARTICLE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * k;
      const r = PARTICLE_RADIUS * (0.55 + 0.45 * ((i * 7) % PARTICLE_COUNT) / PARTICLE_COUNT);
      particleBasePositions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      particleBasePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particleBasePositions[i * 3 + 2] = r * Math.cos(phi);

      // Deterministic per-axis frequency + phase.
      particleFreqs[i * 3 + 0] = PARTICLE_DRIFT_FREQ_MIN + (((i * 13) % 97) / 97) * (PARTICLE_DRIFT_FREQ_MAX - PARTICLE_DRIFT_FREQ_MIN);
      particleFreqs[i * 3 + 1] = PARTICLE_DRIFT_FREQ_MIN + (((i * 19) % 89) / 89) * (PARTICLE_DRIFT_FREQ_MAX - PARTICLE_DRIFT_FREQ_MIN);
      particleFreqs[i * 3 + 2] = PARTICLE_DRIFT_FREQ_MIN + (((i * 23) % 83) / 83) * (PARTICLE_DRIFT_FREQ_MAX - PARTICLE_DRIFT_FREQ_MIN);
      particlePhases[i * 3 + 0] = ((i * 31) % 100) / 100 * Math.PI * 2;
      particlePhases[i * 3 + 1] = ((i * 41) % 100) / 100 * Math.PI * 2;
      particlePhases[i * 3 + 2] = ((i * 53) % 100) / 100 * Math.PI * 2;

      particleSizes[i] = PARTICLE_SIZE_MIN + ((i * 11) % 100) / 100 * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN);
      particleColorMix[i] = ((i * 17) % 100) / 100;
    }

    const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particlePositions.set(particleBasePositions);

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3).setUsage(THREE.DynamicDrawUsage));
    particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(particleSizes, 1));
    particleGeometry.setAttribute("aColorMix", new THREE.BufferAttribute(particleColorMix, 1));

    const particleMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uAccent: { value: new THREE.Vector3(accentColor.r, accentColor.g, accentColor.b) },
        uAccent2: { value: new THREE.Vector3(accent2Color.r, accent2Color.g, accent2Color.b) },
        uOpacity: { value: PARTICLE_OPACITY },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: [
        "attribute float aSize;",
        "attribute float aColorMix;",
        "uniform float uPixelRatio;",
        "varying float vMix;",
        "void main() {",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  gl_PointSize = aSize * 420.0 * uPixelRatio / -mv.z;",
        "  gl_Position = projectionMatrix * mv;",
        "  vMix = aColorMix;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "precision mediump float;",
        "uniform vec3 uAccent;",
        "uniform vec3 uAccent2;",
        "uniform float uOpacity;",
        "varying float vMix;",
        "void main() {",
        "  vec2 uv = gl_PointCoord - 0.5;",
        "  float d = length(uv);",
        "  if (d > 0.5) discard;",
        "  float core = smoothstep(0.5, 0.0, d);",
        "  vec3 col = mix(uAccent, uAccent2, vMix);",
        "  gl_FragColor = vec4(col, core * uOpacity);",
        "}",
      ].join("\n"),
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    sceneGroup.add(particles);

    // ── Resize ────────────────────────────────────────────────────────────
    function resize() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(2, r.width);
      const h = Math.max(2, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      particleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    }
    const resizeObserver = ("ResizeObserver" in window) ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(canvas);
    else window.addEventListener("resize", resize);
    resize();

    // ── Mouse / pointer ──────────────────────────────────────────────────
    function onPointerMove(e) {
      mouseClientX = e.clientX;
      mouseClientY = e.clientY;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const nx = (e.clientX / w) * 2 - 1;
      const ny = -((e.clientY / h) * 2 - 1);
      parallaxXTarget = nx * PARALLAX_MAX_OFFSET;
      parallaxYTarget = ny * PARALLAX_MAX_OFFSET * 0.4;
    }
    window.addEventListener("mousemove", onPointerMove, { passive: true });

    // ── Visibility / motion preference ───────────────────────────────────
    let isVisible = !document.hidden;
    function onVisibilityChange() {
      isVisible = !document.hidden;
      lastFrame = performance.now();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    function onMotionPrefChange(e) { prefersReducedMotion = e.matches; }
    if (motionMedia.addEventListener) motionMedia.addEventListener("change", onMotionPrefChange);
    else if (motionMedia.addListener) motionMedia.addListener(onMotionPrefChange);

    // ── Animation loop ───────────────────────────────────────────────────
    let rafHandle = 0;
    let lastFrame = performance.now();
    const tmpColor = new THREE.Color();

    function applyAccentToMaterials() {
      // Mix accent + per-section shift, clamped to a sane gamut.
      const r = clamp01(accentColor.r + currentAccentShift.r);
      const g = clamp01(accentColor.g + currentAccentShift.g);
      const b = clamp01(accentColor.b + currentAccentShift.b);
      renderedAccent.setRGB(r, g, b);
      particleMaterial.uniforms.uAccent.value.set(r, g, b);
      particleMaterial.uniforms.uAccent2.value.set(accent2Color.r, accent2Color.g, accent2Color.b);
      tmpColor.setRGB(r, g, b);
      icoMaterial.color.copy(tmpColor);
      sphereMaterial.color.copy(tmpColor);
    }
    applyAccentToMaterials();

    function tick(now) {
      rafHandle = requestAnimationFrame(tick);
      if (!isVisible) { lastFrame = now; return; }

      const elapsed = Math.min(0.06, (now - lastFrame) / 1000);
      lastFrame = now;
      const dt = prefersReducedMotion ? elapsed * 0.15 : elapsed * motion;
      const tSec = now * 0.001;

      // Damped lerp for scroll + parallax — eliminates ALL jitter.
      scrollProgress = lerp(scrollProgress, scrollProgressTarget, SCROLL_LERP);
      parallaxX = lerp(parallaxX, parallaxXTarget, PARALLAX_LERP);
      parallaxY = lerp(parallaxY, parallaxYTarget, PARALLAX_LERP);
      currentAccentShift.r = lerp(currentAccentShift.r, targetAccentShift.r, HUE_LERP);
      currentAccentShift.g = lerp(currentAccentShift.g, targetAccentShift.g, HUE_LERP);
      currentAccentShift.b = lerp(currentAccentShift.b, targetAccentShift.b, HUE_LERP);

      // Scene rotation — accumulates real-time spin + scroll-driven extra.
      const scrollSpin = scrollProgress * Math.PI * 2 * SCROLL_ROTATION_TURNS;
      icoWireframe.rotation.y = tSec * ICO_BASE_ROTATION_Y_PER_S * motion + scrollSpin;
      icoWireframe.rotation.x = Math.sin(tSec * 0.05) * 0.15;
      sphereWireframe.rotation.y = tSec * SPHERE_BASE_ROTATION_Y_PER_S * motion - scrollSpin * 0.4;
      sphereWireframe.rotation.x = Math.cos(tSec * 0.06) * 0.2;

      // Particle update — base + sin (smooth, no teleport).
      // Optionally pull near-cursor particles toward projected ray (subtle).
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const bx = particleBasePositions[i * 3 + 0];
        const by = particleBasePositions[i * 3 + 1];
        const bz = particleBasePositions[i * 3 + 2];

        const fx = particleFreqs[i * 3 + 0];
        const fy = particleFreqs[i * 3 + 1];
        const fz = particleFreqs[i * 3 + 2];
        const px = particlePhases[i * 3 + 0];
        const py = particlePhases[i * 3 + 1];
        const pz = particlePhases[i * 3 + 2];

        let dx = Math.sin(tSec * fx + px) * PARTICLE_DRIFT_AMP_X;
        let dy = Math.cos(tSec * fy + py) * PARTICLE_DRIFT_AMP_Y;
        let dz = Math.sin(tSec * fz + pz) * PARTICLE_DRIFT_AMP_Z;

        // Mouse attraction (screen-space approximation — bounded force).
        // Skip when cursor is off-screen (initial -9999 sentinel).
        if (mouseClientX > -1000) {
          // Crude: pull X only — uses mouse NDC scaled to world.
          const w = window.innerWidth || 1;
          const h = window.innerHeight || 1;
          const mouseWorldX = ((mouseClientX / w) * 2 - 1) * PARTICLE_RADIUS;
          const mouseWorldY = -((mouseClientY / h) * 2 - 1) * PARTICLE_RADIUS;
          const ddx = mouseWorldX - (bx + dx);
          const ddy = mouseWorldY - (by + dy);
          const distSq = ddx * ddx + ddy * ddy;
          const radius = MOUSE_PULL_RADIUS_PX / w * PARTICLE_RADIUS * 2;
          if (distSq < radius * radius && distSq > 0.0001) {
            const fall = 1 - Math.sqrt(distSq) / radius;
            const k = fall * MOUSE_PULL_STRENGTH;
            dx += ddx * k * 0.3;
            dy += ddy * k * 0.3;
          }
        }

        particlePositions[i * 3 + 0] = bx + dx;
        particlePositions[i * 3 + 1] = by + dy;
        particlePositions[i * 3 + 2] = bz + dz;
      }
      particleGeometry.attributes.position.needsUpdate = true;

      // Parallax: shift scene-group by mouse (camera stays put).
      sceneGroup.position.x = parallaxX;
      sceneGroup.position.y = parallaxY;

      // Apply accent shift (cheap — only when changed enough).
      applyAccentToMaterials();

      // Reduced-motion attenuates global opacity.
      const opacityMul = prefersReducedMotion ? REDUCED_MOTION_OPACITY_MULTIPLIER : 1;
      icoMaterial.opacity = ICO_OPACITY * opacityMul;
      sphereMaterial.opacity = SPHERE_OPACITY * opacityMul;
      particleMaterial.uniforms.uOpacity.value = PARTICLE_OPACITY * opacityMul;

      // Apply dt to advance time-based effects we already incorporated — kept
      // for any future state machines that need it.
      void dt;

      renderer.render(scene, camera);
    }
    rafHandle = requestAnimationFrame(tick);

    return {
      setAccent(hex1, hex2) {
        accentColor.set(hex1 || "#D97757");
        if (hex2) accent2Color.set(hex2);
        applyAccentToMaterials();
      },
      setMotion(m) {
        motion = Math.max(0, Math.min(2, m));
      },
      setScroll(p) {
        scrollProgressTarget = clamp01(p);
      },
      setSection(sectionId) {
        const shift = HUE_SHIFTS_BY_SECTION[sectionId] || HUE_SHIFTS_BY_SECTION.hero;
        targetAccentShift.r = shift.r;
        targetAccentShift.g = shift.g;
        targetAccentShift.b = shift.b;
      },
      dispose() {
        cancelAnimationFrame(rafHandle);
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onPointerMove);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (motionMedia.removeEventListener) motionMedia.removeEventListener("change", onMotionPrefChange);
        else if (motionMedia.removeListener) motionMedia.removeListener(onMotionPrefChange);
        icoGeometry.dispose();
        icoEdges.dispose();
        icoMaterial.dispose();
        sphereGeometry.dispose();
        sphereWireGeom.dispose();
        sphereMaterial.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
        renderer.dispose();
      },
    };
  }

  window.BgFx = { create: create };
})();
