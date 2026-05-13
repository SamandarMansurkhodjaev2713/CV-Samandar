// brain.js — Layered neural-network visualization for the hero canvas.
//
// Renders a fully-connected MLP (input → hidden₁ → hidden₂ → output) with
// weighted edges and animated pulses that travel forward through the layers,
// mimicking a single inference pass. Drag (mouse or touch) to rotate the
// network in 3D; tap any neuron to fire an extra propagation wave from it.
//
// Public API: window.Brain.create(canvas, opts) → controller
//   controller.setAccent(c1, c2?)
//   controller.setMotion(0..2)
//   controller.dispose()

(function () {
  "use strict";

  const THREE = window.THREE;

  // ── Topology ────────────────────────────────────────────────────────────
  const LAYER_SIZES = [7, 11, 9, 5];             // visual MLP shape
  const LAYER_GAP_X = 1.55;                       // horizontal distance between layers
  const NEURON_GAP_Y = 0.36;                      // vertical spacing within a layer
  const NEURON_BASE_OPACITY = 0.55;
  const NEURON_ACTIVE_OPACITY = 1.0;
  const NEURON_BASE_RADIUS = 0.075;
  const NEURON_ACTIVE_SCALE = 1.8;
  const NEURON_HIT_RADIUS = 0.18;                 // hit-test radius for tap-to-fire

  // ── Edge styling ───────────────────────────────────────────────────────
  const EDGE_OPACITY = 0.22;
  const EDGE_ACTIVE_OPACITY = 0.95;

  // ── Pulse / propagation ────────────────────────────────────────────────
  const PULSE_PER_EDGE_FIRE = 1;                  // how many pulses per edge per fire
  const PULSE_SPEED = 1.6;                        // t-progress per second
  const PULSE_BASE_COUNT = 8;                     // ambient drifters between waves
  const AUTO_FIRE_INTERVAL_MIN = 1400;            // ms between auto-fires (min)
  const AUTO_FIRE_INTERVAL_MAX = 2800;            // ms between auto-fires (max)
  const ACTIVATION_DECAY = 2.0;                   // per-second decay of neuron activation
  const POOL_MAX_PULSES = 240;                    // upper bound to keep frame budget sane

  // ── Camera / interaction ───────────────────────────────────────────────
  const CAMERA_FOV = 38;
  const CAMERA_Z = 7.2;
  const ROTATION_DAMPING = 0.08;
  const ROTATION_X_BASE = 0.06;
  const POINTER_X_RANGE = 0.6;
  const POINTER_Y_RANGE = 0.4;

  function noOpController() {
    return {
      setAccent() {},
      setMotion() {},
      dispose() {},
    };
  }

  function create(canvas, opts) {
    const options = opts || {};
    if (!THREE || !canvas) return noOpController();

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[Brain] WebGL unavailable:", err.message);
      return noOpController();
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 60);
    camera.position.set(0, 0, CAMERA_Z);

    let accent = new THREE.Color(options.accent || "#D97757");
    let accent2 = new THREE.Color(options.accent2 || "#C89B5E");
    let motion = typeof options.motion === "number" ? options.motion : 1;

    // ── Build neuron + edge graph ─────────────────────────────────────────
    const totalLayers = LAYER_SIZES.length;
    const totalWidth = (totalLayers - 1) * LAYER_GAP_X;

    /** @type {Array<{x:number,y:number,z:number,layer:number,idxInLayer:number,activation:number}>} */
    const neurons = [];
    const layerStart = [0];
    for (let l = 0; l < totalLayers; l++) {
      const size = LAYER_SIZES[l];
      const x = -totalWidth / 2 + l * LAYER_GAP_X;
      const layerHeight = (size - 1) * NEURON_GAP_Y;
      for (let i = 0; i < size; i++) {
        const y = -layerHeight / 2 + i * NEURON_GAP_Y;
        neurons.push({ x: x, y: y, z: 0, layer: l, idxInLayer: i, activation: 0 });
      }
      if (l < totalLayers - 1) layerStart.push(layerStart[l] + size);
    }

    /** @type {Array<{from:number,to:number,weight:number,active:number}>} */
    const edges = [];
    for (let l = 0; l < totalLayers - 1; l++) {
      const fromSize = LAYER_SIZES[l];
      const toSize = LAYER_SIZES[l + 1];
      for (let i = 0; i < fromSize; i++) {
        for (let j = 0; j < toSize; j++) {
          edges.push({
            from: layerStart[l] + i,
            to: layerStart[l + 1] + j,
            weight: 0.25 + Math.random() * 0.75,
            active: 0,
          });
        }
      }
    }

    // ── Edge line segments (vertex-colored, two verts per edge) ──────────
    const edgePositions = new Float32Array(edges.length * 6);
    const edgeColors = new Float32Array(edges.length * 6);
    edges.forEach(function fillEdgeBuffers(edge, i) {
      const f = neurons[edge.from];
      const t = neurons[edge.to];
      const off = i * 6;
      edgePositions[off + 0] = f.x; edgePositions[off + 1] = f.y; edgePositions[off + 2] = f.z;
      edgePositions[off + 3] = t.x; edgePositions[off + 4] = t.y; edgePositions[off + 5] = t.z;
    });

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
    edgeGeometry.setAttribute("color", new THREE.BufferAttribute(edgeColors, 3));
    const edgeMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const edgeLines = new THREE.LineSegments(edgeGeometry, edgeMaterial);

    // ── Neurons via InstancedMesh ────────────────────────────────────────
    const neuronGeometry = new THREE.SphereGeometry(NEURON_BASE_RADIUS, 16, 16);
    const neuronMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });
    const neuronMesh = new THREE.InstancedMesh(neuronGeometry, neuronMaterial, neurons.length);
    neuronMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const neuronColors = new Float32Array(neurons.length * 3);
    neuronMesh.instanceColor = new THREE.InstancedBufferAttribute(neuronColors, 3);

    const tmpMatrix = new THREE.Matrix4();
    const tmpScale = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpPos = new THREE.Vector3();
    const tmpColor = new THREE.Color();

    function refreshNeurons() {
      neurons.forEach(function updateNeuronInstance(n, i) {
        const s = 1 + n.activation * (NEURON_ACTIVE_SCALE - 1);
        tmpScale.set(s, s, s);
        tmpPos.set(n.x, n.y, n.z);
        tmpQuat.identity();
        tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
        neuronMesh.setMatrixAt(i, tmpMatrix);
        // Mix idle color → accent based on activation, then write to instance colors.
        tmpColor.set(0xF5F0E6).lerp(accent, n.activation);
        neuronColors[i * 3 + 0] = tmpColor.r;
        neuronColors[i * 3 + 1] = tmpColor.g;
        neuronColors[i * 3 + 2] = tmpColor.b;
      });
      neuronMesh.instanceMatrix.needsUpdate = true;
      neuronMesh.instanceColor.needsUpdate = true;
    }

    // ── Pulse pool (data flowing along edges) ────────────────────────────
    /**
     * Each pulse rides one edge: position is lerp(from, to, t). When t >= 1,
     * the target neuron activates and we either spawn child pulses on its
     * outgoing edges (propagation) or return the pulse to the pool.
     * @type {Array<{edgeIdx:number,t:number,speed:number,active:boolean,propagate:boolean}>}
     */
    const pulsePool = [];
    for (let i = 0; i < POOL_MAX_PULSES; i++) {
      pulsePool.push({ edgeIdx: 0, t: 0, speed: 1, active: false, propagate: false });
    }
    let activePulseCount = 0;

    const pulsePositions = new Float32Array(POOL_MAX_PULSES * 3);
    const pulseAlpha = new Float32Array(POOL_MAX_PULSES);
    const pulseGeometry = new THREE.BufferGeometry();
    pulseGeometry.setAttribute("position", new THREE.BufferAttribute(pulsePositions, 3));
    pulseGeometry.setAttribute("alpha", new THREE.BufferAttribute(pulseAlpha, 1));
    pulseGeometry.setDrawRange(0, 0);

    const pulseMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Vector3(accent.r, accent.g, accent.b) },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: [
        "attribute float alpha;",
        "uniform float uPixelRatio;",
        "varying float vAlpha;",
        "void main() {",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  gl_PointSize = 14.0 * uPixelRatio / -mv.z;",
        "  gl_Position = projectionMatrix * mv;",
        "  vAlpha = alpha;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "precision mediump float;",
        "uniform vec3 uColor;",
        "varying float vAlpha;",
        "void main() {",
        "  vec2 uv = gl_PointCoord - 0.5;",
        "  float d = length(uv);",
        "  if (d > 0.5) discard;",
        "  float core = smoothstep(0.5, 0.0, d);",
        "  gl_FragColor = vec4(uColor, core * vAlpha);",
        "}",
      ].join("\n"),
    });

    const pulseMesh = new THREE.Points(pulseGeometry, pulseMaterial);

    // ── Compose scene group ──────────────────────────────────────────────
    const group = new THREE.Group();
    group.add(edgeLines);
    group.add(neuronMesh);
    group.add(pulseMesh);
    scene.add(group);

    // ── Pulse spawning ───────────────────────────────────────────────────
    /**
     * Acquire a slot from the pulse pool. Returns null if the pool is full,
     * which is fine: visually a few dropped pulses are imperceptible and the
     * cap keeps the frame budget bounded.
     */
    function acquirePulse() {
      for (let i = 0; i < pulsePool.length; i++) {
        if (!pulsePool[i].active) return pulsePool[i];
      }
      return null;
    }

    function spawnOnEdge(edgeIdx, propagate, initialT) {
      const p = acquirePulse();
      if (!p) return;
      p.edgeIdx = edgeIdx;
      p.t = initialT || 0;
      p.speed = PULSE_SPEED * (0.7 + Math.random() * 0.6);
      p.active = true;
      p.propagate = propagate;
      activePulseCount++;
      edges[edgeIdx].active = 1;
    }

    /** Fire all outgoing edges of a single neuron — one ripple step. */
    function fireNeuron(neuronIdx, propagate) {
      const n = neurons[neuronIdx];
      n.activation = 1;
      for (let i = 0; i < edges.length; i++) {
        if (edges[i].from === neuronIdx) {
          for (let k = 0; k < PULSE_PER_EDGE_FIRE; k++) {
            spawnOnEdge(i, propagate, -Math.random() * 0.12); // tiny stagger
          }
        }
      }
    }

    /** Fire the entire input layer — used by auto-fire timer. */
    function fireForwardPass() {
      const inputSize = LAYER_SIZES[0];
      for (let i = 0; i < inputSize; i++) {
        // Stagger to avoid simultaneous spawn spike.
        const idx = i;
        setTimeout(function delayedNeuronFire() {
          fireNeuron(idx, true);
        }, i * 70);
      }
    }

    // Seed a few ambient pulses so the network is never fully idle.
    for (let i = 0; i < PULSE_BASE_COUNT; i++) {
      spawnOnEdge((Math.random() * edges.length) | 0, false, Math.random());
    }

    let autoFireTimer = 0;
    function scheduleAutoFire() {
      const wait = AUTO_FIRE_INTERVAL_MIN + Math.random() * (AUTO_FIRE_INTERVAL_MAX - AUTO_FIRE_INTERVAL_MIN);
      autoFireTimer = window.setTimeout(function autoFireTick() {
        fireForwardPass();
        scheduleAutoFire();
      }, wait);
    }
    scheduleAutoFire();

    // ── Interaction: drag-to-rotate + click-to-fire ──────────────────────
    const targetRotation = { x: ROTATION_X_BASE, y: 0 };
    const currentRotation = { x: ROTATION_X_BASE, y: 0 };
    let dragging = false;
    let dragStart = { x: 0, y: 0 };
    let dragStartRot = { x: 0, y: 0 };
    let pointerDownAt = 0;
    let pointerDownPos = { x: 0, y: 0 };

    function clientFromEvent(e) {
      if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e) {
      dragging = true;
      pointerDownAt = performance.now();
      const c = clientFromEvent(e);
      pointerDownPos = c;
      dragStart = c;
      dragStartRot = { x: currentRotation.x, y: currentRotation.y };
    }

    function onPointerMove(e) {
      // Free-look hover (no drag): subtle parallax follow.
      if (!dragging) {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const c = clientFromEvent(e);
        const nx = ((c.x - r.left) / r.width) * 2 - 1;
        const ny = -((c.y - r.top) / r.height) * 2 + 1;
        targetRotation.y = nx * POINTER_X_RANGE;
        targetRotation.x = ROTATION_X_BASE + ny * -POINTER_Y_RANGE;
        return;
      }
      const c = clientFromEvent(e);
      const dx = c.x - dragStart.x;
      const dy = c.y - dragStart.y;
      targetRotation.y = dragStartRot.y + dx * 0.008;
      targetRotation.x = dragStartRot.x + dy * 0.006;
    }

    function tryFireNearestNeuron(clientX, clientY) {
      // Convert click to world coordinates on the z=0 plane the network lives in.
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const ndc = new THREE.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        -((clientY - r.top) / r.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, camera);
      // Find closest neuron by projecting each neuron's world position to ray.
      const worldPos = new THREE.Vector3();
      let best = { idx: -1, dist: NEURON_HIT_RADIUS };
      for (let i = 0; i < neurons.length; i++) {
        const n = neurons[i];
        worldPos.set(n.x, n.y, n.z).applyMatrix4(group.matrixWorld);
        const dist = raycaster.ray.distanceToPoint(worldPos);
        if (dist < best.dist) best = { idx: i, dist: dist };
      }
      if (best.idx >= 0) fireNeuron(best.idx, true);
    }

    function onPointerUp(e) {
      const wasQuick = performance.now() - pointerDownAt < 220;
      const c = clientFromEvent(e);
      const dx = Math.abs(c.x - pointerDownPos.x);
      const dy = Math.abs(c.y - pointerDownPos.y);
      const wasTap = dx < 5 && dy < 5;
      if (dragging && wasQuick && wasTap) tryFireNearestNeuron(c.x, c.y);
      dragging = false;
    }

    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("mousemove", onPointerMove, { passive: true });
    canvas.addEventListener("touchmove", function (e) {
      if (dragging) e.preventDefault();
      onPointerMove(e);
    }, { passive: false });
    window.addEventListener("mouseup", onPointerUp);
    window.addEventListener("touchend", onPointerUp);
    window.addEventListener("touchcancel", onPointerUp);

    // ── Resize ────────────────────────────────────────────────────────────
    function resize() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(2, r.width);
      const h = Math.max(2, r.height);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      pulseMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    }
    const resizeObserver = ("ResizeObserver" in window) ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(canvas);
    else window.addEventListener("resize", resize);
    resize();

    // ── Animation loop ────────────────────────────────────────────────────
    let rafHandle = 0;
    let lastFrame = performance.now();
    let isVisible = !document.hidden;

    function onVisibilityChange() {
      isVisible = !document.hidden;
      lastFrame = performance.now();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    function tick(now) {
      rafHandle = requestAnimationFrame(tick);
      if (!isVisible) return;

      const dt = Math.min(0.05, (now - lastFrame) / 1000) * motion;
      lastFrame = now;

      // Smooth-follow rotation toward target.
      currentRotation.x += (targetRotation.x - currentRotation.x) * ROTATION_DAMPING;
      currentRotation.y += (targetRotation.y - currentRotation.y) * ROTATION_DAMPING;
      group.rotation.x = currentRotation.x;
      group.rotation.y = currentRotation.y + now * 0.00006 * motion;

      // Decay activations.
      for (let i = 0; i < neurons.length; i++) {
        if (neurons[i].activation > 0) {
          neurons[i].activation = Math.max(0, neurons[i].activation - ACTIVATION_DECAY * dt);
        }
      }

      // Advance pulses, write positions.
      let writeIndex = 0;
      const edgeActiveFade = Math.max(0, 1 - dt * 1.8);
      for (let i = 0; i < edges.length; i++) edges[i].active *= edgeActiveFade;

      for (let i = 0; i < pulsePool.length; i++) {
        const p = pulsePool[i];
        if (!p.active) continue;
        p.t += p.speed * dt;
        if (p.t >= 1) {
          const finishedEdge = edges[p.edgeIdx];
          // Light the target neuron and optionally propagate forward.
          fireNeuron(finishedEdge.to, p.propagate);
          if (!p.propagate) {
            // ambient pulse — recycle on a random edge in same layer pair
            p.edgeIdx = (Math.random() * edges.length) | 0;
            p.t = 0;
          } else {
            p.active = false;
            activePulseCount = Math.max(0, activePulseCount - 1);
            continue;
          }
        }
        // Position along edge.
        const e = edges[p.edgeIdx];
        const f = neurons[e.from];
        const t = neurons[e.to];
        const tt = Math.max(0, p.t);
        pulsePositions[writeIndex * 3 + 0] = f.x + (t.x - f.x) * tt;
        pulsePositions[writeIndex * 3 + 1] = f.y + (t.y - f.y) * tt;
        pulsePositions[writeIndex * 3 + 2] = f.z + (t.z - f.z) * tt;
        pulseAlpha[writeIndex] = Math.min(1, tt * 4) * Math.min(1, (1 - tt) * 4 + 0.3);
        e.active = 1;
        writeIndex++;
      }
      pulseGeometry.attributes.position.needsUpdate = true;
      pulseGeometry.attributes.alpha.needsUpdate = true;
      pulseGeometry.setDrawRange(0, writeIndex);

      // Update edge colors per-frame: base + activation glow.
      for (let i = 0; i < edges.length; i++) {
        const e = edges[i];
        const intensity = EDGE_OPACITY * e.weight + (EDGE_ACTIVE_OPACITY - EDGE_OPACITY) * e.active;
        edgeColors[i * 6 + 0] = accent.r * intensity;
        edgeColors[i * 6 + 1] = accent.g * intensity;
        edgeColors[i * 6 + 2] = accent.b * intensity;
        edgeColors[i * 6 + 3] = accent.r * intensity;
        edgeColors[i * 6 + 4] = accent.g * intensity;
        edgeColors[i * 6 + 5] = accent.b * intensity;
      }
      edgeGeometry.attributes.color.needsUpdate = true;

      // Update neuron instance matrices + colors.
      refreshNeurons();

      renderer.render(scene, camera);
    }
    rafHandle = requestAnimationFrame(tick);

    return {
      setAccent(hex1, hex2) {
        accent.set(hex1 || "#D97757");
        accent2.set(hex2 || hex1 || "#C89B5E");
        pulseMaterial.uniforms.uColor.value.set(accent.r, accent.g, accent.b);
      },
      setMotion(m) {
        motion = Math.max(0, Math.min(2, m));
      },
      dispose() {
        cancelAnimationFrame(rafHandle);
        if (autoFireTimer) window.clearTimeout(autoFireTimer);
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        canvas.removeEventListener("mousedown", onPointerDown);
        canvas.removeEventListener("touchstart", onPointerDown);
        window.removeEventListener("mousemove", onPointerMove);
        canvas.removeEventListener("touchmove", onPointerMove);
        window.removeEventListener("mouseup", onPointerUp);
        window.removeEventListener("touchend", onPointerUp);
        window.removeEventListener("touchcancel", onPointerUp);
        edgeGeometry.dispose();
        edgeMaterial.dispose();
        neuronGeometry.dispose();
        neuronMaterial.dispose();
        pulseGeometry.dispose();
        pulseMaterial.dispose();
        renderer.dispose();
      },
    };
  }

  window.Brain = { create: create };
})();
