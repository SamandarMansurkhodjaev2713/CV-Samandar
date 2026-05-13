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
  const HEAD_W = 1.6;
  const HEAD_H = 1.45;
  const HEAD_D = 1.15;
  const HEAD_SEGMENTS = 4;                 // bevel-ish look
  const HEAD_CORNER_BLEND = 0.18;          // scale shrink near corners
  const FACE_PLATE_W = 1.18;
  const FACE_PLATE_H = 0.95;
  const FACE_PLATE_DEPTH_OFFSET = 0.001;

  const EYE_RADIUS = 0.16;
  const EYE_DISTANCE = 0.34;
  const EYE_Y = 0.10;
  const EYE_Z = HEAD_D / 2 + 0.005;        // slightly in front of face plate
  const PUPIL_RADIUS = 0.062;
  const PUPIL_MAX_OFFSET = 0.07;           // socket clamp
  const PUPIL_LERP = 0.18;

  const MOUTH_Y = -0.22;
  const MOUTH_HALF_W = 0.20;
  const MOUTH_LERP = 0.16;

  const ANTENNA_BASE_Y = HEAD_H / 2 + 0.02;
  const ANTENNA_LEN = 0.42;
  const ANTENNA_RADIUS = 0.04;
  const ANTENNA_TIP_R = 0.085;

  const CHEEK_W = 0.18;
  const CHEEK_H = 0.10;
  const CHEEK_X = HEAD_W / 2 + 0.001;      // right side of head
  const CHEEK_Y = -0.05;
  const CHEEK_Z = -0.15;

  const TEMPLE_LED_R = 0.028;
  const TEMPLE_X = -HEAD_W / 2 - 0.001;    // left side
  const TEMPLE_Y = 0.18;
  const TEMPLE_Z = 0.15;

  const NECK_RADIUS = 0.32;
  const NECK_HEIGHT = 0.18;
  const NECK_Y = -(HEAD_H / 2) - NECK_HEIGHT / 2 + 0.05;

  // ── Camera / interaction ────────────────────────────────────────────────
  const CAMERA_FOV = 32;
  const CAMERA_Z = 5.5;
  const HEAD_TILT_X_BASE = 0.04;
  const HEAD_TILT_AMP_X = 0.22;
  const HEAD_TILT_AMP_Y = 0.32;
  const HEAD_TILT_LERP = 0.10;
  const HEAD_BOB_AMPLITUDE = 0.035;
  const HEAD_BOB_FREQUENCY_HZ = 0.4;

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

  // ── Color palette (driven by accent at runtime) ────────────────────────
  const SHELL_DARK_HEX = 0x2A2520;          // base head metal
  const FACE_PLATE_HEX = 0x141210;          // darker inset
  const EYE_WHITE_HEX = 0xF5F0E6;
  const EYE_PUPIL_HEX = 0x12100E;
  const NECK_HEX = 0x1B1916;

  // ── Expressions: keyframe targets per expression ───────────────────────
  /**
   * Each expression target is a partial — we lerp toward these values every
   * frame. Eyes scaleY < 1 = closed; mouth shape is encoded by 5 control
   * points along the bottom of the face.
   */
  const EXPRESSION_TARGETS = {
    idle: {
      eyeScaleY: 1.0,
      pupilLook: { x: 0, y: 0 },
      mouth: [-MOUTH_HALF_W, 0, -MOUTH_HALF_W * 0.5, 0, 0, 0, MOUTH_HALF_W * 0.5, 0, MOUTH_HALF_W, 0],
      browTilt: 0,
      antennaIntensity: 0.7,
    },
    thinking: {
      eyeScaleY: 1.0,
      pupilLook: { x: 0.25, y: 0.6 },     // looking up-right
      mouth: [-MOUTH_HALF_W * 0.6, 0.02, -MOUTH_HALF_W * 0.3, -0.01, 0, -0.02, MOUTH_HALF_W * 0.3, -0.01, MOUTH_HALF_W * 0.6, 0.02],
      browTilt: 0.08,
      antennaIntensity: 1.0,
    },
    happy: {
      eyeScaleY: 0.35,                     // squinted
      pupilLook: { x: 0, y: 0 },
      mouth: [-MOUTH_HALF_W, 0.03, -MOUTH_HALF_W * 0.5, -0.07, 0, -0.11, MOUTH_HALF_W * 0.5, -0.07, MOUTH_HALF_W, 0.03],
      browTilt: -0.04,
      antennaIntensity: 0.85,
    },
    surprised: {
      eyeScaleY: 1.25,                     // wide open
      pupilLook: { x: 0, y: -0.2 },
      mouth: [-MOUTH_HALF_W * 0.4, 0, -MOUTH_HALF_W * 0.2, -0.05, 0, -0.09, MOUTH_HALF_W * 0.2, -0.05, MOUTH_HALF_W * 0.4, 0],
      browTilt: -0.08,
      antennaIntensity: 1.2,
    },
    sleeping: {
      eyeScaleY: 0.06,                     // closed eyes
      pupilLook: { x: 0, y: -0.4 },
      mouth: [-MOUTH_HALF_W, 0, -MOUTH_HALF_W * 0.5, 0, 0, 0, MOUTH_HALF_W * 0.5, 0, MOUTH_HALF_W, 0],
      browTilt: 0.05,
      antennaIntensity: 0.25,
    },
  };
  const EXPRESSION_CYCLE = ["idle", "thinking", "happy", "surprised", "sleeping"];

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

    // ── Robot group ──────────────────────────────────────────────────────
    const robot = new THREE.Group();
    scene.add(robot);

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
      color: SHELL_DARK_HEX, metalness: 0.55, roughness: 0.42,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    robot.add(head);

    // Subtle edge accents — wireframe over edges only.
    const headEdgeGeometry = new THREE.EdgesGeometry(headGeometry, 35);
    const headEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xF5F0E6, transparent: true, opacity: 0.14, depthWrite: false,
    });
    const headEdges = new THREE.LineSegments(headEdgeGeometry, headEdgeMaterial);
    head.add(headEdges);

    // Face plate (darker inset rectangle).
    const facePlateGeom = new THREE.PlaneGeometry(FACE_PLATE_W, FACE_PLATE_H);
    const facePlateMat = new THREE.MeshStandardMaterial({
      color: FACE_PLATE_HEX, metalness: 0.3, roughness: 0.6,
    });
    const facePlate = new THREE.Mesh(facePlateGeom, facePlateMat);
    facePlate.position.set(0, 0, HEAD_D / 2 + FACE_PLATE_DEPTH_OFFSET);
    robot.add(facePlate);

    // Decorative side panels (vertical lines on the cheeks).
    const sidePanelGeom = new THREE.PlaneGeometry(0.06, 0.6);
    const sidePanelMat = new THREE.MeshBasicMaterial({
      color: 0xF5F0E6, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    });
    const sidePanelL = new THREE.Mesh(sidePanelGeom, sidePanelMat);
    sidePanelL.position.set(-HEAD_W / 2 - 0.001, -0.05, 0);
    sidePanelL.rotation.y = -Math.PI / 2;
    robot.add(sidePanelL);
    const sidePanelR = sidePanelL.clone();
    sidePanelR.position.x = HEAD_W / 2 + 0.001;
    sidePanelR.rotation.y = Math.PI / 2;
    robot.add(sidePanelR);

    // Bolts on the face (tiny circles at corners).
    const boltGeom = new THREE.CircleGeometry(0.025, 12);
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0x3A332C, metalness: 0.8, roughness: 0.3,
    });
    const boltOffsets = [
      { x: -FACE_PLATE_W / 2 + 0.06, y:  FACE_PLATE_H / 2 - 0.06 },
      { x:  FACE_PLATE_W / 2 - 0.06, y:  FACE_PLATE_H / 2 - 0.06 },
      { x: -FACE_PLATE_W / 2 + 0.06, y: -FACE_PLATE_H / 2 + 0.06 },
      { x:  FACE_PLATE_W / 2 - 0.06, y: -FACE_PLATE_H / 2 + 0.06 },
    ];
    boltOffsets.forEach(function makeBolt(p) {
      const m = new THREE.Mesh(boltGeom, boltMat);
      m.position.set(p.x, p.y, HEAD_D / 2 + FACE_PLATE_DEPTH_OFFSET + 0.002);
      robot.add(m);
    });

    // Eyes (white sphere) and pupils (dark sphere as child).
    const eyeGeom = new THREE.SphereGeometry(EYE_RADIUS, 24, 24);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: EYE_WHITE_HEX, metalness: 0.0, roughness: 0.55, emissive: 0x070605, emissiveIntensity: 0.15,
    });
    const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
    eyeL.position.set(-EYE_DISTANCE / 2, EYE_Y, EYE_Z);
    robot.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeom, eyeMat.clone());
    eyeR.position.set(EYE_DISTANCE / 2, EYE_Y, EYE_Z);
    robot.add(eyeR);

    const pupilGeom = new THREE.SphereGeometry(PUPIL_RADIUS, 18, 18);
    const pupilMat = new THREE.MeshStandardMaterial({
      color: EYE_PUPIL_HEX, metalness: 0.6, roughness: 0.2,
    });
    const pupilL = new THREE.Mesh(pupilGeom, pupilMat);
    pupilL.position.set(0, 0, EYE_RADIUS - PUPIL_RADIUS + 0.005);
    eyeL.add(pupilL);
    const pupilR = new THREE.Mesh(pupilGeom, pupilMat.clone());
    pupilR.position.set(0, 0, EYE_RADIUS - PUPIL_RADIUS + 0.005);
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
    robot.add(mouth);

    // Antenna (cylinder + emissive tip).
    const antennaGeom = new THREE.CylinderGeometry(ANTENNA_RADIUS, ANTENNA_RADIUS, ANTENNA_LEN, 8);
    const antennaMat = new THREE.MeshStandardMaterial({
      color: SHELL_DARK_HEX, metalness: 0.6, roughness: 0.35,
    });
    const antenna = new THREE.Mesh(antennaGeom, antennaMat);
    antenna.position.set(0, ANTENNA_BASE_Y + ANTENNA_LEN / 2, 0);
    robot.add(antenna);

    const antennaTipGeom = new THREE.SphereGeometry(ANTENNA_TIP_R, 16, 16);
    const antennaTipMat = new THREE.MeshStandardMaterial({
      color: accentColor.getHex(), emissive: accentColor.getHex(), emissiveIntensity: 1.4, metalness: 0.0, roughness: 0.3,
    });
    const antennaTip = new THREE.Mesh(antennaTipGeom, antennaTipMat);
    antennaTip.position.set(0, ANTENNA_BASE_Y + ANTENNA_LEN + ANTENNA_TIP_R * 0.5, 0);
    robot.add(antennaTip);

    // Cheek screen (right) — emissive plane mounted on the side.
    const cheekGeom = new THREE.PlaneGeometry(CHEEK_W, CHEEK_H);
    const cheekMat = new THREE.MeshBasicMaterial({
      color: accent2Color.getHex(), transparent: true, opacity: 0.9, side: THREE.DoubleSide,
    });
    const cheekScreen = new THREE.Mesh(cheekGeom, cheekMat);
    cheekScreen.position.set(CHEEK_X, CHEEK_Y, CHEEK_Z);
    cheekScreen.rotation.y = Math.PI / 2;
    robot.add(cheekScreen);

    // Cheek screen border (slightly larger plane behind).
    const cheekBorderGeom = new THREE.PlaneGeometry(CHEEK_W + 0.03, CHEEK_H + 0.025);
    const cheekBorderMat = new THREE.MeshStandardMaterial({
      color: 0x0F0D0B, metalness: 0.4, roughness: 0.6,
    });
    const cheekBorder = new THREE.Mesh(cheekBorderGeom, cheekBorderMat);
    cheekBorder.position.set(CHEEK_X - 0.001, CHEEK_Y, CHEEK_Z);
    cheekBorder.rotation.y = Math.PI / 2;
    robot.add(cheekBorder);

    // Temple LED (left).
    const templeGeom = new THREE.SphereGeometry(TEMPLE_LED_R, 12, 12);
    const templeMat = new THREE.MeshBasicMaterial({ color: accentColor.getHex() });
    const templeLED = new THREE.Mesh(templeGeom, templeMat);
    templeLED.position.set(TEMPLE_X, TEMPLE_Y, TEMPLE_Z);
    robot.add(templeLED);

    // Neck.
    const neckGeom = new THREE.CylinderGeometry(NECK_RADIUS, NECK_RADIUS, NECK_HEIGHT, 18);
    const neckMat = new THREE.MeshStandardMaterial({
      color: NECK_HEX, metalness: 0.7, roughness: 0.35,
    });
    const neck = new THREE.Mesh(neckGeom, neckMat);
    neck.position.set(0, NECK_Y, 0);
    robot.add(neck);

    // Neck-collar accent ring.
    const collarGeom = new THREE.TorusGeometry(NECK_RADIUS * 0.95, 0.018, 8, 32);
    const collarMat = new THREE.MeshBasicMaterial({ color: accentColor.getHex(), transparent: true, opacity: 0.7 });
    const collar = new THREE.Mesh(collarGeom, collarMat);
    collar.position.set(0, NECK_Y + NECK_HEIGHT / 2 - 0.02, 0);
    collar.rotation.x = Math.PI / 2;
    robot.add(collar);

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

    function cycleExpression() {
      const idx = EXPRESSION_CYCLE.indexOf(expressionCurrent);
      const next = EXPRESSION_CYCLE[(idx + 1) % EXPRESSION_CYCLE.length];
      expressionCurrent = next;
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
      const dtFactor = elapsed * 60 * motionMul; // normalize lerp speed
      const tSec = now * 0.001;

      // Head tilt follows mouse + slight idle bob (sin).
      const tiltY = mouseNDCx * HEAD_TILT_AMP_Y;
      const tiltX = HEAD_TILT_X_BASE - mouseNDCy * HEAD_TILT_AMP_X;
      robot.rotation.y = lerp(robot.rotation.y, tiltY, HEAD_TILT_LERP);
      robot.rotation.x = lerp(robot.rotation.x, tiltX, HEAD_TILT_LERP);
      robot.position.y = Math.sin(tSec * HEAD_BOB_FREQUENCY_HZ * 2 * Math.PI) * HEAD_BOB_AMPLITUDE * motionMul;

      // Pupil tracking with clamp inside socket.
      // pupil target = base look (from expression) + mouse delta (0..1 contribution)
      const target = EXPRESSION_TARGETS[expressionCurrent] || EXPRESSION_TARGETS.idle;
      const mouseInfluence = expressionCurrent === "sleeping" ? 0 : 0.7;
      const wantX = clamp(target.pupilLook.x + mouseNDCx * mouseInfluence, -1, 1);
      const wantY = clamp(target.pupilLook.y + mouseNDCy * mouseInfluence, -1, 1);
      pupilLookCurrent.x = lerp(pupilLookCurrent.x, wantX, PUPIL_LERP);
      pupilLookCurrent.y = lerp(pupilLookCurrent.y, wantY, PUPIL_LERP);
      pupilL.position.x = pupilLookCurrent.x * PUPIL_MAX_OFFSET;
      pupilL.position.y = pupilLookCurrent.y * PUPIL_MAX_OFFSET;
      pupilR.position.x = pupilLookCurrent.x * PUPIL_MAX_OFFSET;
      pupilR.position.y = pupilLookCurrent.y * PUPIL_MAX_OFFSET;

      // Eye blink — overrides scaleY for a brief window.
      let eyeYNow = lerp(eyeL.scale.y, target.eyeScaleY, 0.18);
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
          // smooth 1 → 0 → 1
          const closed = 1 - Math.abs(0.5 - t) * 2;     // peak at t=0.5
          eyeYNow = Math.max(0.05, eyeYNow * (1 - closed));
        }
      }
      eyeL.scale.set(1, eyeYNow, 1);
      eyeR.scale.set(1, eyeYNow, 1);

      // Mouth + antenna intensity + brow drift toward expression target.
      applyExpressionLerp(dtFactor);

      // Antenna pulse — driven by per-expression rate + accent emissive.
      const rate = ANTENNA_PULSE_RATE_BY_EXPRESSION[expressionCurrent] || 1.0;
      const pulse = 0.65 + 0.55 * (0.5 + 0.5 * Math.sin(tSec * rate * 2 * Math.PI));
      antennaTipMat.emissiveIntensity = pulse * antennaIntensityCurrent.value;
      antennaTipMat.color.setRGB(accentColor.r, accentColor.g, accentColor.b);
      antennaTipMat.emissive.setRGB(accentColor.r, accentColor.g, accentColor.b);

      // Temple LED blink (every ~1.6s, half-second on).
      const ledOn = (tSec * 0.625) % 1 < 0.35;
      templeMat.opacity = ledOn ? 1 : 0.25;
      templeMat.transparent = true;

      // Cheek screen color follows accent2.
      cheekMat.color.setRGB(accent2Color.r, accent2Color.g, accent2Color.b);
      collarMat.color.setRGB(accentColor.r, accentColor.g, accentColor.b);

      // Use brow tilt to bend mouth as a poor-mans expression boost.
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
        if (EXPRESSION_TARGETS[name]) {
          expressionCurrent = name;
          if (onExpressionChangeCb) {
            try { onExpressionChangeCb(name); } catch (cbErr) { /* eslint-disable-next-line no-console */ console.warn("[RobotHead] onExpressionChange threw:", cbErr); }
          }
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
        // Dispose all geometries and materials.
        const objects = [head, headEdges, facePlate, sidePanelL, sidePanelR,
          eyeL, eyeR, pupilL, pupilR, mouth, antenna, antennaTip,
          cheekScreen, cheekBorder, templeLED, neck, collar];
        objects.forEach(function disposeOne(obj) {
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
