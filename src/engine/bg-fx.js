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
  // ── Camera flight on scroll (v64). The camera was fixed; now it travels
  // along Z as scroll 0→1 (near→far) and dollies IN when scrolling fast.
  const CAMERA_Z_NEAR = 5.4;        // scroll=0 → close (immersive hero)
  const CAMERA_Z_FAR  = 13.2;       // scroll=1 → pulled far back (bigger, clearer flight)
  const CAMERA_RAIL_LERP = 0.05;    // critically-damped travel (no lurch)
  const CAMERA_LOOK_LERP = 0.05;
  const CAMERA_ENERGY_PUSH  = 2.2;  // fast scroll dollies the camera IN (more dynamic)
  const CAMERA_ENERGY_SHAKE = 0.05; // max world-units of energetic micro-drift
  // Scroll-SPEED → one energy scalar (calm at rest, hot when flicking fast).
  const SCROLL_ENERGY_GAIN = 0.9;
  const SCROLL_ENERGY_MAX  = 1.0;
  const SCROLL_ENERGY_LERP = 0.06;

  // ── Layer 1: morphing wireframe gallery (far) ───────────────────────────
  // FOUR shape meshes coexist at the scene origin: icosahedron, cube,
  // octahedron, torus. Only one is fully visible at any time; setSection()
  // crossfades opacities. This gives "different scenery" per section without
  // any geometry swap mid-render (smooth, no FOUC).
  const SHAPE_BASE_RADIUS = 3.6;
  const SHAPE_OPACITY = 0.22;
  const SHAPE_ROTATION_Y_PER_S = 0.04;
  const SHAPE_FADE_LERP = 0.045;              // per-frame opacity lerp toward target

  // ── Layer 2: energy waveform grid (replaces the old sphere wireframe).
  // A flat plane is rotated into perspective and the vertex shader displaces Y
  // by superimposed sine waves. Reads as a moving "data surface" — distinctive
  // AI/dev aesthetic without competing with foreground content.
  const GRID_WIDTH = 18;
  const GRID_DEPTH = 18;
  const GRID_SEGMENTS_X = 36;
  const GRID_SEGMENTS_Z = 22;
  const GRID_POS_Y = -2.2;
  const GRID_TILT_X = -Math.PI / 2.6;
  const GRID_TILT_Z = 0;
  const GRID_OPACITY = 0.22;
  const GRID_WAVE_SPEED = 0.4;
  const GRID_WAVE_AMP_PRIMARY = 0.24;
  const GRID_WAVE_AMP_SECONDARY = 0.16;
  const GRID_WAVE_FREQ_PRIMARY = 0.55;
  const GRID_WAVE_FREQ_SECONDARY = 0.85;
  const GRID_SCROLL_AMP_BOOST = 0.6;

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
  const SCROLL_BRIGHTNESS_LERP = 0.04;
  const SCROLL_BRIGHTNESS_VELOCITY_TO_BOOST = 0.55; // 1 unit of velocity → 0.55 brightness gain

  // ── Constellation lines (graph of nearby particles) ────────────────────
  const CONSTELLATION_DISTANCE = 1.25;        // world-units — pairs closer than this draw a line
  const CONSTELLATION_MAX_SEGMENTS = 220;     // upper bound; keeps draw buffer bounded
  const CONSTELLATION_OPACITY_MAX = 0.32;
  const CONSTELLATION_MOUSE_RADIUS = 3.5;     // world-units — pairs inside this around mouse glow brighter
  const CONSTELLATION_DISABLE_BELOW_WIDTH = 720;  // disable on small screens (mobile perf)

  // ── Performance budget ──────────────────────────────────────────────────
  // This is a slow AMBIENT background. Rendering it at the display's full
  // 60–120 Hz is wasted work — capping to a steady ~40 fps frees a large,
  // constant slice of GPU/CPU with no perceptible change to the slow motion.
  // The O(N²) constellation pair-scan (the single priciest CPU step) runs at
  // half that rate again — its subtle lines don't need per-frame accuracy.
  const BG_TARGET_FPS = 40;
  const BG_MIN_FRAME_MS = 1000 / BG_TARGET_FPS;
  const CONSTELLATION_EVERY_N_FRAMES = 2;

  // ── Section → background shape mapping ──────────────────────────────────
  const SHAPE_BY_SECTION = {
    hero:     "ico",
    signal:   "ico",
    about:    "ico",
    projects: "cube",
    skills:   "octa",
    services: "cube",
    cv:       "torus",
    process:  "octa",
    trust:    "torus",
    contact:  "torus",
  };
  const SHAPE_KEYS = ["ico", "cube", "octa", "torus"];

  // ── Section → camera composition map.
  // Each section gets a noticeable camera-axis tilt + scene-group offset so
  // the composition meaningfully shifts as the user scrolls. Cinematic, not
  // subliminal. Values up to ±0.18 rad (~10°) tilt, ±0.8 world units offset.
  const CAMERA_POSE_BY_SECTION = {
    hero:     { tiltZ:  0.00, dollyY:  0.0,  offsetX:  0.0 },
    signal:   { tiltZ:  0.08, dollyY: -0.1,  offsetX:  0.5 },
    about:    { tiltZ: -0.10, dollyY: -0.4,  offsetX: -0.6 },
    projects: { tiltZ:  0.15, dollyY: -0.7,  offsetX:  0.8 },
    skills:   { tiltZ: -0.12, dollyY:  0.4,  offsetX: -0.7 },
    services: { tiltZ:  0.16, dollyY:  0.1,  offsetX:  0.7 },
    cv:       { tiltZ: -0.18, dollyY: -0.5,  offsetX: -0.4 },
    process:  { tiltZ:  0.10, dollyY:  0.3,  offsetX:  0.4 },
    trust:    { tiltZ: -0.14, dollyY:  0.5,  offsetX: -0.8 },
    contact:  { tiltZ:  0.05, dollyY:  0.0,  offsetX:  0.2 },
  };
  const CAMERA_POSE_LERP = 0.045;       // faster — actually noticeable transitions
  // ── Dominant FORM per section (v64). Each section foregrounds ONE semantic
  // form by re-weighting the EXISTING channels (grid / particles / constellation)
  // — no new meshes. SHAPE_BY_SECTION already picks the silhouette; FORM only
  // sets emphasis. network=graph (AI), waves=flowing (full-stack), grid=ordered
  // (dashboards/offerings), starfield=dense (signal out).
  const FORM_BY_SECTION = {
    hero: "waves", about: "waves",
    signal: "network", skills: "network",
    projects: "grid", services: "grid", cv: "grid", process: "grid",
    trust: "starfield", contact: "starfield",
  };
  // Wider contrast so the per-section form change actually READS (not just a
  // whisper of opacity). Still bounded so the bg never overpowers text.
  const FORM_WEIGHTS = {
    waves:     { grid: 1.5,  particles: 0.75, constellation: 0.4  },
    network:   { grid: 0.4,  particles: 1.5,  constellation: 1.7  },
    grid:      { grid: 1.35, particles: 0.5,  constellation: 0.35 },
    starfield: { grid: 0.3,  particles: 1.7,  constellation: 1.0  },
  };
  const FORM_LERP = 0.035;              // slow crossfade between forms (cinematic)
  // Brief scale-pulse on every shape change. Adds drama to morphs.
  const SHAPE_PULSE_DURATION_MS = 900;
  const SHAPE_PULSE_OVERSHOOT = 0.25;   // 1.0 → 1.25 → 1.0

  // ── Section hue shifts (additive, in [-1..1] per channel) ──────────────
  // A deliberate TEMPERATURE JOURNEY: the background runs coolest at the hero
  // and warms as you descend, landing warmest+brightest at contact — the
  // "instruments warming up" arc (Interstellar/Dune). Analytical sections
  // (skills radar, cv document, process) dip slightly cooler so the human /
  // commercial ones (projects, trust, contact) read warmer by contrast. More
  // R and less B = warmer; the reverse = cooler. Deltas kept ~2× the old
  // (near-imperceptible) table — enough to feel, not a disco color-cycle.
  const HUE_SHIFTS_BY_SECTION = {
    hero:     { r: -0.04, g:  0.00, b:  0.05 },  // coolest — the start
    signal:   { r: -0.02, g:  0.01, b:  0.03 },
    about:    { r:  0.03, g:  0.02, b: -0.01 },
    projects: { r:  0.08, g:  0.00, b: -0.05 },  // warm — the heart
    skills:   { r: -0.03, g:  0.03, b:  0.05 },  // dip cooler — analytical radar
    services: { r:  0.06, g:  0.00, b: -0.05 },
    cv:       { r: -0.02, g:  0.03, b:  0.04 },  // dip cooler — the document
    process:  { r:  0.00, g:  0.01, b:  0.02 },
    faq:      { r:  0.05, g:  0.00, b: -0.03 },  // warming back up
    trust:    { r:  0.10, g:  0.01, b: -0.06 },
    contact:  { r:  0.14, g: -0.03, b: -0.10 },  // warmest + brightest — destination
  };
  const HUE_LERP = 0.03; // slightly slower so the wider deltas still crossfade (no per-section flash)
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

    // Device performance tier — drives pixel-ratio + constellation tiering.
    // Low-end devices render at DPR 1.0 (vs 1.5) and skip the O(N²)
    // constellation pair-scan entirely.
    const deviceTierLow =
      (typeof window.getDeviceTier === "function") && window.getDeviceTier() === "low";
    const DPR_CAP = deviceTierLow ? 1.0 : 1.5;

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
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
    let scrollProgressLast = 0;       // for velocity estimate
    let scrollVelocity = 0;           // smoothed |Δ scrollProgress| per frame
    let scrollBrightness = 0;         // smoothed brightness boost from scrollVelocity
    // Section-driven camera composition. Targets set in setSection(),
    // smoothly lerped in tick() so the page never "lurches".
    const camPoseTarget = { tiltZ: 0, dollyY: 0, offsetX: 0 };
    const camPoseCurrent = { tiltZ: 0, dollyY: 0, offsetX: 0 };
    // Camera-flight rail + scroll-energy + dominant-form crossfade (v64).
    let scrollEnergy = 0;                          // smoothed scroll-speed scalar
    let camZ = CAMERA_Z,  camZTarget = CAMERA_Z;   // real camera dolly rail
    let camY = 0,         camYTarget = 0;
    let camLookY = 0,     camLookYTarget = 0;
    const formCurrent = { grid: 1, particles: 1, constellation: 1 };
    const formTarget  = { grid: 1, particles: 1, constellation: 1 };
    // Per-shape pulse state — when a shape becomes active, its pulse jumps to
    // 1 and decays. The pulse contributes an extra scale bump on top of the
    // base opacity-derived scale.
    let shapePulseStartedAt = -Infinity;
    let shapePulseTargetKey = null;
    let parallaxX = 0;
    let parallaxXTarget = 0;
    let parallaxY = 0;
    let parallaxYTarget = 0;
    let mouseClientX = -9999;
    let mouseClientY = -9999;

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // ── Layer 1: icosahedron wireframe ───────────────────────────────────
    // Build the 4 shape wireframes. Each has its own geometry + material so
    // crossfading is one opacity assignment per material — no rebuilds.
    const shapeFactories = {
      ico:   () => new THREE.IcosahedronGeometry(SHAPE_BASE_RADIUS,  1),
      cube:  () => new THREE.BoxGeometry(SHAPE_BASE_RADIUS * 1.4, SHAPE_BASE_RADIUS * 1.4, SHAPE_BASE_RADIUS * 1.4, 2, 2, 2),
      octa:  () => new THREE.OctahedronGeometry(SHAPE_BASE_RADIUS,  0),
      torus: () => new THREE.TorusGeometry(SHAPE_BASE_RADIUS * 0.8, SHAPE_BASE_RADIUS * 0.18, 8, 28),
    };
    /** @type {Object<string,{mesh:THREE.LineSegments,material:THREE.LineBasicMaterial,opacity:number,target:number,geometry:THREE.BufferGeometry,edges:THREE.EdgesGeometry}>} */
    const shapes = {};
    SHAPE_KEYS.forEach((key) => {
      const geom = shapeFactories[key]();
      const edges = new THREE.EdgesGeometry(geom, 1);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: key === "ico" ? SHAPE_OPACITY : 0,
        depthWrite: false,
      });
      const mesh = new THREE.LineSegments(edges, mat);
      sceneGroup.add(mesh);
      shapes[key] = {
        mesh, material: mat, geometry: geom, edges,
        opacity: key === "ico" ? 1 : 0,
        target: key === "ico" ? 1 : 0,
      };
    });
    let currentShapeKey = "ico";

    // ── Layer 2: energy waveform grid (mid-depth, perspective floor).
    // Vertex shader displaces Y by superimposed sine waves over time + scroll.
    // Wireframe through ShaderMaterial wireframe flag — a single mesh draw.
    const gridGeometry = new THREE.PlaneGeometry(GRID_WIDTH, GRID_DEPTH, GRID_SEGMENTS_X, GRID_SEGMENTS_Z);
    const gridMaterial = new THREE.ShaderMaterial({
      wireframe: true,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uScrollBoost: { value: 0 },
        uAccent: { value: new THREE.Vector3(accentColor.r, accentColor.g, accentColor.b) },
        uOpacity: { value: GRID_OPACITY },
        uAmpA: { value: GRID_WAVE_AMP_PRIMARY },
        uAmpB: { value: GRID_WAVE_AMP_SECONDARY },
        uFreqA: { value: GRID_WAVE_FREQ_PRIMARY },
        uFreqB: { value: GRID_WAVE_FREQ_SECONDARY },
      },
      vertexShader: [
        "uniform float uTime;",
        "uniform float uScrollBoost;",
        "uniform float uAmpA;",
        "uniform float uAmpB;",
        "uniform float uFreqA;",
        "uniform float uFreqB;",
        "varying float vIntensity;",
        "void main() {",
        "  vec3 p = position;",
        // Superimposed sine waves give a "data surface" feel — no random noise,
        // so the field stays smooth and predictable.
        "  float w1 = sin(p.x * uFreqA + uTime * 0.6) * uAmpA;",
        "  float w2 = cos(p.y * uFreqB + uTime * 0.45) * uAmpB;",
        "  float w3 = sin((p.x + p.y) * 0.32 + uTime * 0.7) * 0.08;",
        "  float displacement = (w1 + w2 + w3) * (1.0 + uScrollBoost);",
        "  p.z += displacement;",
        "  vIntensity = clamp(0.35 + abs(displacement) * 1.6, 0.2, 1.0);",
        "  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);",
        "}",
      ].join("\n"),
      fragmentShader: [
        "precision mediump float;",
        "uniform vec3 uAccent;",
        "uniform float uOpacity;",
        "varying float vIntensity;",
        "void main() {",
        "  gl_FragColor = vec4(uAccent, vIntensity * uOpacity);",
        "}",
      ].join("\n"),
    });
    const grid = new THREE.Mesh(gridGeometry, gridMaterial);
    grid.rotation.x = GRID_TILT_X;
    grid.rotation.z = GRID_TILT_Z;
    grid.position.y = GRID_POS_Y;
    sceneGroup.add(grid);

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

    // ── Constellation layer — dynamic line-segments connecting nearby particles.
    // O(N²) pair-scan per frame for N=64 is 2016 distance checks → cheap.
    // Buffer is preallocated to CONSTELLATION_MAX_SEGMENTS * 2 vertices.
    // Constellation is disabled on narrow screens (mobile perf) AND on any
    // device flagged low-tier — the per-frame O(N²) pair-scan is the single
    // most expensive thing bg-fx does, so weak hardware skips it outright.
    const constellationDisabled =
      deviceTierLow || (window.innerWidth < CONSTELLATION_DISABLE_BELOW_WIDTH);
    const constellationPositions = new Float32Array(CONSTELLATION_MAX_SEGMENTS * 2 * 3);
    const constellationColors    = new Float32Array(CONSTELLATION_MAX_SEGMENTS * 2 * 3);
    const constellationGeometry = new THREE.BufferGeometry();
    constellationGeometry.setAttribute("position", new THREE.BufferAttribute(constellationPositions, 3).setUsage(THREE.DynamicDrawUsage));
    constellationGeometry.setAttribute("color", new THREE.BufferAttribute(constellationColors, 3).setUsage(THREE.DynamicDrawUsage));
    constellationGeometry.setDrawRange(0, 0);
    const constellationMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: CONSTELLATION_OPACITY_MAX,
      depthWrite: false,
    });
    const constellation = new THREE.LineSegments(constellationGeometry, constellationMaterial);
    if (!constellationDisabled) sceneGroup.add(constellation);

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

    // ── Intro gate — while the "Полёт к станции" curtain (src/engine/intro.js)
    // is on screen, this WebGL loop stays paused so it doesn't contend with
    // the intro's own canvas + rAF + React hydration during the first ~2.4s.
    // window.__SM_INTRO is only ever set by index.html's head-boot script
    // when the intro is actually about to run (not on repeat navigations in
    // the same session) — if it's absent, introActive starts false and this
    // is a no-op, matching pre-intro behavior exactly.
    let introActive = !!(window.__SM_INTRO && window.__SM_INTRO.panel && window.__SM_INTRO.panel.parentNode);
    function onIntroDone() {
      introActive = false;
      lastFrame = performance.now();
    }
    if (introActive) window.addEventListener("sm:intro-done", onIntroDone);

    function onMotionPrefChange(e) { prefersReducedMotion = e.matches; }
    if (motionMedia.addEventListener) motionMedia.addEventListener("change", onMotionPrefChange);
    else if (motionMedia.addListener) motionMedia.addListener(onMotionPrefChange);

    // ── Animation loop ───────────────────────────────────────────────────
    let rafHandle = 0;
    let lastFrame = performance.now();
    let lastRenderAt = 0;   // timestamp of last NON-skipped frame (fps cap)
    let frameIndex = 0;     // counts rendered frames (constellation half-rate)
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
      // All shape wireframes adopt the current accent tint.
      SHAPE_KEYS.forEach((k) => { if (shapes[k]) shapes[k].material.color.copy(tmpColor); });
      gridMaterial.uniforms.uAccent.value.set(r, g, b);
    }
    applyAccentToMaterials();

    function tick(now) {
      rafHandle = requestAnimationFrame(tick);
      if (!isVisible || introActive) { lastFrame = now; return; }
      // Frame-rate cap — skip this frame if we rendered too recently.
      // `elapsed` below is measured from the last RENDERED frame, so the
      // motion stays time-correct regardless of how many frames we skip.
      if (now - lastRenderAt < BG_MIN_FRAME_MS) return;
      lastRenderAt = now;
      frameIndex++;

      const elapsed = Math.min(0.06, (now - lastFrame) / 1000);
      lastFrame = now;
      const dt = prefersReducedMotion ? elapsed * 0.15 : elapsed * motion;
      const tSec = now * 0.001;

      // Damped lerp for scroll + parallax — eliminates ALL jitter.
      scrollProgress = lerp(scrollProgress, scrollProgressTarget, SCROLL_LERP);
      // Scroll velocity → brightness boost (smoothed both ways).
      const instantVelocity = Math.abs(scrollProgress - scrollProgressLast) / Math.max(0.001, elapsed);
      scrollProgressLast = scrollProgress;
      scrollVelocity = lerp(scrollVelocity, instantVelocity, 0.1);
      scrollBrightness = lerp(scrollBrightness, Math.min(0.5, scrollVelocity * SCROLL_BRIGHTNESS_VELOCITY_TO_BOOST), SCROLL_BRIGHTNESS_LERP);
      parallaxX = lerp(parallaxX, parallaxXTarget, PARALLAX_LERP);
      parallaxY = lerp(parallaxY, parallaxYTarget, PARALLAX_LERP);
      // Camera composition lerp — subtle tilt + dolly per section.
      camPoseCurrent.tiltZ   = lerp(camPoseCurrent.tiltZ,   camPoseTarget.tiltZ,   CAMERA_POSE_LERP);
      camPoseCurrent.dollyY  = lerp(camPoseCurrent.dollyY,  camPoseTarget.dollyY,  CAMERA_POSE_LERP);
      camPoseCurrent.offsetX = lerp(camPoseCurrent.offsetX, camPoseTarget.offsetX, CAMERA_POSE_LERP);

      // ── Scroll-SPEED → one energy scalar (reuses the already-smoothed
      // scrollVelocity, so no new tremor). Forced to 0 under reduced-motion.
      const energyRaw = prefersReducedMotion ? 0
        : Math.min(SCROLL_ENERGY_MAX, scrollVelocity * SCROLL_ENERGY_GAIN);
      scrollEnergy = lerp(scrollEnergy, energyRaw, SCROLL_ENERGY_LERP);

      // ── Camera flight on scroll — REAL camera travel. Low-tier & reduced-
      // motion keep the camera fixed (group-only transforms = today's cheap
      // path on weak phones). railActive also reconciles the dollyY below.
      const railActive = !deviceTierLow && !prefersReducedMotion;
      if (railActive) {
        camZTarget = lerp(CAMERA_Z_NEAR, CAMERA_Z_FAR, scrollProgress) - scrollEnergy * CAMERA_ENERGY_PUSH;
        camYTarget     = camPoseCurrent.dollyY * 0.6;   // per-section dolly → real camera Y
        camLookYTarget = camPoseCurrent.dollyY * 0.25;
        camZ     = lerp(camZ,     camZTarget,     CAMERA_RAIL_LERP);
        camY     = lerp(camY,     camYTarget,     CAMERA_RAIL_LERP);
        camLookY = lerp(camLookY, camLookYTarget, CAMERA_LOOK_LERP);
        // Deterministic micro-drift (sin, NOT random → no twitch), scaled by energy.
        const shakeAmt = scrollEnergy * CAMERA_ENERGY_SHAKE;
        camera.position.set(Math.sin(now * 0.0021) * shakeAmt, camY + Math.cos(now * 0.0017) * shakeAmt, camZ);
        camera.lookAt(0, camLookY, 0);
      } else if (prefersReducedMotion && camera.position.z !== CAMERA_Z) {
        camera.position.set(0, 0, CAMERA_Z);   // settle once if reduced-motion toggles on
        camera.lookAt(0, 0, 0);
      }

      // ── Dominant-form crossfade (skip the 3 lerps once settled — keeps idle
      // sections free of per-frame work).
      if (Math.abs(formCurrent.grid - formTarget.grid) > 0.001 ||
          Math.abs(formCurrent.particles - formTarget.particles) > 0.001 ||
          Math.abs(formCurrent.constellation - formTarget.constellation) > 0.001) {
        formCurrent.grid          = lerp(formCurrent.grid,          formTarget.grid,          FORM_LERP);
        formCurrent.particles     = lerp(formCurrent.particles,     formTarget.particles,     FORM_LERP);
        formCurrent.constellation = lerp(formCurrent.constellation, formTarget.constellation, FORM_LERP);
      }

      currentAccentShift.r = lerp(currentAccentShift.r, targetAccentShift.r, HUE_LERP);
      currentAccentShift.g = lerp(currentAccentShift.g, targetAccentShift.g, HUE_LERP);
      currentAccentShift.b = lerp(currentAccentShift.b, targetAccentShift.b, HUE_LERP);

      // Scene rotation — accumulates real-time spin + scroll-driven extra.
      const scrollSpin = scrollProgress * Math.PI * 2 * SCROLL_ROTATION_TURNS;
      // All four shapes share the same rotation, so transitions feel "still" —
      // only the silhouette swaps under the user. Per-shape opacity lerps
      // toward its target (the active section's chosen shape gets target=1).
      // Each shape rotates + grows/shrinks based on its current opacity, so
      // morphs read as "shape blooms into being" rather than a soft crossfade
      // of static silhouettes. The active shape also gets a brief scale-pulse
      // when first activated (dramatic morph entrance).
      const pulseElapsed = now - shapePulseStartedAt;
      const pulseT = Math.min(1, Math.max(0, pulseElapsed / SHAPE_PULSE_DURATION_MS));
      // Out-and-back: peak at t=0.35, back to 0 at t=1.
      const pulseShape = pulseT < 0.35
        ? (pulseT / 0.35)
        : Math.max(0, 1 - (pulseT - 0.35) / 0.65);
      SHAPE_KEYS.forEach((k) => {
        const s = shapes[k];
        if (!s) return;
        s.mesh.rotation.y = tSec * SHAPE_ROTATION_Y_PER_S * motion + scrollSpin;
        s.mesh.rotation.x = Math.sin(tSec * 0.05) * 0.15;
        s.opacity = lerp(s.opacity, s.target, SHAPE_FADE_LERP);
        // Base scale 0.55..1.0 from opacity + extra pulse on the active shape.
        const baseScale = 0.55 + 0.45 * s.opacity;
        const pulseBump = (k === shapePulseTargetKey) ? pulseShape * SHAPE_PULSE_OVERSHOOT : 0;
        const scale = baseScale * (1 + pulseBump);
        s.mesh.scale.set(scale, scale, scale);
      });
      // Energy grid update — wave time advances, scroll-velocity boosts amp.
      // Amp/freq uniforms keep their creation-time constants (set when the
      // ShaderMaterial was built).
      gridMaterial.uniforms.uTime.value = tSec * GRID_WAVE_SPEED * (prefersReducedMotion ? 0.1 : motion);
      gridMaterial.uniforms.uScrollBoost.value = scrollVelocity * GRID_SCROLL_AMP_BOOST + scrollEnergy * 0.5;

      // Particle update — base + sin (smooth, no teleport).
      // Optionally pull near-cursor particles toward projected ray (subtle).
      const driftBoost = 1 + scrollEnergy * 0.4;   // livelier field when scrolling fast
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

        let dx = Math.sin(tSec * fx + px) * PARTICLE_DRIFT_AMP_X * driftBoost;
        let dy = Math.cos(tSec * fy + py) * PARTICLE_DRIFT_AMP_Y * driftBoost;
        let dz = Math.sin(tSec * fz + pz) * PARTICLE_DRIFT_AMP_Z * driftBoost;

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

      // ── Constellation update — O(N²) pair-scan filling the line buffer.
      // Runs at half the (already capped) render rate; on skipped frames the
      // last-computed lines keep rendering — imperceptible for subtle links.
      if (!constellationDisabled && (frameIndex % CONSTELLATION_EVERY_N_FRAMES === 0)) {
        let writeIdx = 0;
        const maxSegments = CONSTELLATION_MAX_SEGMENTS;
        const distMax = CONSTELLATION_DISTANCE;
        const distMaxSq = distMax * distMax;
        // Project mouse to world-XY plane for proximity bonus.
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        const mouseHasPos = mouseClientX > -1000;
        const mouseWorldX = mouseHasPos ? ((mouseClientX / w) * 2 - 1) * PARTICLE_RADIUS : 0;
        const mouseWorldY = mouseHasPos ? -((mouseClientY / h) * 2 - 1) * PARTICLE_RADIUS : 0;
        for (let i = 0; i < PARTICLE_COUNT && writeIdx < maxSegments; i++) {
          const ax = particlePositions[i * 3 + 0];
          const ay = particlePositions[i * 3 + 1];
          const az = particlePositions[i * 3 + 2];
          for (let j = i + 1; j < PARTICLE_COUNT && writeIdx < maxSegments; j++) {
            const bx = particlePositions[j * 3 + 0];
            const by = particlePositions[j * 3 + 1];
            const bz = particlePositions[j * 3 + 2];
            const ddx = ax - bx;
            const ddy = ay - by;
            const ddz = az - bz;
            const dsq = ddx * ddx + ddy * ddy + ddz * ddz;
            if (dsq > distMaxSq) continue;
            const t = 1 - Math.sqrt(dsq) / distMax; // 1 close → 0 far
            // Brightness bonus if midpoint is near the mouse (XY only).
            let bonus = 0;
            if (mouseHasPos) {
              const mx = (ax + bx) * 0.5 - mouseWorldX;
              const my = (ay + by) * 0.5 - mouseWorldY;
              const mdist = Math.sqrt(mx * mx + my * my);
              if (mdist < CONSTELLATION_MOUSE_RADIUS) {
                bonus = (1 - mdist / CONSTELLATION_MOUSE_RADIUS) * 0.8;
              }
            }
            const intensity = Math.min(1, t * 0.6 + bonus);
            const off = writeIdx * 6;
            constellationPositions[off + 0] = ax;
            constellationPositions[off + 1] = ay;
            constellationPositions[off + 2] = az;
            constellationPositions[off + 3] = bx;
            constellationPositions[off + 4] = by;
            constellationPositions[off + 5] = bz;
            const r = renderedAccent.r * intensity;
            const g = renderedAccent.g * intensity;
            const b = renderedAccent.b * intensity;
            constellationColors[off + 0] = r;
            constellationColors[off + 1] = g;
            constellationColors[off + 2] = b;
            constellationColors[off + 3] = r;
            constellationColors[off + 4] = g;
            constellationColors[off + 5] = b;
            writeIdx++;
          }
        }
        constellationGeometry.attributes.position.needsUpdate = true;
        constellationGeometry.attributes.color.needsUpdate = true;
        constellationGeometry.setDrawRange(0, writeIdx * 2);
      }

      // Parallax: shift scene-group by mouse (camera stays put).
      // Scene transform = parallax (mouse) + camera pose (per-section composition)
      sceneGroup.position.x = parallaxX + camPoseCurrent.offsetX;
      // When the camera rail is active the per-section vertical move lives on the
      // CAMERA (camY), so drop dollyY here to avoid applying it twice. On low-tier/
      // reduced-motion the camera is fixed, so the group keeps dollyY (as before).
      sceneGroup.position.y = parallaxY + (railActive ? 0 : camPoseCurrent.dollyY);
      sceneGroup.rotation.z = camPoseCurrent.tiltZ;

      // Apply accent shift (cheap — only when changed enough).
      applyAccentToMaterials();

      // Reduced-motion attenuates global opacity. Scroll-velocity adds brightness.
      const opacityMul = prefersReducedMotion ? REDUCED_MOTION_OPACITY_MULTIPLIER : 1;
      const brightnessBoost = 1 + scrollBrightness;
      SHAPE_KEYS.forEach((k) => {
        const s = shapes[k];
        if (!s) return;
        s.material.opacity = SHAPE_OPACITY * s.opacity * opacityMul * brightnessBoost;
      });
      // Form weights foreground the right channel per section (grid for
      // dashboards, particles+constellation for network, particles for starfield).
      gridMaterial.uniforms.uOpacity.value = GRID_OPACITY * opacityMul * brightnessBoost * formCurrent.grid;
      particleMaterial.uniforms.uOpacity.value = PARTICLE_OPACITY * opacityMul * brightnessBoost * formCurrent.particles;
      if (!constellationDisabled) {
        constellationMaterial.opacity = CONSTELLATION_OPACITY_MAX * opacityMul * brightnessBoost * formCurrent.constellation;
      }

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
        // Section-driven camera composition: subtle tilt + dolly + lateral offset.
        const pose = CAMERA_POSE_BY_SECTION[sectionId] || CAMERA_POSE_BY_SECTION.hero;
        camPoseTarget.tiltZ = pose.tiltZ;
        camPoseTarget.dollyY = pose.dollyY;
        camPoseTarget.offsetX = pose.offsetX;
        // Dominant-form emphasis for this section — set ALWAYS (before the
        // shape early-return below), lerped in tick() for a cinematic crossfade.
        const formKey = FORM_BY_SECTION[sectionId] || "waves";
        const fw = FORM_WEIGHTS[formKey] || FORM_WEIGHTS.waves;
        formTarget.grid = fw.grid;
        formTarget.particles = fw.particles;
        formTarget.constellation = fw.constellation;
        // Shape morph for this section + pulse animation on the new shape.
        const shape = SHAPE_BY_SECTION[sectionId];
        if (!shape || !shapes[shape] || shape === currentShapeKey) return;
        currentShapeKey = shape;
        SHAPE_KEYS.forEach((k) => {
          if (shapes[k]) shapes[k].target = (k === shape) ? 1 : 0;
        });
        // Kick the pulse on the new shape — it'll bump to 1.25× and back over
        // SHAPE_PULSE_DURATION_MS, making the morph feel like an entrance.
        shapePulseStartedAt = performance.now();
        shapePulseTargetKey = shape;
      },
      dispose() {
        cancelAnimationFrame(rafHandle);
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onPointerMove);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.removeEventListener("sm:intro-done", onIntroDone);
        if (motionMedia.removeEventListener) motionMedia.removeEventListener("change", onMotionPrefChange);
        else if (motionMedia.removeListener) motionMedia.removeListener(onMotionPrefChange);
        SHAPE_KEYS.forEach((k) => {
          const s = shapes[k];
          if (!s) return;
          s.geometry.dispose();
          s.edges.dispose();
          s.material.dispose();
        });
        gridGeometry.dispose();
        gridMaterial.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
        constellationGeometry.dispose();
        constellationMaterial.dispose();
        renderer.dispose();
      },
    };
  }

  window.BgFx = { create: create };
})();
