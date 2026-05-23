// robot.js — CORE.AI robot head for the hero canvas.
//
// ════════════════════════════════════════════════════════════════════════════
// DESIGN — a small, detailed, but performance-budgeted 3D character:
//
//   • Head      — rounded box-like shell built from segmented BoxGeometry,
//                 metallic warm-tone material lit by 1 directional + 1 ambient
//   • Face plate— inset MeshStandardMaterial darker plane on the front
//   • Eyes      — white spheres with dark pupils as child objects; pupils lerp
//                 toward the cursor position within a clamped socket radius
//   • Antenna   — short cylinder + emissive sphere tip pulsing on accent
//   • Mouth     — five line-segments whose vertices morph between expressions
//   • Cheek scr.— small emissive plane on the right side showing a STATUS dot
//   • Status LED— tiny emissive dot on the left temple, blinking
//   • Neck      — short cylinder so the head feels mounted, not floating
//
// EXPRESSIONS (cycle on click / tap, stored in finite state machine):
//   idle · thinking · happy · surprised · sleeping
// Each expression is a target keyframe; transition is per-property lerp.
//
// INTERACTION:
//   • Hover: pupils + slight head tilt follow the cursor
//   • Click/tap on canvas: cycle expressions
//   • Touch: same as click, no scroll-hijack
//
// LIFECYCLE:
//   • Visibility-aware (pause on hidden tab)
//   • prefers-reduced-motion attenuates all motion to ~0
//   • Disposal cleans up every listener, geometry, material, renderer
//   • Graceful no-op controller if WebGL fails
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  const THREE = window.THREE;

  // ── Sizing (world units) ────────────────────────────────────────────────
  // Anki-Vector proportions — slightly wider than tall, more rounded, and the
  // face plate dominates the front (≈ 90% of width, 80% of height) so the
  // HUD reads as "screen on a body" rather than "panel on a head".
  const HEAD_W = 1.72;
  const HEAD_H = 1.42;
  const HEAD_D = 1.20;
  const HEAD_SEGMENTS = 5;                 // more segments → smoother rounded corners
  const HEAD_CORNER_BLEND = 0.28;          // stronger corner softening
  const FACE_PLATE_W = 1.50;
  const FACE_PLATE_H = 1.12;
  const FACE_PLATE_DEPTH_OFFSET = 0.001;
  const FACE_PLATE_CORNER_R = 0.16;        // rounded corners on the screen

  // HUD-visor eyes: emissive rounded rectangles on the face plate (no 3D balls).
  // Larger now — the face plate is bigger so eyes scale up accordingly.
  // Anki-Vector's eyes are the dominant face feature — almost square at idle.
  const EYE_WIDTH = 0.32;
  const EYE_HEIGHT = 0.26;
  const EYE_CORNER_RADIUS = 0.08;
  const EYE_DISTANCE = 0.52;
  const EYE_Y = 0.14;
  const EYE_Z = HEAD_D / 2 + 0.012;        // sits on face plate
  const PUPIL_WIDTH = 0.10;
  const PUPIL_HEIGHT = 0.10;
  const PUPIL_MAX_OFFSET_X = 0.08;
  const PUPIL_MAX_OFFSET_Y = 0.04;
  const PUPIL_LERP = 0.18;

  const MOUTH_Y = -0.22;
  const MOUTH_HALF_W = 0.20;
  const MOUTH_LERP = 0.16;

  // Antenna v2 — 3 stacked segments tapering upward + small ring on top.
  // No glowing ball; this reads as a "sensor array" instead of a cartoon antenna.
  const ANTENNA_BASE_Y = HEAD_H / 2 + 0.02;
  const ANTENNA_SEG_HEIGHTS = [0.12, 0.10, 0.08];
  const ANTENNA_SEG_RADII   = [0.058, 0.044, 0.032];
  const ANTENNA_TIP_RING_RADIUS = 0.052;
  const ANTENNA_TIP_RING_TUBE = 0.012;

  const CHEEK_W = 0.18;
  const CHEEK_H = 0.10;
  const CHEEK_X = HEAD_W / 2 + 0.001;      // right side of head
  const CHEEK_Y = -0.05;
  const CHEEK_Z = -0.15;

  const TEMPLE_LED_R = 0.028;
  const TEMPLE_X = -HEAD_W / 2 - 0.001;    // left side
  const TEMPLE_Y = 0.18;
  const TEMPLE_Z = 0.15;

  const NECK_RADIUS = 0.28;
  const NECK_HEIGHT = 0.16;
  const NECK_Y = -(HEAD_H / 2) - NECK_HEIGHT / 2 + 0.03;

  // ── Body (torso + shoulders + base) — added so the robot is a full character.
  //     The body sits below the neck; head pivots on the neck.
  //     Sizing keeps the silhouette readable in a 320×240 canvas without
  //     dominating the head (head:body ≈ 0.7:1 visually).
  const TORSO_W = 1.40;
  const TORSO_H = 1.10;
  const TORSO_D = 0.90;
  const TORSO_SEGMENTS = 4;
  const TORSO_CORNER_BLEND = 0.22;
  const TORSO_Y = NECK_Y - NECK_HEIGHT / 2 - TORSO_H / 2 + 0.02;
  const SHOULDER_RADIUS = 0.30;
  const SHOULDER_X = TORSO_W / 2 + 0.05;
  const SHOULDER_Y = TORSO_Y + TORSO_H / 2 - 0.15;
  // Chest LED strip — animated mood indicator on the torso front.
  const CHEST_W = 0.90;
  const CHEST_H = 0.08;
  const CHEST_Y = TORSO_Y;
  const CHEST_Z = TORSO_D / 2 + 0.002;
  // Base (treads) — a flat oval at the very bottom so the robot sits on something.
  const BASE_RADIUS = 0.75;
  const BASE_HEIGHT = 0.14;
  const BASE_Y = TORSO_Y - TORSO_H / 2 - BASE_HEIGHT / 2 + 0.01;
  // Body breathing — torso scale subtle wave so it feels alive without bobbing.
  const BREATH_AMPLITUDE = 0.012;
  const BREATH_FREQUENCY_HZ = 0.28;

  // ── Camera / interaction ────────────────────────────────────────────────
  // Camera pulled back to fit head + torso + base in frame.
  const CAMERA_FOV = 30;
  const CAMERA_Z = 8.4;
  const HEAD_TILT_X_BASE = 0.04;
  const HEAD_TILT_AMP_X = 0.22;
  const HEAD_TILT_AMP_Y = 0.32;
  const HEAD_TILT_LERP = 0.10;
  // No bobbing — the robot stays put as a stable visual anchor. The previous
  // bob made it look "shifty" against the page; idle character comes from
  // pupil saccades / blinks / mood cycling instead.
  const HEAD_BOB_AMPLITUDE = 0;
  const HEAD_BOB_FREQUENCY_HZ = 0;

  // ── Idle behavior ───────────────────────────────────────────────────────
  const BLINK_INTERVAL_MIN_MS = 4000;
  const BLINK_INTERVAL_MAX_MS = 9000;
  const BLINK_DURATION_MS = 160;
  const ANTENNA_PULSE_RATE_BY_EXPRESSION = {
    idle: 1.4,
    thinking: 2.6,
    happy: 1.0,
    surprised: 0.6,
    sleeping: 0.35,
  };

  // ── Color palette ──────────────────────────────────────────────────────
  // Anki-Vector inspired: even lighter cream shell (almost off-white), pure
  // black screen behind the HUD for max contrast.
  const SHELL_LIGHT_HEX = 0xE2D4B8;         // lighter cream shell (lighter than v3)
  const SHELL_ACCENT_HEX = 0xC4B299;        // slightly darker accent for side panels
  const FACE_PLATE_HEX = 0x0B0907;          // pure-dark screen
  const EYE_WHITE_HEX = 0xF5F0E6;           // (unused — HUD is accent-emissive)
  const EYE_PUPIL_HEX = 0x0B0907;           // pupil dot inside HUD eye
  const NECK_HEX = 0x8C7E66;                // warm tan neck (matches shell family)

  // ── Expressions: full personality presets per expression.
  //
  // `pose` is an offset added to the cursor-driven head rotation/position.
  // `mouth` is 5 control points along the bottom (x, y per point).
  // `antennaBend` rotates the antenna's Z axis (forward droop / backward arc).
  // `bobMul` scales the idle bob amplitude (e.g. happy bobs faster + bigger).
  // `winkRate` >0 enables random one-eye wink in idle frames.
  // ─────────────────────────────────────────────────────────────────────────
  const EXPRESSION_TARGETS = {
    idle: {
      eyeScaleY: 1.0,
      pupilLook: { x: 0, y: 0 },
      mouth: [-MOUTH_HALF_W, 0, -MOUTH_HALF_W * 0.5, 0, 0, 0, MOUTH_HALF_W * 0.5, 0, MOUTH_HALF_W, 0],
      browTilt: 0,
      antennaIntensity: 0.7,
      pose: { rotX: 0,     rotY: 0, rotZ: 0,     posY: 0 },
      // bodyPose drives the torso group — independent of the head's rotation,
      // so the body can lean while the head separately tracks the cursor.
      bodyPose: { rotX: 0, rotZ: 0 },
      // Chest LED color comes from accent2 in idle, accent in alerts/etc.
      chestIntensity: 0.6,
      antennaBend: 0,
      bobMul: 1.0,
      winkRate: 0,
    },
    thinking: {
      eyeScaleY: 1.0,
      pupilLook: { x: 0.30, y: 0.55 },
      mouth: [-MOUTH_HALF_W * 0.55, 0.02, -MOUTH_HALF_W * 0.28, -0.01, 0, -0.02, MOUTH_HALF_W * 0.28, -0.01, MOUTH_HALF_W * 0.55, 0.02],
      browTilt: 0.10,
      antennaIntensity: 1.0,
      pose: { rotX: 0,     rotY: 0, rotZ: -0.16,  posY: 0.04 },
      // Body also leans into the thought — slight lateral tilt.
      bodyPose: { rotX: 0, rotZ: -0.06 },
      chestIntensity: 0.9,
      antennaBend: 0.10,
      bobMul: 0.9,
      winkRate: 0,
    },
    happy: {
      eyeScaleY: 0.35,
      pupilLook: { x: 0, y: 0 },
      mouth: [-MOUTH_HALF_W, 0.03, -MOUTH_HALF_W * 0.5, -0.07, 0, -0.11, MOUTH_HALF_W * 0.5, -0.07, MOUTH_HALF_W, 0.03],
      browTilt: -0.04,
      antennaIntensity: 0.95,
      pose: { rotX: -0.04, rotY: 0, rotZ: 0,     posY: 0 },
      bodyPose: { rotX: 0, rotZ: 0 },
      chestIntensity: 1.2,
      antennaBend: 0,
      bobMul: 1.7,
      winkRate: 0.22,
    },
    surprised: {
      eyeScaleY: 1.3,
      pupilLook: { x: 0, y: -0.2 },
      mouth: [-MOUTH_HALF_W * 0.4, 0, -MOUTH_HALF_W * 0.2, -0.05, 0, -0.09, MOUTH_HALF_W * 0.2, -0.05, MOUTH_HALF_W * 0.4, 0],
      browTilt: -0.10,
      antennaIntensity: 1.25,
      pose: { rotX: -0.22, rotY: 0, rotZ: 0,     posY: 0.08 },
      // Body recoils with the head — coordinated jolt back.
      bodyPose: { rotX: -0.10, rotZ: 0 },
      chestIntensity: 1.4,
      antennaBend: -0.35,
      bobMul: 0.5,
      winkRate: 0,
    },
    sleeping: {
      eyeScaleY: 0.06,
      pupilLook: { x: 0, y: -0.4 },
      mouth: [-MOUTH_HALF_W, 0, -MOUTH_HALF_W * 0.5, 0, 0, 0, MOUTH_HALF_W * 0.5, 0, MOUTH_HALF_W, 0],
      browTilt: 0.05,
      antennaIntensity: 0.25,
      pose: { rotX: 0.18,  rotY: 0, rotZ: 0,     posY: -0.06 },
      // Body slumps slightly forward.
      bodyPose: { rotX: 0.08, rotZ: 0 },
      chestIntensity: 0.2,
      antennaBend: 0.55,
      bobMul: 0.35,
      winkRate: 0,
    },
  };
  const EXPRESSION_CYCLE = ["idle", "thinking", "happy", "surprised", "sleeping"];

  // ── Click-nod / saccade tuning ─────────────────────────────────────────
  const NOD_KICK_RAD = -0.22;        // forward nod on click
  const NOD_DECAY_LERP = 0.16;
  const SACCADE_INTERVAL_MIN_MS = 5500;
  const SACCADE_INTERVAL_MAX_MS = 9500;
  const SACCADE_DURATION_MS = 280;
  const SACCADE_AMPLITUDE = 0.6;
  const POSE_LERP = 0.10;             // smoothing rate for pose offsets
  const ANTENNA_BEND_LERP = 0.12;
  const WINK_CHECK_HZ = 1;            // how often we roll the wink dice (1/sec)
  const WINK_DURATION_MS = 220;

  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

  function noOpController() {
    return {
      setAccent() {}, setMotion() {}, setExpression() {}, getExpression() { return "idle"; }, dispose() {},
    };
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opts]
   * @param {string} [opts.accent]
   * @param {string} [opts.accent2]
   * @param {number} [opts.motion=1]
   * @param {(state: string) => void} [opts.onExpressionChange]
   */
  function create(canvas, opts) {
    const options = opts || {};
    if (!THREE || !canvas) return noOpController();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[RobotHead] WebGL unavailable:", err.message);
      return noOpController();
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
    camera.position.set(0, 0, CAMERA_Z);

    // ── Lights — gentle, give the metal depth ─────────────────────────────
    const ambient = new THREE.AmbientLight(0xFFFFFF, 0.65);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xFFEDD8, 0.85);
    keyLight.position.set(2.5, 3, 4);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xD97757, 0.5, 8);
    fillLight.position.set(-3, -1, 2);
    scene.add(fillLight);

    // ── State ────────────────────────────────────────────────────────────
    let motion = typeof options.motion === "number" ? options.motion : 1;
    const accentColor = new THREE.Color(options.accent || "#D97757");
    const accent2Color = new THREE.Color(options.accent2 || "#C89B5E");
    const motionMedia = window.matchMedia(MEDIA_REDUCED_MOTION);
    let prefersReducedMotion = motionMedia.matches;
    const onExpressionChangeCb = typeof options.onExpressionChange === "function" ? options.onExpressionChange : null;

    let expressionCurrent = "idle";
    let blinkActive = false;
    let blinkStartedAt = 0;
    let nextBlinkAt = 0;

    // Mouse / pointer tracking (clamped to canvas-local NDC).
    let mouseNDCx = 0;
    let mouseNDCy = 0;
    let pointerDownAt = 0;
    let pointerDownPos = { x: 0, y: 0 };

    // ── Robot scene graph ────────────────────────────────────────────────
    // Three groups stacked:
    //   robot       — root, used for global tilt + drift offsets
    //     └─ body   — torso, shoulders, chest LED, base (full-body posture)
    //     └─ headPivot — head + neck + face + antenna (head-only rotation)
    //
    // This separation lets idle motions on body (breathing, bodyPose lean)
    // play independently of cursor-tracking head rotation.
    const robot = new THREE.Group();
    scene.add(robot);
    // Center the full rig vertically. The robot spans ~3 units tall
    // (top of antenna to bottom of base); offset Y so its midpoint lands at 0.
    robot.position.y = 0.55;

    const body = new THREE.Group();
    robot.add(body);

    const headPivot = new THREE.Group();
    headPivot.position.y = 0;  // head pivot defaults to robot origin; expression pose adjusts
    body.add(headPivot);

    // ── Torso ────────────────────────────────────────────────────────────
    // Same corner-softening trick as the head, smaller corner-blend so the
    // torso reads as a stable chassis (not a balloon).
    const torsoGeom = new THREE.BoxGeometry(TORSO_W, TORSO_H, TORSO_D, TORSO_SEGMENTS, TORSO_SEGMENTS, TORSO_SEGMENTS);
    {
      const pos = torsoGeom.attributes.position;
      const hx = TORSO_W / 2, hy = TORSO_H / 2, hz = TORSO_D / 2;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const dx = 1 - Math.abs(x / hx);
        const dy = 1 - Math.abs(y / hy);
        const dz = 1 - Math.abs(z / hz);
        const cornerness = Math.min(dx, dy, dz);
        const shrink = (1 - cornerness) * TORSO_CORNER_BLEND;
        pos.setXYZ(i, x * (1 - shrink), y * (1 - shrink), z * (1 - shrink));
      }
      pos.needsUpdate = true;
      torsoGeom.computeVertexNormals();
    }
    const torsoMat = new THREE.MeshStandardMaterial({
      color: SHELL_LIGHT_HEX, metalness: 0.55, roughness: 0.45,
    });
    const torso = new THREE.Mesh(torsoGeom, torsoMat);
    torso.position.y = TORSO_Y;
    body.add(torso);

    // Subtle wireframe edge accents on the torso — same as the head.
    const torsoEdgeGeom = new THREE.EdgesGeometry(torsoGeom, 35);
    const torsoEdgeMat = new THREE.LineBasicMaterial({
      color: 0xF5F0E6, transparent: true, opacity: 0.12, depthWrite: false,
    });
    const torsoEdges = new THREE.LineSegments(torsoEdgeGeom, torsoEdgeMat);
    torso.add(torsoEdges);

    // ── Shoulders — soft caps on each side of the torso. Decorative, no rig.
    const shoulderGeom = new THREE.SphereGeometry(SHOULDER_RADIUS, 18, 14);
    const shoulderMat = new THREE.MeshStandardMaterial({
      color: SHELL_ACCENT_HEX, metalness: 0.55, roughness: 0.42,
    });
    const shoulderL = new THREE.Mesh(shoulderGeom, shoulderMat);
    shoulderL.position.set(-SHOULDER_X, SHOULDER_Y, 0);
    body.add(shoulderL);
    const shoulderR = new THREE.Mesh(shoulderGeom, shoulderMat.clone());
    shoulderR.position.set(SHOULDER_X, SHOULDER_Y, 0);
    body.add(shoulderR);

    // ── Chest LED strip — accent-tinted indicator that pulses per mood.
    const chestStripGeom = new THREE.ShapeGeometry(makeRoundedRectShape(CHEST_W, CHEST_H, CHEST_H * 0.45));
    const chestStripMat = new THREE.MeshBasicMaterial({
      color: accentColor.getHex(),
      transparent: true,
      opacity: 0.85,
    });
    const chestStrip = new THREE.Mesh(chestStripGeom, chestStripMat);
    chestStrip.position.set(0, CHEST_Y, CHEST_Z);
    body.add(chestStrip);

    // Chest strip frame (slightly larger plane behind it — like a screen bezel).
    const chestFrameGeom = new THREE.ShapeGeometry(makeRoundedRectShape(CHEST_W + 0.04, CHEST_H + 0.04, CHEST_H * 0.6));
    const chestFrameMat = new THREE.MeshStandardMaterial({
      color: 0x0F0C09, metalness: 0.4, roughness: 0.55,
    });
    const chestFrame = new THREE.Mesh(chestFrameGeom, chestFrameMat);
    chestFrame.position.set(0, CHEST_Y, CHEST_Z - 0.001);
    body.add(chestFrame);

    // ── Base (tread plate) — flat oval sitting under the torso.
    const baseGeom = new THREE.CylinderGeometry(BASE_RADIUS * 0.9, BASE_RADIUS, BASE_HEIGHT, 24);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x4E4234, metalness: 0.7, roughness: 0.35,
    });
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.y = BASE_Y;
    body.add(baseMesh);

    // Base accent ring — accent-tinted torus on top of the base.
    const baseRingGeom = new THREE.TorusGeometry(BASE_RADIUS * 0.85, 0.02, 8, 32);
    const baseRingMat = new THREE.MeshBasicMaterial({
      color: accentColor.getHex(),
      transparent: true,
      opacity: 0.75,
    });
    const baseRing = new THREE.Mesh(baseRingGeom, baseRingMat);
    baseRing.position.y = BASE_Y + BASE_HEIGHT / 2 + 0.005;
    baseRing.rotation.x = Math.PI / 2;
    body.add(baseRing);

    // Head shell (BoxGeometry with shaped corners to look "rounded" cheaply).
    const headGeometry = new THREE.BoxGeometry(HEAD_W, HEAD_H, HEAD_D, HEAD_SEGMENTS, HEAD_SEGMENTS, HEAD_SEGMENTS);
    // Soften corners by pulling vertices toward a unit sphere where they sit
    // furthest from center — a cheap way to mimic a rounded-box without an
    // extra dependency, while staying low-poly.
    {
      const pos = headGeometry.attributes.position;
      const halfX = HEAD_W / 2, halfY = HEAD_H / 2, halfZ = HEAD_D / 2;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const nx = x / halfX, ny = y / halfY, nz = z / halfZ;
        // Distance from each axis surface
        const dx = 1 - Math.abs(nx);
        const dy = 1 - Math.abs(ny);
        const dz = 1 - Math.abs(nz);
        // Only soften vertices NEAR a corner (small d* on all three axes).
        const cornerness = Math.min(dx, dy, dz);
        const shrink = (1 - cornerness) * HEAD_CORNER_BLEND;
        pos.setXYZ(i, x * (1 - shrink), y * (1 - shrink), z * (1 - shrink));
      }
      pos.needsUpdate = true;
      headGeometry.computeVertexNormals();
    }
    const headMaterial = new THREE.MeshStandardMaterial({
      color: SHELL_LIGHT_HEX, metalness: 0.55, roughness: 0.42,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    headPivot.add(head);

    // Subtle edge accents — wireframe over edges only.
    const headEdgeGeometry = new THREE.EdgesGeometry(headGeometry, 35);
    const headEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xF5F0E6, transparent: true, opacity: 0.14, depthWrite: false,
    });
    const headEdges = new THREE.LineSegments(headEdgeGeometry, headEdgeMaterial);
    head.add(headEdges);

    // Face plate — rounded-rectangle inset that reads as a screen. Built via
    // ShapeGeometry so corners actually have a radius (a plain plane wouldn't).
    // makeRoundedRectShape is a function declaration hoisted from below.
    const facePlateGeom = new THREE.ShapeGeometry(makeRoundedRectShape(FACE_PLATE_W, FACE_PLATE_H, FACE_PLATE_CORNER_R));
    const facePlateMat = new THREE.MeshStandardMaterial({
      color: FACE_PLATE_HEX, metalness: 0.4, roughness: 0.55,
    });
    const facePlate = new THREE.Mesh(facePlateGeom, facePlateMat);
    facePlate.position.set(0, 0, HEAD_D / 2 + FACE_PLATE_DEPTH_OFFSET);
    headPivot.add(facePlate);

    // Subtle bezel — slightly larger plane behind the rounded screen so the
    // edge reads as a "lip" mounted into the head.
    const bezelGeom = new THREE.ShapeGeometry(makeRoundedRectShape(FACE_PLATE_W + 0.06, FACE_PLATE_H + 0.06, FACE_PLATE_CORNER_R + 0.03));
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x6E5F49, metalness: 0.6, roughness: 0.4,
    });
    const bezel = new THREE.Mesh(bezelGeom, bezelMat);
    bezel.position.set(0, 0, HEAD_D / 2 + FACE_PLATE_DEPTH_OFFSET - 0.002);
    headPivot.add(bezel);

    // Decorative side panels (vertical lines on the cheeks).
    const sidePanelGeom = new THREE.PlaneGeometry(0.06, 0.6);
    const sidePanelMat = new THREE.MeshBasicMaterial({
      color: 0xF5F0E6, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    });
    const sidePanelL = new THREE.Mesh(sidePanelGeom, sidePanelMat);
    sidePanelL.position.set(-HEAD_W / 2 - 0.001, -0.05, 0);
    sidePanelL.rotation.y = -Math.PI / 2;
    headPivot.add(sidePanelL);
    const sidePanelR = sidePanelL.clone();
    sidePanelR.position.x = HEAD_W / 2 + 0.001;
    sidePanelR.rotation.y = Math.PI / 2;
    headPivot.add(sidePanelR);

    // (Bolts removed — Anki-Vector style is cleaner without rivets.
    //  A subtle frame inside the face plate gives the "mounted screen" feel.)

    // HUD-visor eyes — rounded-rectangle emissive planes sitting on the face
    // plate. No 3D spheres. Pupils are small accent-bright squares inside that
    // translate to track the cursor. Reads as "sci-fi HUD", not cartoon face.
    function makeRoundedRectShape(w, h, r) {
      const shape = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      const rad = Math.min(r, Math.min(w, h) / 2 - 0.001);
      shape.moveTo(x + rad, y);
      shape.lineTo(x + w - rad, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + rad);
      shape.lineTo(x + w, y + h - rad);
      shape.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
      shape.lineTo(x + rad, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - rad);
      shape.lineTo(x, y + rad);
      shape.quadraticCurveTo(x, y, x + rad, y);
      return shape;
    }
    const eyeShape = makeRoundedRectShape(EYE_WIDTH, EYE_HEIGHT, EYE_CORNER_RADIUS);
    const eyeGeom = new THREE.ShapeGeometry(eyeShape);
    const eyeMat = new THREE.MeshBasicMaterial({
      color: accentColor.getHex(),
      transparent: true,
      opacity: 0.92,
    });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-EYE_DISTANCE / 2, EYE_Y, EYE_Z);
    headPivot.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat.clone());
    eyeR.position.set(EYE_DISTANCE / 2, EYE_Y, EYE_Z);
    headPivot.add(eyeR);

    // Eye outer border (dim frame around the lit eye — adds depth).
    const eyeFrameShape = makeRoundedRectShape(EYE_WIDTH + 0.03, EYE_HEIGHT + 0.03, EYE_CORNER_RADIUS + 0.015);
    const eyeFrameGeom = new THREE.ShapeGeometry(eyeFrameShape);
    const eyeFrameMat = new THREE.MeshBasicMaterial({
      color: 0x0A0908,
      transparent: true,
      opacity: 0.9,
    });
    const eyeFrameL = new THREE.Mesh(eyeFrameGeom, eyeFrameMat);
    eyeFrameL.position.set(-EYE_DISTANCE / 2, EYE_Y, EYE_Z - 0.001);
    headPivot.add(eyeFrameL);
    const eyeFrameR = new THREE.Mesh(eyeFrameGeom, eyeFrameMat.clone());
    eyeFrameR.position.set(EYE_DISTANCE / 2, EYE_Y, EYE_Z - 0.001);
    headPivot.add(eyeFrameR);

    // Pupils — small bright squares INSIDE the eye plane, child of the eye so
    // they inherit eye scale/rotation. They translate to track the cursor.
    const pupilShape = makeRoundedRectShape(PUPIL_WIDTH, PUPIL_HEIGHT, PUPIL_WIDTH * 0.45);
    const pupilGeom = new THREE.ShapeGeometry(pupilShape);
    const pupilMat = new THREE.MeshBasicMaterial({
      color: 0x0A0908,
      transparent: true,
      opacity: 0.95,
    });
    const pupilL = new THREE.Mesh(pupilGeom, pupilMat);
    pupilL.position.set(0, 0, 0.005);
    eyeL.add(pupilL);
    const pupilR = new THREE.Mesh(pupilGeom, pupilMat.clone());
    pupilR.position.set(0, 0, 0.005);
    eyeR.add(pupilR);

    // Mouth — 5 control points on a LineGeometry, vertices animated per
    // expression. Uses Line (not LineSegments) so it draws as a connected path.
    const mouthVerts = new Float32Array(5 * 3);
    for (let i = 0; i < 5; i++) {
      mouthVerts[i * 3 + 0] = -MOUTH_HALF_W + (i / 4) * (MOUTH_HALF_W * 2);
      mouthVerts[i * 3 + 1] = MOUTH_Y;
      mouthVerts[i * 3 + 2] = HEAD_D / 2 + FACE_PLATE_DEPTH_OFFSET + 0.012;
    }
    const mouthGeom = new THREE.BufferGeometry();
    mouthGeom.setAttribute("position", new THREE.BufferAttribute(mouthVerts, 3).setUsage(THREE.DynamicDrawUsage));
    const mouthMat = new THREE.LineBasicMaterial({ color: 0xF5F0E6, linewidth: 2 });
    const mouth = new THREE.Line(mouthGeom, mouthMat);
    headPivot.add(mouth);

    // Antenna v2 — 3 tapered cylinder segments stacked vertically + a small
    // emissive ring on top. Reads as a sensor array, not a cartoon antenna.
    // All segments are grouped under `antenna` so bending applies once.
    const antenna = new THREE.Group();
    const antennaSegmentsMat = new THREE.MeshStandardMaterial({
      color: SHELL_LIGHT_HEX, metalness: 0.72, roughness: 0.32,
    });
    let cursorY = 0;
    const antennaSegMeshes = [];
    for (let i = 0; i < ANTENNA_SEG_HEIGHTS.length; i++) {
      const rBottom = ANTENNA_SEG_RADII[i];
      const rTop = ANTENNA_SEG_RADII[i + 1] !== undefined ? ANTENNA_SEG_RADII[i + 1] : rBottom * 0.85;
      const h = ANTENNA_SEG_HEIGHTS[i];
      const segGeom = new THREE.CylinderGeometry(rTop, rBottom, h, 10);
      const seg = new THREE.Mesh(segGeom, antennaSegmentsMat);
      seg.position.y = cursorY + h / 2;
      cursorY += h;
      antenna.add(seg);
      antennaSegMeshes.push(seg);
    }

    // Top emissive ring — pulses with mood + accent color.
    const antennaTipGeom = new THREE.TorusGeometry(ANTENNA_TIP_RING_RADIUS, ANTENNA_TIP_RING_TUBE, 8, 24);
    const antennaTipMat = new THREE.MeshStandardMaterial({
      color: accentColor.getHex(),
      emissive: accentColor.getHex(),
      emissiveIntensity: 1.1,
      metalness: 0.5,
      roughness: 0.35,
    });
    const antennaTip = new THREE.Mesh(antennaTipGeom, antennaTipMat);
    antennaTip.position.y = cursorY + ANTENNA_TIP_RING_TUBE;
    antennaTip.rotation.x = Math.PI / 2;
    antenna.add(antennaTip);

    antenna.position.set(0, ANTENNA_BASE_Y, 0);
    headPivot.add(antenna);

    // Cheek screen (right) — emissive plane mounted on the side.
    const cheekGeom = new THREE.PlaneGeometry(CHEEK_W, CHEEK_H);
    const cheekMat = new THREE.MeshBasicMaterial({
      color: accent2Color.getHex(), transparent: true, opacity: 0.9, side: THREE.DoubleSide,
    });
    const cheekScreen = new THREE.Mesh(cheekGeom, cheekMat);
    cheekScreen.position.set(CHEEK_X, CHEEK_Y, CHEEK_Z);
    cheekScreen.rotation.y = Math.PI / 2;
    headPivot.add(cheekScreen);

    // Cheek screen border (slightly larger plane behind).
    const cheekBorderGeom = new THREE.PlaneGeometry(CHEEK_W + 0.03, CHEEK_H + 0.025);
    const cheekBorderMat = new THREE.MeshStandardMaterial({
      color: 0x0F0D0B, metalness: 0.4, roughness: 0.6,
    });
    const cheekBorder = new THREE.Mesh(cheekBorderGeom, cheekBorderMat);
    cheekBorder.position.set(CHEEK_X - 0.001, CHEEK_Y, CHEEK_Z);
    cheekBorder.rotation.y = Math.PI / 2;
    headPivot.add(cheekBorder);

    // Temple LED (left).
    const templeGeom = new THREE.SphereGeometry(TEMPLE_LED_R, 12, 12);
    const templeMat = new THREE.MeshBasicMaterial({ color: accentColor.getHex() });
    const templeLED = new THREE.Mesh(templeGeom, templeMat);
    templeLED.position.set(TEMPLE_X, TEMPLE_Y, TEMPLE_Z);
    headPivot.add(templeLED);

    // Neck.
    const neckGeom = new THREE.CylinderGeometry(NECK_RADIUS, NECK_RADIUS, NECK_HEIGHT, 18);
    const neckMat = new THREE.MeshStandardMaterial({
      color: NECK_HEX, metalness: 0.7, roughness: 0.35,
    });
    const neck = new THREE.Mesh(neckGeom, neckMat);
    neck.position.set(0, NECK_Y, 0);
    headPivot.add(neck);

    // Neck-collar accent ring.
    const collarGeom = new THREE.TorusGeometry(NECK_RADIUS * 0.95, 0.018, 8, 32);
    const collarMat = new THREE.MeshBasicMaterial({ color: accentColor.getHex(), transparent: true, opacity: 0.7 });
    const collar = new THREE.Mesh(collarGeom, collarMat);
    collar.position.set(0, NECK_Y + NECK_HEIGHT / 2 - 0.02, 0);
    collar.rotation.x = Math.PI / 2;
    headPivot.add(collar);

    // ── Smooth animation state ────────────────────────────────────────────
    const eyeScaleYCurrent = { value: 1.0 };
    const pupilLookCurrent = { x: 0, y: 0 };
    const mouthCurrent = new Float32Array(5 * 2);   // [x0,y0,x1,y1,...]
    for (let i = 0; i < 5; i++) {
      mouthCurrent[i * 2 + 0] = -MOUTH_HALF_W + (i / 4) * (MOUTH_HALF_W * 2);
      mouthCurrent[i * 2 + 1] = 0;
    }
    const browTiltCurrent = { value: 0 };
    const antennaIntensityCurrent = { value: 0.7 };

    // Per-expression personality state. Lerps every frame toward target pose.
    const poseCurrent = { rotX: 0, rotY: 0, rotZ: 0, posY: 0 };
    const bodyPoseCurrent = { rotX: 0, rotZ: 0 };
    const chestIntensityCurrent = { value: 0.6 };
    const antennaBendCurrent = { value: 0 };

    // Nod (click feedback) — pulse on rotX that decays back to 0.
    let nodOffset = 0;

    // Saccade — temporary pupil deflection that returns to expression target.
    let saccadeOffset = { x: 0, y: 0 };
    let saccadeStartedAt = 0;
    let saccadeTarget = { x: 0, y: 0 };
    let nextSaccadeAt = performance.now() + SACCADE_INTERVAL_MIN_MS;
    let saccadeActive = false;

    // Wink — temporary scale-Y override for one eye.
    let winkActiveSide = null;   // 'L' | 'R' | null
    let winkStartedAt = 0;
    let lastWinkCheckAt = 0;

    function applyExpressionLerp(dtFactor) {
      const target = EXPRESSION_TARGETS[expressionCurrent] || EXPRESSION_TARGETS.idle;
      const k = clamp(MOUTH_LERP * dtFactor, 0.01, 1);
      // Mouth control points
      for (let i = 0; i < 5; i++) {
        const tx = target.mouth[i * 2 + 0];
        const ty = target.mouth[i * 2 + 1];
        mouthCurrent[i * 2 + 0] = lerp(mouthCurrent[i * 2 + 0], tx, k);
        mouthCurrent[i * 2 + 1] = lerp(mouthCurrent[i * 2 + 1], ty, k);
        const vi = i * 3;
        mouthVerts[vi + 0] = mouthCurrent[i * 2 + 0];
        mouthVerts[vi + 1] = MOUTH_Y + mouthCurrent[i * 2 + 1];
      }
      mouthGeom.attributes.position.needsUpdate = true;

      eyeScaleYCurrent.value = lerp(eyeScaleYCurrent.value, target.eyeScaleY, k);
      pupilLookCurrent.x = lerp(pupilLookCurrent.x, target.pupilLook.x, k);
      pupilLookCurrent.y = lerp(pupilLookCurrent.y, target.pupilLook.y, k);
      browTiltCurrent.value = lerp(browTiltCurrent.value, target.browTilt, k);
      antennaIntensityCurrent.value = lerp(antennaIntensityCurrent.value, target.antennaIntensity, k);
    }

    // ── Blink scheduling ─────────────────────────────────────────────────
    function scheduleNextBlink(now) {
      const delta = BLINK_INTERVAL_MIN_MS + Math.random() * (BLINK_INTERVAL_MAX_MS - BLINK_INTERVAL_MIN_MS);
      nextBlinkAt = now + delta;
    }
    scheduleNextBlink(performance.now());

    // ── Interaction ──────────────────────────────────────────────────────
    function rectClientToNDC(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const nx = clamp((clientX - r.left) / r.width * 2 - 1, -1, 1);
      const ny = clamp(-((clientY - r.top) / r.height * 2 - 1), -1, 1);
      return { x: nx, y: ny };
    }

    function onPointerMove(e) {
      const c = (e.touches && e.touches[0]) ? e.touches[0] : e;
      const ndc = rectClientToNDC(c.clientX, c.clientY);
      mouseNDCx = ndc.x;
      mouseNDCy = ndc.y;
    }
    function onPointerDown(e) {
      pointerDownAt = performance.now();
      const c = (e.touches && e.touches[0]) ? e.touches[0] : e;
      pointerDownPos = { x: c.clientX, y: c.clientY };
    }
    function onPointerUp(e) {
      const took = performance.now() - pointerDownAt;
      const c = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : e;
      const movedX = Math.abs(c.clientX - pointerDownPos.x);
      const movedY = Math.abs(c.clientY - pointerDownPos.y);
      if (took < 320 && movedX < 8 && movedY < 8) cycleExpression();
    }

    canvas.addEventListener("mousemove", onPointerMove, { passive: true });
    canvas.addEventListener("touchmove", function (e) {
      e.preventDefault();
      onPointerMove(e);
    }, { passive: false });
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("touchstart", onPointerDown, { passive: true });
    canvas.addEventListener("mouseup", onPointerUp);
    canvas.addEventListener("touchend", onPointerUp);
    canvas.addEventListener("touchcancel", onPointerUp);

    // Force a synchronized blink + nod to mask the expression transition.
    // Returning a function (rather than inlining) keeps cycleExpression /
    // setExpression in sync without copy-pasting.
    function onExpressionTransition() {
      // Nod: snap to kick, then it decays each frame via NOD_DECAY_LERP.
      nodOffset = NOD_KICK_RAD;
      // Schedule a blink immediately to hide the snap of mouth/eyes.
      blinkActive = true;
      blinkStartedAt = performance.now();
      // Push the next scheduled blink out so we don't double-fire.
      nextBlinkAt = blinkStartedAt + BLINK_DURATION_MS + (BLINK_INTERVAL_MIN_MS + Math.random() * (BLINK_INTERVAL_MAX_MS - BLINK_INTERVAL_MIN_MS));
    }

    function cycleExpression() {
      const idx = EXPRESSION_CYCLE.indexOf(expressionCurrent);
      const next = EXPRESSION_CYCLE[(idx + 1) % EXPRESSION_CYCLE.length];
      expressionCurrent = next;
      onExpressionTransition();
      if (onExpressionChangeCb) {
        try { onExpressionChangeCb(next); }
        catch (cbErr) { /* eslint-disable-next-line no-console */ console.warn("[RobotHead] onExpressionChange threw:", cbErr); }
      }
    }

    // ── Resize ────────────────────────────────────────────────────────────
    function resize() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(2, r.width);
      const h = Math.max(2, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const resizeObserver = ("ResizeObserver" in window) ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(canvas);
    else window.addEventListener("resize", resize);
    resize();

    // ── Visibility ───────────────────────────────────────────────────────
    let isVisible = !document.hidden;
    function onVisibilityChange() { isVisible = !document.hidden; lastFrame = performance.now(); }
    document.addEventListener("visibilitychange", onVisibilityChange);
    function onMotionPrefChange(e) { prefersReducedMotion = e.matches; }
    if (motionMedia.addEventListener) motionMedia.addEventListener("change", onMotionPrefChange);
    else if (motionMedia.addListener) motionMedia.addListener(onMotionPrefChange);

    // ── Animation loop ───────────────────────────────────────────────────
    let rafHandle = 0;
    let lastFrame = performance.now();

    function tick(now) {
      rafHandle = requestAnimationFrame(tick);
      if (!isVisible) { lastFrame = now; return; }

      const elapsed = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      const motionMul = prefersReducedMotion ? 0.1 : motion;
      const dtFactor = elapsed * 60 * motionMul;
      const tSec = now * 0.001;
      const target = EXPRESSION_TARGETS[expressionCurrent] || EXPRESSION_TARGETS.idle;

      // ── Pose lerp: per-expression head offset (additive to cursor-tilt).
      poseCurrent.rotX = lerp(poseCurrent.rotX, target.pose.rotX, POSE_LERP);
      poseCurrent.rotY = lerp(poseCurrent.rotY, target.pose.rotY, POSE_LERP);
      poseCurrent.rotZ = lerp(poseCurrent.rotZ, target.pose.rotZ, POSE_LERP);
      poseCurrent.posY = lerp(poseCurrent.posY, target.pose.posY, POSE_LERP);

      // ── Nod decay (kicked on expression change).
      nodOffset = lerp(nodOffset, 0, NOD_DECAY_LERP);

      // ── Head tilt: cursor-tracking + expression pose + nod (no bob — set to 0).
      // Applied to headPivot ONLY so the body stays stable while the head moves.
      const tiltY = mouseNDCx * HEAD_TILT_AMP_Y + poseCurrent.rotY;
      const tiltX = HEAD_TILT_X_BASE - mouseNDCy * HEAD_TILT_AMP_X + poseCurrent.rotX + nodOffset;
      const tiltZ = poseCurrent.rotZ;
      headPivot.rotation.y = lerp(headPivot.rotation.y, tiltY, HEAD_TILT_LERP);
      headPivot.rotation.x = lerp(headPivot.rotation.x, tiltX, HEAD_TILT_LERP);
      headPivot.rotation.z = lerp(headPivot.rotation.z, tiltZ, HEAD_TILT_LERP);
      headPivot.position.y = poseCurrent.posY;

      // ── Body posture (per-expression lean) + subtle breathing (Y-scale wave).
      if (target.bodyPose) {
        bodyPoseCurrent.rotX = lerp(bodyPoseCurrent.rotX, target.bodyPose.rotX, POSE_LERP);
        bodyPoseCurrent.rotZ = lerp(bodyPoseCurrent.rotZ, target.bodyPose.rotZ, POSE_LERP);
      }
      body.rotation.x = bodyPoseCurrent.rotX;
      body.rotation.z = bodyPoseCurrent.rotZ;
      const breath = 1 + Math.sin(tSec * BREATH_FREQUENCY_HZ * 2 * Math.PI) * BREATH_AMPLITUDE * motionMul;
      body.scale.y = breath;

      // Chest LED intensity lerps with expression target.
      const chestTarget = target.chestIntensity != null ? target.chestIntensity : 0.6;
      chestIntensityCurrent.value = lerp(chestIntensityCurrent.value, chestTarget, 0.08);
      chestStripMat.opacity = 0.4 + chestIntensityCurrent.value * 0.55;
      chestStripMat.color.setRGB(accentColor.r, accentColor.g, accentColor.b);
      baseRingMat.color.setRGB(accentColor.r, accentColor.g, accentColor.b);

      // ── Saccade (random pupil twitch during idle frames).
      if (!saccadeActive && now >= nextSaccadeAt && expressionCurrent === "idle") {
        saccadeActive = true;
        saccadeStartedAt = now;
        const angle = Math.random() * Math.PI * 2;
        saccadeTarget = {
          x: Math.cos(angle) * SACCADE_AMPLITUDE,
          y: Math.sin(angle) * SACCADE_AMPLITUDE,
        };
      }
      if (saccadeActive) {
        const t = (now - saccadeStartedAt) / SACCADE_DURATION_MS;
        if (t >= 1) {
          saccadeActive = false;
          saccadeOffset.x = 0;
          saccadeOffset.y = 0;
          nextSaccadeAt = now + SACCADE_INTERVAL_MIN_MS + Math.random() * (SACCADE_INTERVAL_MAX_MS - SACCADE_INTERVAL_MIN_MS);
        } else {
          // Out-and-back curve: peak at t=0.4, return to 0 at t=1.
          const peak = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
          saccadeOffset.x = saccadeTarget.x * peak;
          saccadeOffset.y = saccadeTarget.y * peak;
        }
      }

      // ── Pupil tracking — expression base + mouse + saccade.
      const mouseInfluence = expressionCurrent === "sleeping" ? 0 : 0.7;
      const wantX = clamp(target.pupilLook.x + mouseNDCx * mouseInfluence + saccadeOffset.x, -1, 1);
      const wantY = clamp(target.pupilLook.y + mouseNDCy * mouseInfluence + saccadeOffset.y, -1, 1);
      pupilLookCurrent.x = lerp(pupilLookCurrent.x, wantX, PUPIL_LERP);
      pupilLookCurrent.y = lerp(pupilLookCurrent.y, wantY, PUPIL_LERP);
      pupilL.position.x = pupilLookCurrent.x * PUPIL_MAX_OFFSET_X;
      pupilL.position.y = pupilLookCurrent.y * PUPIL_MAX_OFFSET_Y;
      pupilR.position.x = pupilLookCurrent.x * PUPIL_MAX_OFFSET_X;
      pupilR.position.y = pupilLookCurrent.y * PUPIL_MAX_OFFSET_Y;

      // ── Eye scale — base lerp toward expression eyeScaleY, then blink/wink overrides.
      let eyeYL = lerp(eyeL.scale.y, target.eyeScaleY, 0.18);
      let eyeYR = lerp(eyeR.scale.y, target.eyeScaleY, 0.18);

      // Blink — both eyes scale-Y → near 0 → back.
      if (now >= nextBlinkAt && !blinkActive) {
        blinkActive = true;
        blinkStartedAt = now;
      }
      if (blinkActive) {
        const t = (now - blinkStartedAt) / BLINK_DURATION_MS;
        if (t >= 1) {
          blinkActive = false;
          scheduleNextBlink(now);
        } else {
          const closed = 1 - Math.abs(0.5 - t) * 2;
          const factor = (1 - closed);
          eyeYL *= factor;
          eyeYR *= factor;
        }
      }

      // Wink (happy only) — one eye closes briefly.
      if (target.winkRate > 0 && now - lastWinkCheckAt > 1000 / WINK_CHECK_HZ) {
        lastWinkCheckAt = now;
        if (!winkActiveSide && Math.random() < target.winkRate) {
          winkActiveSide = Math.random() < 0.5 ? "L" : "R";
          winkStartedAt = now;
        }
      }
      if (winkActiveSide) {
        const t = (now - winkStartedAt) / WINK_DURATION_MS;
        if (t >= 1) {
          winkActiveSide = null;
        } else {
          const closed = 1 - Math.abs(0.5 - t) * 2;
          const factor = 1 - closed;
          if (winkActiveSide === "L") eyeYL *= factor;
          else eyeYR *= factor;
        }
      }

      const fL = Math.max(0.05, eyeYL);
      const fR = Math.max(0.05, eyeYR);
      eyeL.scale.set(1, fL, 1);
      eyeR.scale.set(1, fR, 1);
      // Eye frame follows the eye's vertical scale so the dim border doesn't
      // poke out when the HUD closes.
      eyeFrameL.scale.set(1, Math.max(0.2, fL), 1);
      eyeFrameR.scale.set(1, Math.max(0.2, fR), 1);

      // Mouth + brow + antenna intensity toward expression target.
      applyExpressionLerp(dtFactor);

      // Antenna pulse + bend.
      // The whole antenna (segments + ring tip) is now a single group, so
      // bending = rotation.z around the group's base — no manual sync needed.
      const rate = ANTENNA_PULSE_RATE_BY_EXPRESSION[expressionCurrent] || 1.0;
      const pulse = 0.65 + 0.55 * (0.5 + 0.5 * Math.sin(tSec * rate * 2 * Math.PI));
      antennaTipMat.emissiveIntensity = pulse * antennaIntensityCurrent.value;
      antennaTipMat.color.setRGB(accentColor.r, accentColor.g, accentColor.b);
      antennaTipMat.emissive.setRGB(accentColor.r, accentColor.g, accentColor.b);
      antennaBendCurrent.value = lerp(antennaBendCurrent.value, target.antennaBend, ANTENNA_BEND_LERP);
      antenna.rotation.z = antennaBendCurrent.value;

      // Temple LED blink (every ~1.6s, half-second on).
      const ledOn = (tSec * 0.625) % 1 < 0.35;
      templeMat.opacity = ledOn ? 1 : 0.25;
      templeMat.transparent = true;

      cheekMat.color.setRGB(accent2Color.r, accent2Color.g, accent2Color.b);
      collarMat.color.setRGB(accentColor.r, accentColor.g, accentColor.b);
      // Eyes (HUD) and temple LED track accent live so they always match the
      // current theme — without this, color was frozen at init time.
      eyeMat.color.setRGB(accentColor.r, accentColor.g, accentColor.b);
      eyeR.material.color.setRGB(accentColor.r, accentColor.g, accentColor.b);
      templeMat.color.setRGB(accentColor.r, accentColor.g, accentColor.b);

      mouth.rotation.z = browTiltCurrent.value;

      renderer.render(scene, camera);
    }
    rafHandle = requestAnimationFrame(tick);

    return {
      setAccent(hex1, hex2) {
        if (hex1) accentColor.set(hex1);
        if (hex2) accent2Color.set(hex2);
      },
      setMotion(m) { motion = clamp(m, 0, 2); },
      setExpression(name) {
        if (!EXPRESSION_TARGETS[name]) return;
        if (name === expressionCurrent) return;
        expressionCurrent = name;
        onExpressionTransition();
        if (onExpressionChangeCb) {
          try { onExpressionChangeCb(name); } catch (cbErr) { /* eslint-disable-next-line no-console */ console.warn("[RobotHead] onExpressionChange threw:", cbErr); }
        }
      },
      getExpression() { return expressionCurrent; },
      cycleExpression: cycleExpression,
      dispose() {
        cancelAnimationFrame(rafHandle);
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", resize);
        canvas.removeEventListener("mousemove", onPointerMove);
        canvas.removeEventListener("touchmove", onPointerMove);
        canvas.removeEventListener("mousedown", onPointerDown);
        canvas.removeEventListener("touchstart", onPointerDown);
        canvas.removeEventListener("mouseup", onPointerUp);
        canvas.removeEventListener("touchend", onPointerUp);
        canvas.removeEventListener("touchcancel", onPointerUp);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (motionMedia.removeEventListener) motionMedia.removeEventListener("change", onMotionPrefChange);
        else if (motionMedia.removeListener) motionMedia.removeListener(onMotionPrefChange);
        // Dispose all geometries and materials. Antenna is a THREE.Group whose
        // children we dispose individually; the group itself has no geometry.
        const meshObjects = [
          head, headEdges, facePlate, bezel, sidePanelL, sidePanelR,
          eyeL, eyeR, eyeFrameL, eyeFrameR, pupilL, pupilR,
          mouth, antennaTip,
          cheekScreen, cheekBorder, templeLED, neck, collar,
          // Body pieces
          torso, torsoEdges, shoulderL, shoulderR,
          chestStrip, chestFrame, baseMesh, baseRing,
        ].concat(antennaSegMeshes);
        meshObjects.forEach(function disposeOne(obj) {
          if (obj.geometry && obj.geometry.dispose) obj.geometry.dispose();
          if (obj.material && obj.material.dispose) obj.material.dispose();
        });
        renderer.dispose();
      },
    };
  }

  window.RobotHead = { create: create };
  // Backward-compat shim: keep window.Brain alive so any cached components
  // that still call Brain.create just transparently get a robot head.
  window.Brain = window.Brain || { create: create };
})();
