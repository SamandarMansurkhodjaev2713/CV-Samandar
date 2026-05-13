// ai-core.js — Interactive Three.js Code Cube
// Centerpiece: a draggable, clickable rotating glass cube with code-faces and inner neural particle lattice.
// Exposes window.AICore.create(canvasEl, opts) → { setSection, setPalette, setVariant, setMotion, setScroll, dispose }

(function () {
  "use strict";
  const THREE = window.THREE;

  // Face → section mapping (clickable face navigates to section)
  const FACES = [
    { i: 0, axis: "+x", section: "projects", label: "WORK",    code: ["fn ship() {",  "  build()", "  test()", "  deploy()", "}"] },
    { i: 1, axis: "-x", section: "skills",   label: "STACK",   code: ["import {",    "  React, TS,", "  AI, Bots", "} from /me"] },
    { i: 2, axis: "+y", section: "about",    label: "/ABOUT",  code: ["// engineer", "// who ships", "const me = {", "  full: true", "}"] },
    { i: 3, axis: "-y", section: "services", label: "/HIRE",   code: ["POST /hire", "200 OK", "build {", "  app, bot", "}"] },
    { i: 4, axis: "+z", section: "contact",  label: "DEPLOY",  code: ["$ deploy", "› compile", "› upload", "› live ✓"] },
    { i: 5, axis: "-z", section: "cv",       label: "GIT.LOG", code: ["* main",   "│ feat:",     "│ fix:",   "│ chore:", "│ init"] },
  ];

  // Section → cube preset
  const SECTION_PRESETS = {
    hero:      { scale: 1.0, autoRot: 0.0008, lattice: 1.0, explode: 0.0,  camZ: 4.6, focus: -1 },
    signal:    { scale: 0.95, autoRot: 0.0010, lattice: 1.1, explode: 0.05, camZ: 4.8, focus: -1 },
    about:     { scale: 0.85, autoRot: 0.0006, lattice: 0.9, explode: 0.15, camZ: 5.2, focus:  2 },
    projects:  { scale: 0.80, autoRot: 0.0008, lattice: 0.75,explode: 0.3,  camZ: 5.4, focus:  0 },
    skills:    { scale: 0.85, autoRot: 0.0014, lattice: 1.2, explode: 0.1,  camZ: 5.0, focus:  1 },
    services:  { scale: 0.80, autoRot: 0.0008, lattice: 1.0, explode: 0.2,  camZ: 5.4, focus:  3 },
    cv:        { scale: 0.70, autoRot: 0.0005, lattice: 0.6, explode: 0.4,  camZ: 5.8, focus:  5 },
    process:   { scale: 0.80, autoRot: 0.0010, lattice: 1.0, explode: 0.25, camZ: 5.4, focus: -1 },
    trust:     { scale: 0.75, autoRot: 0.0008, lattice: 0.9, explode: 0.18, camZ: 5.4, focus: -1 },
    aichat:    { scale: 0.90, autoRot: 0.0012, lattice: 1.4, explode: 0.05, camZ: 5.0, focus: -1 },
    contact:   { scale: 1.0,  autoRot: 0.0014, lattice: 1.3, explode: 0.0,  camZ: 4.5, focus:  4 },
  };

  // Variants for the inner lattice
  const VARIANTS = {
    crystal: { particles: 1600, lineDensity: 1.0 },
    nebula:  { particles: 2400, lineDensity: 0.6 },
    grid:    { particles: 1200, lineDensity: 1.4 },
  };

  function hexToRgb(hex) {
    const h = (hex || "#B8FF3D").replace("#", "");
    const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(v, 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
  }

  // Generate inner lattice particles
  function genLattice(count, spread) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // mix of cube-interior + slightly outside particles
      const inside = Math.random() > 0.25;
      let x, y, z;
      if (inside) {
        x = (Math.random() - 0.5) * 1.4 * spread;
        y = (Math.random() - 0.5) * 1.4 * spread;
        z = (Math.random() - 0.5) * 1.4 * spread;
      } else {
        const r = 1.0 + Math.random() * 0.9 * spread;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(p) * Math.cos(t);
        y = r * Math.sin(p) * Math.sin(t);
        z = r * Math.cos(p);
      }
      positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = z;
      sizes[i] = 1.2 + Math.random() * 2.4;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, sizes, phases };
  }

  // Build short K-NN line segments
  function genLines(positions, count, density) {
    const max = Math.floor(160 * density);
    const out = [];
    const stride = Math.max(1, Math.floor(count / 200));
    const pts = [];
    for (let i = 0; i < count; i += stride) {
      pts.push([positions[i*3], positions[i*3+1], positions[i*3+2]]);
    }
    for (let i = 0; i < pts.length && out.length / 6 < max; i++) {
      let best = Infinity, bj = -1;
      for (let j = 0; j < pts.length; j++) {
        if (i === j) continue;
        const dx = pts[i][0]-pts[j][0], dy = pts[i][1]-pts[j][1], dz = pts[i][2]-pts[j][2];
        const d = dx*dx + dy*dy + dz*dz;
        if (d < best && d > 0.01) { best = d; bj = j; }
      }
      if (bj !== -1 && best < 0.35) out.push(pts[i][0],pts[i][1],pts[i][2],pts[bj][0],pts[bj][1],pts[bj][2]);
    }
    return new Float32Array(out);
  }

  // Generate code texture for a face
  function makeFaceTexture(face, accent, accent2) {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    // bg
    const g = ctx.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, "rgba(10,14,18,0.92)");
    g.addColorStop(1, "rgba(20,28,36,0.88)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    // border accent
    ctx.strokeStyle = `rgba(${accent.r*255|0},${accent.g*255|0},${accent.b*255|0},0.85)`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 506, 506);
    // corner crosses
    ctx.lineWidth = 3;
    [[24,24],[488,24],[24,488],[488,488]].forEach(([x,y]) => {
      ctx.beginPath();
      ctx.moveTo(x-14, y); ctx.lineTo(x+14, y);
      ctx.moveTo(x, y-14); ctx.lineTo(x, y+14);
      ctx.stroke();
    });
    // label
    ctx.fillStyle = `rgba(${accent.r*255|0},${accent.g*255|0},${accent.b*255|0},1)`;
    ctx.font = "bold 28px JetBrains Mono, monospace";
    ctx.fillText(face.label, 40, 70);
    // face index
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "16px JetBrains Mono, monospace";
    ctx.fillText(`face/${String(face.i).padStart(2,"0")}`, 40, 96);
    ctx.fillText(`→ ${face.section}`, 360, 96);
    // code block
    ctx.font = "20px JetBrains Mono, monospace";
    face.code.forEach((line, idx) => {
      ctx.fillStyle = `rgba(${accent2.r*255|0},${accent2.g*255|0},${accent2.b*255|0},0.85)`;
      ctx.fillText(`${String(idx+1).padStart(2,"0")}`, 40, 170 + idx * 36);
      ctx.fillStyle = "rgba(244,241,234,0.85)";
      ctx.fillText(line, 84, 170 + idx * 36);
    });
    // bottom status bar
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.moveTo(40, 440); ctx.lineTo(472, 440); ctx.stroke();
    ctx.fillStyle = `rgba(${accent.r*255|0},${accent.g*255|0},${accent.b*255|0},1)`;
    ctx.font = "14px JetBrains Mono, monospace";
    ctx.fillText(`> active · click to open`, 40, 472);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(`#${(0xa0 + face.i).toString(16)}`, 420, 472);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function create(canvas, opts) {
    opts = opts || {};
    if (!THREE) return fallback(canvas);

    const state = {
      section: opts.section || "hero",
      variant: opts.variant || "crystal",
      accent: opts.accent || "#B8FF3D",
      accent2: opts.accent2 || "#4DEBFF",
      motion: opts.motion ?? 1,
      onFaceClick: opts.onFaceClick || (() => {}),
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      pointer: { x: 0, y: 0, tx: 0, ty: 0, down: false, startX: 0, startY: 0, dragX: 0, dragY: 0 },
      rotX: -0.15, rotY: 0.6, velX: 0, velY: 0,
      scrollY: 0, time: 0, hovered: -1, focused: -1,
      sectionT: 1, currentPreset: SECTION_PRESETS.hero,
      targetPreset: SECTION_PRESETS.hero,
    };

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 4.6);

    const group = new THREE.Group();
    scene.add(group);

    const accentRgb = hexToRgb(state.accent);
    const accent2Rgb = hexToRgb(state.accent2);

    // ── CUBE FACES (6 separate planes for independent transforms / click detection)
    const faceGroup = new THREE.Group();
    const faceMeshes = [];
    const SIZE = 1.4;
    const HALF = SIZE / 2;
    function buildFaces() {
      faceMeshes.forEach(m => { m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); faceGroup.remove(m); });
      faceMeshes.length = 0;
      const ar = hexToRgb(state.accent), ar2 = hexToRgb(state.accent2);
      FACES.forEach(face => {
        const tex = makeFaceTexture(face, ar, ar2);
        const geo = new THREE.PlaneGeometry(SIZE, SIZE);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        // place face on cube surface, oriented outward
        switch (face.axis) {
          case "+x": m.position.set( HALF, 0, 0); m.rotation.y =  Math.PI / 2; break;
          case "-x": m.position.set(-HALF, 0, 0); m.rotation.y = -Math.PI / 2; break;
          case "+y": m.position.set(0,  HALF, 0); m.rotation.x = -Math.PI / 2; break;
          case "-y": m.position.set(0, -HALF, 0); m.rotation.x =  Math.PI / 2; break;
          case "+z": m.position.set(0, 0,  HALF); break;
          case "-z": m.position.set(0, 0, -HALF); m.rotation.y = Math.PI; break;
        }
        m.userData = { face, baseScale: 1 };
        faceMeshes.push(m);
        faceGroup.add(m);
      });
    }
    buildFaces();
    group.add(faceGroup);

    // ── CUBE EDGES (wireframe outline)
    const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE, SIZE, SIZE));
    const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(accentRgb.r, accentRgb.g, accentRgb.b), transparent: true, opacity: 0.7 });
    const edges = new THREE.LineSegments(edgeGeo, edgeMat);
    group.add(edges);

    // ── INNER LATTICE
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uColor: { value: new THREE.Color(accentRgb.r, accentRgb.g, accentRgb.b) },
        uColor2: { value: new THREE.Color(accent2Rgb.r, accent2Rgb.g, accent2Rgb.b) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          float t = uTime + aPhase;
          p.x += sin(t * 0.6) * 0.04;
          p.y += cos(t * 0.7) * 0.04;
          p.z += sin(t * 0.5) * 0.03;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uPixelRatio * (180.0 / -mv.z);
          vAlpha = 0.5 + 0.5 * sin(t * 1.8);
        }
      `,
      fragmentShader: `
        precision mediump float;
        uniform vec3 uColor;
        uniform vec3 uColor2;
        varying float vAlpha;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          vec3 c = mix(uColor2, uColor, core);
          gl_FragColor = vec4(c, core * vAlpha * 0.85);
        }
      `,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(accentRgb.r, accentRgb.g, accentRgb.b),
      transparent: true, opacity: 0.16, depthWrite: false,
    });

    let particles = null, lines = null;
    function buildLattice() {
      if (particles) { group.remove(particles); particles.geometry.dispose(); }
      if (lines)     { group.remove(lines);     lines.geometry.dispose(); }
      const v = VARIANTS[state.variant] || VARIANTS.crystal;
      const data = genLattice(v.particles, state.currentPreset.lattice);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
      geo.setAttribute("aSize", new THREE.BufferAttribute(data.sizes, 1));
      geo.setAttribute("aPhase", new THREE.BufferAttribute(data.phases, 1));
      particles = new THREE.Points(geo, particleMaterial);
      group.add(particles);
      const ld = genLines(data.positions, v.particles, v.lineDensity);
      const lgeo = new THREE.BufferGeometry();
      lgeo.setAttribute("position", new THREE.BufferAttribute(ld, 3));
      lines = new THREE.LineSegments(lgeo, lineMaterial);
      group.add(lines);
    }
    buildLattice();

    // ── ORBITAL RING (single, big)
    const ringPts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(Math.cos(a) * 1.8, 0, Math.sin(a) * 1.8));
    }
    const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
    const ringMat = new THREE.LineBasicMaterial({ color: new THREE.Color(accentRgb.r, accentRgb.g, accentRgb.b), transparent: true, opacity: 0.12 });
    const ring = new THREE.Line(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2 - 0.2;
    scene.add(ring);

    // ── RAYCASTING
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    // ── INPUT (use window/document since canvas has pointer-events: none)
    function getCanvasNDC(e) {
      const r = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    }
    function onMove(e) {
      getCanvasNDC(e);
      const r = canvas.getBoundingClientRect();
      state.pointer.x = (e.clientX - r.left) / r.width - 0.5;
      state.pointer.y = (e.clientY - r.top) / r.height - 0.5;

      if (state.pointer.down) {
        const dx = e.clientX - state.pointer.startX;
        const dy = e.clientY - state.pointer.startY;
        state.pointer.dragX = dx;
        state.pointer.dragY = dy;
        state.velY = dx * 0.005;
        state.velX = dy * 0.005;
        state.rotY += dx * 0.008;
        state.rotX += dy * 0.008;
        state.pointer.startX = e.clientX;
        state.pointer.startY = e.clientY;
      } else {
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(faceMeshes, false);
        const inHero = e.clientY < window.innerHeight * 1.2;
        if (hits.length && inHero) {
          const f = hits[0].object.userData.face.i;
          if (state.hovered !== f) {
            state.hovered = f;
            canvas.dispatchEvent(new CustomEvent("face-hover", { detail: { face: hits[0].object.userData.face } }));
          }
        } else if (state.hovered !== -1) {
          state.hovered = -1;
          canvas.dispatchEvent(new CustomEvent("face-hover", { detail: { face: null } }));
        }
      }
    }
    function onDown(e) {
      // Only start drag if click is in hero region (top portion of page)
      if (e.clientY > window.innerHeight * 1.2) return;
      state.pointer.down = true;
      state.pointer.startX = e.clientX; state.pointer.startY = e.clientY;
      state.pointer.dragX = 0; state.pointer.dragY = 0;
    }
    function onUp(e) {
      if (!state.pointer.down) return;
      const wasDrag = Math.abs(state.pointer.dragX) + Math.abs(state.pointer.dragY) > 6;
      state.pointer.down = false;
      if (!wasDrag) {
        getCanvasNDC(e);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(faceMeshes, false);
        if (hits.length) {
          const face = hits[0].object.userData.face;
          state.onFaceClick(face);
        }
      }
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    // Touch passive prevent — touch-action: none on canvas

    // ── LOOP
    let raf = 0, lastT = performance.now();
    function lerp(a, b, t) { return a + (b - a) * t; }
    function animate(now) {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      state.time += dt * 2 * state.motion;

      // smoothly migrate to target preset
      const p = state.currentPreset;
      const tp = state.targetPreset;
      state.sectionT = Math.min(1, state.sectionT + dt * 1.2);
      const k = 1 - Math.pow(1 - state.sectionT, 3);
      const cur = {
        scale: lerp(p.scale, tp.scale, k),
        autoRot: lerp(p.autoRot, tp.autoRot, k),
        explode: lerp(p.explode, tp.explode, k),
        camZ: lerp(p.camZ, tp.camZ, k),
      };

      if (!state.pointer.down) {
        state.rotY += cur.autoRot * 60 * dt * state.motion;
        // friction on inertia
        state.velX *= 0.92; state.velY *= 0.92;
        state.rotX += state.velX * 0.3;
        state.rotY += state.velY * 0.3;
      }
      // clamp X rotation
      state.rotX = Math.max(-1.2, Math.min(1.2, state.rotX));

      // damped pointer parallax
      state.pointer.tx += (state.pointer.x - state.pointer.tx) * 0.06;
      state.pointer.ty += (state.pointer.y - state.pointer.ty) * 0.06;

      group.rotation.x = state.rotX + state.pointer.ty * 0.1 + state.scrollY * 0.6;
      group.rotation.y = state.rotY + state.pointer.tx * 0.1;
      group.scale.setScalar(cur.scale);

      // explode faces outward
      faceMeshes.forEach((m, i) => {
        const f = m.userData.face;
        const dir = new THREE.Vector3(
          f.axis === "+x" ? 1 : f.axis === "-x" ? -1 : 0,
          f.axis === "+y" ? 1 : f.axis === "-y" ? -1 : 0,
          f.axis === "+z" ? 1 : f.axis === "-z" ? -1 : 0,
        );
        const baseOffset = HALF;
        const explodeOff = cur.explode * 0.8;
        const hoverBoost = (state.hovered === i) ? 0.18 : 0;
        const focusBoost = (tp.focus === i) ? 0.14 : 0;
        const totalOff = baseOffset + explodeOff + hoverBoost + focusBoost;
        m.position.copy(dir).multiplyScalar(totalOff);
        const s = 1 + (state.hovered === i ? 0.06 : 0) + (tp.focus === i ? 0.05 : 0);
        m.scale.setScalar(s);
        m.material.opacity = 0.85 + (state.hovered === i ? 0.15 : 0);
      });

      // edges color pulse on hover
      if (state.hovered !== -1) {
        edgeMat.opacity = 0.95;
      } else {
        edgeMat.opacity = 0.55 + Math.sin(state.time) * 0.15;
      }

      ring.rotation.z += 0.001 * state.motion;
      ring.rotation.y += 0.0006 * state.motion;

      particleMaterial.uniforms.uTime.value = state.time;
      camera.position.z += (cur.camZ - camera.position.z) * 0.05;

      renderer.render(scene, camera);
    }
    if (!state.reduced) raf = requestAnimationFrame(animate);
    else renderer.render(scene, camera);

    function applyAccent(hex, hex2) {
      if (hex) {
        state.accent = hex;
        const c = hexToRgb(hex);
        particleMaterial.uniforms.uColor.value.setRGB(c.r, c.g, c.b);
        lineMaterial.color.setRGB(c.r, c.g, c.b);
        edgeMat.color.setRGB(c.r, c.g, c.b);
        ringMat.color.setRGB(c.r, c.g, c.b);
      }
      if (hex2) {
        state.accent2 = hex2;
        const c2 = hexToRgb(hex2);
        particleMaterial.uniforms.uColor2.value.setRGB(c2.r, c2.g, c2.b);
      }
      buildFaces(); // rebuild textures with new colors
    }

    return {
      setSection(name) {
        if (!SECTION_PRESETS[name]) return;
        if (state.targetPreset === SECTION_PRESETS[name]) return;
        state.currentPreset = {
          scale: group.scale.x, autoRot: state.targetPreset.autoRot,
          explode: state.targetPreset.explode, camZ: camera.position.z, lattice: state.targetPreset.lattice,
        };
        state.targetPreset = SECTION_PRESETS[name];
        state.sectionT = 0;
        state.section = name;
        // lattice rebuild if density changed substantially
        if (Math.abs(state.currentPreset.lattice - state.targetPreset.lattice) > 0.2) {
          state.currentPreset = { ...state.currentPreset, lattice: state.targetPreset.lattice };
          buildLattice();
        }
      },
      setPalette(hex, hex2) { applyAccent(hex, hex2); },
      setAccent(hex, hex2) { applyAccent(hex, hex2); },
      setVariant(name) {
        if (!VARIANTS[name] || state.variant === name) return;
        state.variant = name;
        buildLattice();
      },
      setMotion(v) { state.motion = Math.max(0, Math.min(2, v)); },
      setScroll(y) { state.scrollY = y; },
      dispose() {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("resize", resize);
        renderer.dispose();
      },
    };
  }

  function fallback(canvas) {
    const ctx = canvas.getContext("2d");
    function draw() {
      const w = canvas.width = canvas.clientWidth, h = canvas.height = canvas.clientHeight;
      const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)/2);
      g.addColorStop(0, "rgba(184,255,61,0.16)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    draw();
    window.addEventListener("resize", draw);
    return {
      setSection(){}, setPalette(){}, setAccent(){}, setVariant(){}, setMotion(){}, setScroll(){},
      dispose() { window.removeEventListener("resize", draw); },
    };
  }

  window.AICore = { create, FACES };
})();
