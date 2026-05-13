// scene-engine.js — Master Three.js scene controller
// Handles 10 scenes that morph based on global scroll progress.
// Single canvas, single renderer, single camera. Scenes are objects with
// build(), update(t, p, gp), and color/theme reactivity.
//
// Exposes: window.SceneEngine.create(canvas, opts) → controller

(function () {
  "use strict";
  const THREE = window.THREE;
  if (!THREE) { window.SceneEngine = { create: () => null }; return; }

  const SECTIONS = ["hero","signal","about","projects","skills","services","cv","process","trust","contact"];

  // ── Utility
  function hexToRgb(hex) {
    const h = (hex || "#B8FF3D").replace("#", "");
    const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(v, 16);
    return { r: ((n >> 16) & 255)/255, g: ((n >> 8) & 255)/255, b: (n & 255)/255 };
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }
  function smoothstep(a, b, x) { const t = clamp((x-a)/(b-a), 0, 1); return t*t*(3-2*t); }

  // ── CodeText canvas factory (for textures)
  function codeCanvas(lines, accent, accent2, label, faceIdx) {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "rgba(10,14,18,0.95)");
    g.addColorStop(1, "rgba(20,28,36,0.92)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    // accent border
    ctx.strokeStyle = `rgba(${accent.r*255|0},${accent.g*255|0},${accent.b*255|0},0.95)`;
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 504, 504);
    // corner ticks
    ctx.lineWidth = 2.5;
    [[20,20,1,1],[492,20,-1,1],[20,492,1,-1],[492,492,-1,-1]].forEach(([x,y,dx,dy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x+dx*16, y);
      ctx.moveTo(x, y); ctx.lineTo(x, y+dy*16);
      ctx.stroke();
    });
    // header
    ctx.fillStyle = `rgba(${accent.r*255|0},${accent.g*255|0},${accent.b*255|0},1)`;
    ctx.font = "bold 26px 'JetBrains Mono', monospace";
    ctx.fillText(label, 36, 60);
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.fillText(`face/${String(faceIdx).padStart(2,"0")} · ${(0xa0+faceIdx).toString(16)}`, 36, 84);
    // line numbers + code
    ctx.font = "19px 'JetBrains Mono', monospace";
    lines.forEach((line, i) => {
      const y = 140 + i * 32;
      ctx.fillStyle = `rgba(${accent2.r*255|0},${accent2.g*255|0},${accent2.b*255|0},0.85)`;
      ctx.fillText(String(i+1).padStart(2,"0"), 36, y);
      ctx.fillStyle = "rgba(244,241,234,0.92)";
      // syntax tint: keywords vs strings
      const tinted = line.replace(/(\/\/.*)$/g, "·$1");
      ctx.fillText(tinted, 80, y);
    });
    // footer
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath(); ctx.moveTo(36, 440); ctx.lineTo(476, 440); ctx.stroke();
    ctx.fillStyle = `rgba(${accent.r*255|0},${accent.g*255|0},${accent.b*255|0},1)`;
    ctx.font = "12px 'JetBrains Mono', monospace";
    ctx.fillText(`> click to open · ${SECTIONS[faceIdx] || "view"}`, 36, 470);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  // Code content per face (TS / Python / SQL / Bash mix)
  const FACE_CONTENT = [
    { i:0, axis:"+x", section:"projects", label:"PROJECTS.ts", lang:"ts", code:[
      "export const ship = async () => {",
      "  await build();",
      "  await test();",
      "  return deploy();",
      "}"
    ]},
    { i:1, axis:"-x", section:"skills", label:"stack.py", lang:"py", code:[
      "from me import *",
      "",
      "stack = [",
      "  'TS','React','AI',",
      "  'Bots','SQL','MCP'",
      "]"
    ]},
    { i:2, axis:"+y", section:"about", label:"ABOUT.md", lang:"md", code:[
      "# samandar",
      "> engineer who ships",
      "",
      "- full-stack",
      "- ai-automation",
      "- prod-ready"
    ]},
    { i:3, axis:"-y", section:"services", label:"hire.sql", lang:"sql", code:[
      "INSERT INTO clients",
      "  (name, project)",
      "VALUES",
      "  ($1, $2)",
      "RETURNING id;"
    ]},
    { i:4, axis:"+z", section:"contact", label:"deploy.sh", lang:"sh", code:[
      "$ deploy --prod",
      "› compile  ok",
      "› upload   ok",
      "› verify   ok",
      "› live ✓"
    ]},
    { i:5, axis:"-z", section:"cv", label:"git.log", lang:"log", code:[
      "* main",
      "│ feat: ship",
      "│ fix: latency",
      "│ chore: refactor",
      "│ init: hello"
    ]},
  ];

  // ── Section progress mapping
  // Per scroll position 0..1, which scene is "active" and how blended.
  // sceneIndex = floor(p*10); local = p*10 - sceneIndex
  function progressToScene(p) {
    const total = SECTIONS.length;
    const raw = clamp(p, 0, 0.9999) * total;
    const idx = Math.floor(raw);
    const local = raw - idx;
    return { idx, local, name: SECTIONS[idx] };
  }

  // ────────────────────────────────────────────────────────────
  // SCENE CLASSES — each owns a THREE.Group; build() once, update(t, p) per frame.
  // ────────────────────────────────────────────────────────────

  class HeroCubeScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.faceMeshes = [];
      this.particles = null;
      this.lines = null;
      this.SIZE = 1.4;
      this.HALF = 0.7;
      this.state = { rotX: -0.15, rotY: 0.6, velX: 0, velY: 0, hovered: -1, exploded: 0 };
      this.build();
    }
    build() {
      const SIZE = this.SIZE, HALF = this.HALF;
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      // faces
      FACE_CONTENT.forEach(face => {
        const tex = codeCanvas(face.code, acc, ac2, face.label, face.i);
        const geo = new THREE.PlaneGeometry(SIZE, SIZE);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        switch (face.axis) {
          case "+x": m.position.set( HALF, 0, 0); m.rotation.y =  Math.PI/2; break;
          case "-x": m.position.set(-HALF, 0, 0); m.rotation.y = -Math.PI/2; break;
          case "+y": m.position.set(0,  HALF, 0); m.rotation.x = -Math.PI/2; break;
          case "-y": m.position.set(0, -HALF, 0); m.rotation.x =  Math.PI/2; break;
          case "+z": m.position.set(0, 0,  HALF); break;
          case "-z": m.position.set(0, 0, -HALF); m.rotation.y = Math.PI; break;
        }
        m.userData = { face };
        this.faceMeshes.push(m);
        this.group.add(m);
      });
      // edges
      const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(SIZE, SIZE, SIZE));
      this.edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(acc.r, acc.g, acc.b), transparent: true, opacity: 0.8 });
      this.edges = new THREE.LineSegments(edgeGeo, this.edgeMat);
      this.group.add(this.edges);
      // lattice
      const count = this.env.mobile ? 700 : 1600;
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const phases = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const inside = Math.random() > 0.3;
        let x, y, z;
        if (inside) {
          x = (Math.random()-0.5)*1.3; y = (Math.random()-0.5)*1.3; z = (Math.random()-0.5)*1.3;
        } else {
          const r = 1.0 + Math.random()*0.7;
          const t = Math.random()*Math.PI*2;
          const ph = Math.acos(2*Math.random()-1);
          x = r*Math.sin(ph)*Math.cos(t); y = r*Math.sin(ph)*Math.sin(t); z = r*Math.cos(ph);
        }
        positions[i*3]=x; positions[i*3+1]=y; positions[i*3+2]=z;
        sizes[i] = 1.2 + Math.random()*2.2;
        phases[i] = Math.random()*Math.PI*2;
      }
      const pgeo = new THREE.BufferGeometry();
      pgeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pgeo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
      pgeo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
      this.pMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime:{value:0},
          uPR:{value:Math.min(window.devicePixelRatio||1, 2)},
          uColor:{value:new THREE.Color(acc.r,acc.g,acc.b)},
          uColor2:{value:new THREE.Color(ac2.r,ac2.g,ac2.b)},
          uExplode:{value:0},
        },
        vertexShader: `
          attribute float aSize;
          attribute float aPhase;
          uniform float uTime;
          uniform float uPR;
          uniform float uExplode;
          varying float vA;
          void main(){
            vec3 p = position;
            float t = uTime + aPhase;
            p += normalize(position + vec3(0.001))*uExplode*0.5;
            p.x += sin(t*0.7)*0.05;
            p.y += cos(t*0.6)*0.05;
            p.z += sin(t*0.5)*0.04;
            vec4 mv = modelViewMatrix*vec4(p,1.0);
            gl_Position = projectionMatrix*mv;
            gl_PointSize = aSize*uPR*(180.0/-mv.z);
            vA = 0.5+0.5*sin(t*1.7);
          }
        `,
        fragmentShader: `
          precision mediump float;
          uniform vec3 uColor; uniform vec3 uColor2;
          varying float vA;
          void main(){
            vec2 uv = gl_PointCoord-0.5;
            float d = length(uv);
            if(d>0.5) discard;
            float core = smoothstep(0.5, 0.0, d);
            vec3 c = mix(uColor2, uColor, core);
            gl_FragColor = vec4(c, core*vA*0.85);
          }
        `,
        transparent:true, depthWrite:false, blending: THREE.AdditiveBlending,
      });
      this.particles = new THREE.Points(pgeo, this.pMat);
      this.group.add(this.particles);
      // orbit ring
      const ringPts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i/128)*Math.PI*2;
        ringPts.push(new THREE.Vector3(Math.cos(a)*1.8, 0, Math.sin(a)*1.8));
      }
      this.ringMat = new THREE.LineBasicMaterial({ color: new THREE.Color(acc.r,acc.g,acc.b), transparent:true, opacity:0.18 });
      this.ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), this.ringMat);
      this.ring.rotation.x = Math.PI/2-0.2;
      this.group.add(this.ring);
    }
    applyTheme(acc, ac2) {
      this.edgeMat.color.setRGB(acc.r,acc.g,acc.b);
      this.pMat.uniforms.uColor.value.setRGB(acc.r,acc.g,acc.b);
      this.pMat.uniforms.uColor2.value.setRGB(ac2.r,ac2.g,ac2.b);
      this.ringMat.color.setRGB(acc.r,acc.g,acc.b);
      // rebuild face textures
      this.faceMeshes.forEach((m, i) => {
        if (m.material.map) m.material.map.dispose();
        m.material.map = codeCanvas(FACE_CONTENT[i].code, acc, ac2, FACE_CONTENT[i].label, FACE_CONTENT[i].i);
        m.material.needsUpdate = true;
      });
    }
    update(dt, time, sceneP, globalP, pointer) {
      // sceneP: 0..1 within hero section (0 at top, ~1 entering next)
      const HALF = this.HALF;
      // auto-rotation when not dragging
      if (!this.env.dragging) {
        this.state.rotY += 0.004 * this.env.motion * dt * 60;
        this.state.velX *= 0.92; this.state.velY *= 0.92;
        this.state.rotX += this.state.velX*0.3;
        this.state.rotY += this.state.velY*0.3;
      }
      this.state.rotX = clamp(this.state.rotX, -1.2, 1.2);
      // mouse parallax
      this.group.rotation.x = this.state.rotX + pointer.ty*0.15;
      this.group.rotation.y = this.state.rotY + pointer.tx*0.15;
      // scale fade as we scroll into signal
      const exitT = clamp(sceneP*2 - 0.8, 0, 1);
      const baseScale = lerp(1.0, 0.45, exitT);
      const offX = lerp(0, 2.2, exitT);
      const offY = lerp(0, 0.8, exitT);
      this.group.position.set(offX, offY, 0);
      this.group.scale.setScalar(baseScale);
      // explode on near-exit
      const explode = lerp(0, 0.6, exitT);
      this.pMat.uniforms.uExplode.value = explode;
      this.faceMeshes.forEach((m) => {
        const f = m.userData.face;
        const dir = new THREE.Vector3(
          f.axis==="+x"?1:f.axis==="-x"?-1:0,
          f.axis==="+y"?1:f.axis==="-y"?-1:0,
          f.axis==="+z"?1:f.axis==="-z"?-1:0,
        );
        const off = HALF + explode*0.4 + (this.state.hovered===f.i?0.18:0);
        m.position.copy(dir).multiplyScalar(off);
        m.material.opacity = 0.92 - exitT*0.4 + (this.state.hovered===f.i?0.08:0);
      });
      this.edgeMat.opacity = (0.55 + Math.sin(time*2)*0.2) * (1 - exitT*0.6);
      this.ring.rotation.z += 0.0015*this.env.motion;
      this.ring.rotation.y += 0.0007*this.env.motion;
      this.pMat.uniforms.uTime.value = time;
      // visibility: only when hero is active or partially active
      this.group.visible = sceneP < 1.05;
    }
    raycastFaces(raycaster) {
      return raycaster.intersectObjects(this.faceMeshes, false);
    }
  }

  // ── SIGNAL — 3 rising 3D bars
  class SignalBarsScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.bars = [];
      this.build();
    }
    build() {
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      const labels = ["YEARS", "PROJECTS", "STACK"];
      const values = [5, 24, 12];
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        const h = 1.0 + values[i]*0.06;
        const geo = new THREE.BoxGeometry(0.5, h, 0.5);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(acc.r, acc.g, acc.b),
          transparent: true, opacity: 0.18, wireframe: false,
        });
        const m = new THREE.Mesh(geo, mat);
        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: new THREE.Color(acc.r, acc.g, acc.b), transparent:true, opacity:0.95 })
        );
        m.add(edge);
        g.add(m);
        g.position.set((i-1)*1.1, -1, 0);
        g.userData = { targetH: h, baseY: -1, mesh: m, edge };
        this.bars.push(g);
        this.group.add(g);
      }
      // base grid
      const grid = new THREE.GridHelper(8, 16,
        new THREE.Color(acc.r*0.4, acc.g*0.4, acc.b*0.4),
        new THREE.Color(0.1, 0.1, 0.12));
      grid.position.y = -1.6;
      this.grid = grid;
      this.group.add(grid);
    }
    applyTheme(acc, ac2) {
      this.bars.forEach(g => {
        g.userData.mesh.material.color.setRGB(acc.r, acc.g, acc.b);
        g.userData.edge.material.color.setRGB(acc.r, acc.g, acc.b);
      });
    }
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.3, 0.5, sceneP);
      const exitT = smoothstep(0.7, 1.2, sceneP);
      this.bars.forEach((g, i) => {
        const delay = i*0.12;
        const k = clamp(enterT*1.4 - delay, 0, 1);
        const ek = easeInOut(k);
        g.scale.y = ek;
        g.userData.mesh.position.y = (g.userData.targetH/2) * ek - 0.6;
        // collapse on exit
        const cl = 1 - exitT;
        g.scale.x = cl; g.scale.z = cl;
      });
      this.group.rotation.y = pointer.tx*0.3 + Math.sin(time*0.3)*0.1;
      this.group.rotation.x = -0.15 + pointer.ty*0.15;
      this.group.position.x = lerp(-1.5, 0, enterT);
      this.group.visible = sceneP > -0.3 && sceneP < 1.4;
    }
  }

  // ── ABOUT — token sphere
  class TokenSphereScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.sprites = [];
      this.build();
    }
    build() {
      const tokens = ["TS","React","Next","Node","Python","FastAPI","aiogram","SQL","Postgres","Redis","Docker","K8s","AI","GPT","RAG","MCP","Bot","WebGL","Three","CSS","HTML","Git","CI","CD","REST","gRPC","WS","JSON","JWT","OAuth","CDN","S3","Lambda","Vercel","Cloud","Edge","Stripe","i18n","SEO","A11y"];
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      const R = 2.2;
      tokens.forEach((tk, i) => {
        const phi = Math.acos(-1 + (2*i)/tokens.length);
        const theta = Math.sqrt(tokens.length*Math.PI)*phi;
        const x = R*Math.sin(phi)*Math.cos(theta);
        const y = R*Math.sin(phi)*Math.sin(theta);
        const z = R*Math.cos(phi);
        const c = document.createElement("canvas");
        c.width = 256; c.height = 64;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "rgba(0,0,0,0)"; ctx.fillRect(0,0,256,64);
        ctx.font = "bold 36px 'JetBrains Mono', monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = i%3===0 ? `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},1)` :
                        i%3===1 ? `rgba(${ac2.r*255|0},${ac2.g*255|0},${ac2.b*255|0},0.9)` :
                                  "rgba(244,241,234,0.85)";
        ctx.fillText(tk, 128, 32);
        const tex = new THREE.CanvasTexture(c);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent:true });
        const s = new THREE.Sprite(mat);
        s.position.set(x, y, z);
        s.scale.set(0.7, 0.18, 1);
        s.userData = { home: new THREE.Vector3(x,y,z), tex };
        this.sprites.push(s);
        this.group.add(s);
      });
      // sphere wireframe
      this.sphere = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R, 1)),
        new THREE.LineBasicMaterial({ color: new THREE.Color(acc.r,acc.g,acc.b), transparent:true, opacity:0.25 })
      );
      this.group.add(this.sphere);
    }
    applyTheme(acc, ac2) {
      this.sphere.material.color.setRGB(acc.r, acc.g, acc.b);
    }
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.2, 0.5, sceneP);
      const exitT = smoothstep(0.7, 1.2, sceneP);
      this.group.rotation.y += 0.003*this.env.motion;
      this.group.rotation.x = pointer.ty*0.2;
      this.group.rotation.z = pointer.tx*0.1;
      this.sprites.forEach((s, i) => {
        const k = clamp(enterT*1.5 - i*0.015, 0, 1);
        s.scale.set(0.7*k, 0.18*k, 1);
        s.material.opacity = k * (1 - exitT);
      });
      const sc = lerp(0.3, 1, enterT) * lerp(1, 0.2, exitT);
      this.group.scale.setScalar(sc);
      this.group.visible = sceneP > -0.3 && sceneP < 1.4;
    }
  }

  // ── PROJECTS — 3D card shelf
  class ProjectShelfScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.cards = [];
      this.build();
    }
    build() {
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      const titles = ["Telegram\nCommerce","AI Workflow\nEngine","Admin\nDashboard","Auto-Reports","Lead\nQualifier","Multi-Tenant\nSaaS"];
      for (let i = 0; i < 6; i++) {
        const c = document.createElement("canvas"); c.width = 512; c.height = 320;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "rgba(11,14,17,0.95)"; ctx.fillRect(0,0,512,320);
        // bar
        ctx.fillStyle = "rgba(20,24,28,0.8)"; ctx.fillRect(0,0,512,28);
        ctx.fillStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},0.9)`;
        ctx.beginPath(); ctx.arc(20,14,5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(244,241,234,0.5)"; ctx.fillRect(38,11,80,6);
        // title
        ctx.fillStyle = "rgba(244,241,234,0.95)";
        ctx.font = "bold 28px 'JetBrains Mono', monospace";
        const lines = titles[i].split("\n");
        lines.forEach((ln, k) => ctx.fillText(ln, 32, 80 + k*34));
        // mock chart
        ctx.strokeStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},0.9)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 32; x < 480; x += 12) {
          const y = 220 + Math.sin((x+i*40)*0.04)*30 + Math.cos(x*0.02)*15;
          x === 32 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        // chips
        const chips = ["TS","Next","AI","Bot","SQL"];
        chips.forEach((ch, k) => {
          ctx.fillStyle = "rgba(244,241,234,0.05)";
          ctx.fillRect(32+k*70, 270, 60, 30);
          ctx.strokeStyle = `rgba(${ac2.r*255|0},${ac2.g*255|0},${ac2.b*255|0},0.5)`;
          ctx.strokeRect(32+k*70, 270, 60, 30);
          ctx.fillStyle = `rgba(${ac2.r*255|0},${ac2.g*255|0},${ac2.b*255|0},0.9)`;
          ctx.font = "14px 'JetBrains Mono', monospace";
          ctx.fillText(ch, 44+k*70, 290);
        });
        // border
        ctx.strokeStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},0.7)`;
        ctx.lineWidth = 3;
        ctx.strokeRect(2,2,508,316);
        const tex = new THREE.CanvasTexture(c);
        const geo = new THREE.PlaneGeometry(2.4, 1.5);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat);
        m.userData = { idx: i, tex };
        this.cards.push(m);
        this.group.add(m);
      }
    }
    applyTheme(acc, ac2) { /* textures stale, but ok for perf */ }
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.2, 0.4, sceneP);
      const exitT = smoothstep(0.7, 1.2, sceneP);
      const focusIdx = clamp(Math.floor(sceneP*6), 0, 5);
      this.cards.forEach((m, i) => {
        const offset = i - sceneP*4;
        const target = new THREE.Vector3(offset*1.4, Math.sin(time*0.5 + i)*0.05, -Math.abs(offset)*0.4);
        m.position.lerp(target, 0.1);
        m.rotation.y = lerp(m.rotation.y, -0.25 + Math.sign(offset)*0.05, 0.1);
        m.rotation.x = pointer.ty*0.1;
        const dist = Math.abs(offset);
        const opacity = clamp(1 - dist*0.25, 0.2, 1) * enterT * (1 - exitT);
        m.material.opacity = opacity;
        m.scale.setScalar(lerp(0.7, 1, 1 - clamp(dist/3, 0, 1)) * enterT);
      });
      this.group.position.y = 0.1;
      this.group.visible = sceneP > -0.3 && sceneP < 1.4;
    }
  }

  // ── SKILLS — multi-floor tower
  class SkillsTowerScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.floors = [];
      this.build();
    }
    build() {
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      const labels = ["FRONTEND","BACKEND","AI/ML","DEVOPS","TOOLS"];
      for (let f = 0; f < 5; f++) {
        const floor = new THREE.Group();
        // floor pad
        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(2, 0.06, 2),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(acc.r*0.4, acc.g*0.4, acc.b*0.4), transparent:true, opacity:0.3 })
        );
        floor.add(pad);
        // wire box
        const wire = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(2, 0.4, 2)),
          new THREE.LineBasicMaterial({ color: new THREE.Color(acc.r,acc.g,acc.b), transparent:true, opacity:0.5 })
        );
        wire.position.y = 0.2;
        floor.add(wire);
        // small cubes inside
        for (let i = 0; i < 6; i++) {
          const c = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.18, 0.18),
            new THREE.MeshBasicMaterial({ color: i%2===0 ? new THREE.Color(acc.r,acc.g,acc.b) : new THREE.Color(ac2.r,ac2.g,ac2.b), transparent:true, opacity:0.7 })
          );
          c.position.set((Math.random()-0.5)*1.5, 0.1+Math.random()*0.2, (Math.random()-0.5)*1.5);
          floor.add(c);
        }
        // label
        const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
        const ctx = cv.getContext("2d");
        ctx.font = "bold 28px 'JetBrains Mono', monospace";
        ctx.fillStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},1)`;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(labels[f], 250, 32);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent:true }));
        sp.scale.set(1.2, 0.3, 1);
        sp.position.set(-1.6, 0.2, 0);
        floor.add(sp);
        floor.position.y = f * 0.7 - 1.4;
        floor.userData = { idx: f };
        this.floors.push(floor);
        this.group.add(floor);
      }
      // beam through center
      this.beam = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.04, 0.04, 4, 6)),
        new THREE.LineBasicMaterial({ color: new THREE.Color(acc.r,acc.g,acc.b), transparent:true, opacity:0.6 })
      );
      this.group.add(this.beam);
    }
    applyTheme(acc, ac2) {
      this.floors.forEach(f => {
        f.children.forEach(ch => {
          if (ch.material && ch.material.color) {
            // skip sprites
            if (!ch.isSprite) ch.material.color.setRGB(acc.r*0.7, acc.g*0.7, acc.b*0.7);
          }
        });
      });
    }
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.2, 0.4, sceneP);
      const exitT = smoothstep(0.7, 1.2, sceneP);
      // orbit camera around tower via group rotation
      this.group.rotation.y = sceneP * Math.PI * 1.5 + pointer.tx*0.2;
      this.group.rotation.x = pointer.ty*0.1 - 0.1;
      this.floors.forEach((f, i) => {
        const k = clamp(enterT*1.5 - i*0.08, 0, 1);
        f.scale.setScalar(k);
        f.position.y = (i*0.7 - 1.4)*k;
      });
      this.group.position.x = lerp(2, 0, enterT);
      this.group.scale.setScalar(lerp(0.7, 1, enterT) * lerp(1, 0.3, exitT));
      this.group.visible = sceneP > -0.3 && sceneP < 1.4;
    }
  }

  // ── SERVICES — pipeline nodes
  class PipelineFlowScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.nodes = [];
      this.curves = [];
      this.flowParticles = null;
      this.build();
    }
    build() {
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      const labels = ["WEB.APP","AI.BOT","AUTO","ADMIN"];
      const positions = [
        new THREE.Vector3(-2.4, 0.7, 0),
        new THREE.Vector3(-0.8, -0.5, 0),
        new THREE.Vector3(0.8, 0.7, 0),
        new THREE.Vector3(2.4, -0.3, 0),
      ];
      positions.forEach((p, i) => {
        const node = new THREE.Group();
        const sphere = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.36, 1),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(acc.r,acc.g,acc.b), transparent:true, opacity:0.25 })
        );
        const wire = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.4, 1)),
          new THREE.LineBasicMaterial({ color: new THREE.Color(acc.r,acc.g,acc.b), opacity:0.9, transparent:true })
        );
        node.add(sphere); node.add(wire);
        const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
        const ctx = cv.getContext("2d");
        ctx.font = "bold 24px 'JetBrains Mono', monospace";
        ctx.fillStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},1)`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(labels[i], 128, 32);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:new THREE.CanvasTexture(cv), transparent:true }));
        sp.scale.set(1.4, 0.36, 1); sp.position.y = -0.7;
        node.add(sp);
        node.position.copy(p);
        node.userData = { home: p.clone(), wire, sphere };
        this.nodes.push(node);
        this.group.add(node);
      });
      // bezier curves
      for (let i = 0; i < positions.length-1; i++) {
        const a = positions[i], b = positions[i+1];
        const cp1 = new THREE.Vector3((a.x+b.x)/2, a.y, 0.3);
        const cp2 = new THREE.Vector3((a.x+b.x)/2, b.y, 0.3);
        const curve = new THREE.CubicBezierCurve3(a, cp1, cp2, b);
        const pts = curve.getPoints(48);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: new THREE.Color(ac2.r,ac2.g,ac2.b), transparent:true, opacity:0.5 }));
        this.curves.push({ curve, line });
        this.group.add(line);
      }
      // flow particles
      const count = 60;
      const pos = new Float32Array(count * 3);
      const tts = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        tts[i] = i/count;
      }
      this.flowGeo = new THREE.BufferGeometry();
      this.flowGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.flowGeo.userData = { tts };
      this.flowMat = new THREE.PointsMaterial({
        color: new THREE.Color(ac2.r,ac2.g,ac2.b),
        size: 0.08, transparent:true, opacity:0.9, blending: THREE.AdditiveBlending, depthWrite:false,
      });
      this.flowParticles = new THREE.Points(this.flowGeo, this.flowMat);
      this.group.add(this.flowParticles);
    }
    applyTheme(acc, ac2) {
      this.nodes.forEach(n => {
        n.userData.wire.material.color.setRGB(acc.r, acc.g, acc.b);
        n.userData.sphere.material.color.setRGB(acc.r, acc.g, acc.b);
      });
      this.curves.forEach(c => c.line.material.color.setRGB(ac2.r, ac2.g, ac2.b));
      this.flowMat.color.setRGB(ac2.r, ac2.g, ac2.b);
    }
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.2, 0.4, sceneP);
      const exitT = smoothstep(0.7, 1.2, sceneP);
      this.nodes.forEach((n, i) => {
        const k = clamp(enterT*1.4 - i*0.1, 0, 1);
        n.scale.setScalar(k);
        const pulse = 1 + Math.sin(time*1.5 + i*0.8)*0.05;
        n.userData.sphere.scale.setScalar(pulse);
        n.userData.wire.rotation.y = time*0.3 + i;
        n.userData.wire.rotation.x = time*0.2 + i;
      });
      // flow particles along curves
      const pos = this.flowGeo.attributes.position.array;
      const tts = this.flowGeo.userData.tts;
      const segs = this.curves.length;
      for (let i = 0; i < tts.length; i++) {
        let t = (tts[i] + time*0.15*this.env.motion) % 1;
        const segIdx = Math.floor(t*segs);
        const local = (t*segs) - segIdx;
        const c = this.curves[clamp(segIdx,0,segs-1)];
        const p = c.curve.getPoint(local);
        pos[i*3] = p.x; pos[i*3+1] = p.y; pos[i*3+2] = p.z;
      }
      this.flowGeo.attributes.position.needsUpdate = true;
      this.group.rotation.y = pointer.tx*0.2 + Math.sin(time*0.2)*0.05;
      this.group.rotation.x = pointer.ty*0.1;
      this.group.scale.setScalar(lerp(0.7, 1, enterT) * lerp(1, 0.4, exitT));
      this.group.visible = sceneP > -0.3 && sceneP < 1.4;
    }
  }

  // ── CV — timeline ribbon with spline
  class TimelineRibbonScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.build();
    }
    build() {
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      // curve in 3D space
      const pts = [];
      for (let i = 0; i <= 50; i++) {
        const t = i/50;
        pts.push(new THREE.Vector3(
          (t-0.5)*8,
          Math.sin(t*Math.PI*2)*0.6,
          Math.cos(t*Math.PI*2)*0.4
        ));
      }
      this.curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(this.curve, 100, 0.05, 8, false);
      this.tube = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: new THREE.Color(acc.r,acc.g,acc.b), transparent:true, opacity:0.5
      }));
      this.group.add(this.tube);
      // nodes on ribbon
      this.nodes = [];
      const years = ["2020","2021","2023","2024","2026"];
      years.forEach((y, i) => {
        const t = i/(years.length-1);
        const p = this.curve.getPoint(t);
        const ico = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.18, 0),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(ac2.r,ac2.g,ac2.b), wireframe:true })
        );
        ico.position.copy(p);
        ico.userData = { t, label: y };
        this.group.add(ico);
        this.nodes.push(ico);
      });
    }
    applyTheme(acc, ac2) {
      this.tube.material.color.setRGB(acc.r, acc.g, acc.b);
      this.nodes.forEach(n => n.material.color.setRGB(ac2.r, ac2.g, ac2.b));
    }
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.2, 0.4, sceneP);
      const exitT = smoothstep(0.7, 1.2, sceneP);
      // ride along the curve
      const camT = clamp(sceneP*0.9 + 0.05, 0, 0.95);
      const pos = this.curve.getPoint(camT);
      // we don't move camera (single camera) — move the group instead
      this.group.position.x = -pos.x;
      this.group.rotation.y = pointer.tx*0.3 + time*0.05;
      this.group.rotation.x = pointer.ty*0.15;
      this.nodes.forEach((n, i) => {
        n.rotation.x = time + i;
        n.rotation.y = time*0.7 + i;
        const dist = Math.abs(n.userData.t - camT);
        const scale = clamp(1 - dist*4, 0.3, 1.6);
        n.scale.setScalar(scale * enterT);
      });
      this.tube.material.opacity = 0.6 * enterT * (1 - exitT);
      this.group.scale.setScalar(lerp(0.6, 1, enterT) * lerp(1, 0.4, exitT));
      this.group.visible = sceneP > -0.3 && sceneP < 1.4;
    }
  }

  // ── PROCESS — gear pipeline with instanced particles
  class BuildPipelineScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.gears = [];
      this.build();
    }
    build() {
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      const N = 7;
      for (let i = 0; i < N; i++) {
        const g = new THREE.Group();
        const ring = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.TorusGeometry(0.3, 0.06, 6, 18)),
          new THREE.LineBasicMaterial({ color: new THREE.Color(acc.r,acc.g,acc.b), transparent:true, opacity:0.9 })
        );
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(ac2.r,ac2.g,ac2.b) })
        );
        g.add(ring); g.add(dot);
        g.position.set((i - (N-1)/2)*0.9, Math.sin(i*0.6)*0.2, 0);
        g.userData = { i, ring, dot };
        this.gears.push(g);
        this.group.add(g);
      }
      // flow particles between gears
      const count = 120;
      const pos = new Float32Array(count*3);
      const ph = new Float32Array(count);
      for (let i = 0; i < count; i++) ph[i] = i/count;
      this.flowGeo = new THREE.BufferGeometry();
      this.flowGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.flowGeo.userData = { ph };
      this.flowMat = new THREE.PointsMaterial({
        color: new THREE.Color(ac2.r,ac2.g,ac2.b),
        size: 0.06, transparent:true, opacity:0.9, blending: THREE.AdditiveBlending, depthWrite:false,
      });
      this.flow = new THREE.Points(this.flowGeo, this.flowMat);
      this.group.add(this.flow);
    }
    applyTheme(acc, ac2) {
      this.gears.forEach(g => {
        g.userData.ring.material.color.setRGB(acc.r, acc.g, acc.b);
        g.userData.dot.material.color.setRGB(ac2.r, ac2.g, ac2.b);
      });
      this.flowMat.color.setRGB(ac2.r, ac2.g, ac2.b);
    }
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.2, 0.4, sceneP);
      const exitT = smoothstep(0.7, 1.2, sceneP);
      this.gears.forEach((g, i) => {
        const k = clamp(enterT*1.4 - i*0.07, 0, 1);
        g.scale.setScalar(k);
        g.userData.ring.rotation.x = time*(0.5+i*0.1)*this.env.motion;
        g.userData.ring.rotation.z = time*(0.3+i*0.05)*this.env.motion;
      });
      // particles flowing left → right
      const pos = this.flowGeo.attributes.position.array;
      const ph = this.flowGeo.userData.ph;
      const span = (this.gears.length-1)*0.9;
      const startX = -span/2;
      for (let i = 0; i < ph.length; i++) {
        const t = (ph[i] + time*0.3*this.env.motion) % 1;
        pos[i*3] = startX + t*span;
        pos[i*3+1] = Math.sin(t*Math.PI*4 + i*0.3)*0.2 + (Math.sin(((startX+t*span)/0.9 - 0.5 + this.gears.length/2)*0.6)*0.2);
        pos[i*3+2] = Math.cos(t*Math.PI*2 + i)*0.15;
      }
      this.flowGeo.attributes.position.needsUpdate = true;
      this.group.rotation.y = pointer.tx*0.2;
      this.group.rotation.x = pointer.ty*0.1;
      this.group.scale.setScalar(lerp(0.7, 1, enterT) * lerp(1, 0.4, exitT));
      this.group.visible = sceneP > -0.3 && sceneP < 1.4;
    }
  }

  // ── TRUST — hologram cards
  class HoloCardsScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.cards = [];
      this.build();
    }
    build() {
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      const quotes = ["FAST","CLEAN","SHIP"];
      for (let i = 0; i < 3; i++) {
        const c = document.createElement("canvas");
        c.width = 512; c.height = 320;
        const ctx = c.getContext("2d");
        // scanline bg
        for (let y = 0; y < 320; y += 4) {
          ctx.fillStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},${0.06 + Math.sin(y*0.1)*0.04})`;
          ctx.fillRect(0, y, 512, 2);
        }
        ctx.strokeStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},0.8)`;
        ctx.lineWidth = 3; ctx.strokeRect(4,4,504,312);
        ctx.fillStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},1)`;
        ctx.font = "bold 64px 'JetBrains Mono', monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(quotes[i], 256, 160);
        ctx.font = "16px 'JetBrains Mono', monospace";
        ctx.fillStyle = "rgba(244,241,234,0.6)";
        ctx.fillText("// client testimonial", 256, 240);
        const tex = new THREE.CanvasTexture(c);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4), mat);
        m.position.set((i-1)*2.6, 0, 0);
        m.userData = { idx: i };
        this.cards.push(m);
        this.group.add(m);
      }
    }
    applyTheme() {}
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.2, 0.4, sceneP);
      const exitT = smoothstep(0.7, 1.2, sceneP);
      this.cards.forEach((m, i) => {
        const k = clamp(enterT*1.4 - i*0.1, 0, 1);
        m.scale.setScalar(k);
        m.rotation.y = -0.2 + Math.sin(time*0.5 + i)*0.1 + pointer.tx*0.2;
        m.rotation.x = Math.sin(time*0.3 + i)*0.05 + pointer.ty*0.1;
        m.position.y = Math.sin(time*0.7 + i*1.2)*0.15;
        m.material.opacity = k * (1 - exitT);
      });
      this.group.visible = sceneP > -0.3 && sceneP < 1.4;
    }
  }

  // ── CONTACT — monumental terminal
  class DeployTerminalScene {
    constructor(env) {
      this.env = env;
      this.group = new THREE.Group();
      this.build();
    }
    build() {
      const acc = hexToRgb(this.env.accent), ac2 = hexToRgb(this.env.accent2);
      const c = document.createElement("canvas"); c.width = 1024; c.height = 640;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "rgba(11,14,17,0.96)"; ctx.fillRect(0,0,1024,640);
      // header
      ctx.fillStyle = "rgba(20,24,28,0.95)"; ctx.fillRect(0,0,1024,52);
      ctx.fillStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},1)`;
      ctx.beginPath(); ctx.arc(28,26,10,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(244,241,234,0.5)";
      ctx.font = "20px 'JetBrains Mono', monospace";
      ctx.fillText("connect.term — deploy", 60, 34);
      // terminal lines
      const lines = [
        "> ./deploy --connect samandar",
        "› authenticating ........ OK",
        "› opening secure channel  OK",
        "› awaiting message ...",
        "",
        "  ready to receive deploy_payload",
        "",
        "  pubkey:  4e:b8:ff:3d:c8:9b:5e",
        "  channel: encrypted/wss/443",
      ];
      ctx.font = "26px 'JetBrains Mono', monospace";
      lines.forEach((ln, i) => {
        const y = 110 + i*42;
        if (ln.startsWith(">")) ctx.fillStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},1)`;
        else if (ln.startsWith("›")) ctx.fillStyle = `rgba(${ac2.r*255|0},${ac2.g*255|0},${ac2.b*255|0},0.9)`;
        else ctx.fillStyle = "rgba(244,241,234,0.85)";
        ctx.fillText(ln, 40, y);
      });
      // accent border
      ctx.strokeStyle = `rgba(${acc.r*255|0},${acc.g*255|0},${acc.b*255|0},0.8)`;
      ctx.lineWidth = 6; ctx.strokeRect(3,3,1018,634);
      this.tex = new THREE.CanvasTexture(c);
      this.mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent:true });
      this.term = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.125), this.mat);
      this.group.add(this.term);
      // particle aura
      const count = 200;
      const pos = new Float32Array(count*3);
      for (let i = 0; i < count; i++) {
        const a = Math.random()*Math.PI*2;
        const r = 2.6 + Math.random()*0.6;
        pos[i*3] = Math.cos(a)*r;
        pos[i*3+1] = Math.sin(a)*r * 0.65;
        pos[i*3+2] = (Math.random()-0.5)*0.5;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.pMat = new THREE.PointsMaterial({
        color: new THREE.Color(acc.r,acc.g,acc.b),
        size: 0.05, transparent:true, opacity:0.8,
        blending: THREE.AdditiveBlending, depthWrite:false,
      });
      this.particles = new THREE.Points(pg, this.pMat);
      this.group.add(this.particles);
    }
    applyTheme(acc, ac2) {
      this.pMat.color.setRGB(acc.r, acc.g, acc.b);
    }
    update(dt, time, sceneP, globalP, pointer) {
      const enterT = smoothstep(-0.2, 0.4, sceneP);
      this.term.scale.setScalar(lerp(0.7, 1, enterT));
      this.term.material.opacity = enterT;
      this.term.rotation.y = pointer.tx*0.15;
      this.term.rotation.x = pointer.ty*0.1;
      this.term.position.y = Math.sin(time*0.5)*0.04;
      this.particles.rotation.z = time*0.05;
      this.particles.material.opacity = 0.6*enterT;
      this.group.visible = sceneP > -0.3;
    }
  }

  // ────────────────────────────────────────────────────────────
  // MAIN ENGINE
  // ────────────────────────────────────────────────────────────
  function create(canvas, opts) {
    opts = opts || {};
    const env = {
      accent: opts.accent || "#B8FF3D",
      accent2: opts.accent2 || "#4DEBFF",
      motion: opts.motion ?? 1,
      mobile: window.innerWidth < 760,
      dragging: false,
      onFaceClick: opts.onFaceClick || (() => {}),
    };

    const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:!env.mobile, powerPreference:"high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, env.mobile?1.5:2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    // build all scenes
    const sceneMap = {
      hero:     new HeroCubeScene(env),
      signal:   new SignalBarsScene(env),
      about:    new TokenSphereScene(env),
      projects: new ProjectShelfScene(env),
      skills:   new SkillsTowerScene(env),
      services: new PipelineFlowScene(env),
      cv:       new TimelineRibbonScene(env),
      process:  new BuildPipelineScene(env),
      trust:    new HoloCardsScene(env),
      contact:  new DeployTerminalScene(env),
    };
    Object.values(sceneMap).forEach(s => { scene.add(s.group); s.group.visible = false; });

    // pointer
    const pointer = { x:0, y:0, tx:0, ty:0, down:false, startX:0, startY:0, dragX:0, dragY:0 };
    const ndc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    let scrollP = 0;
    let lastP = 0;
    let activeSceneName = "hero";

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setSize(w, h, false);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      camera.aspect = w/h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left)/r.width)*2 - 1;
      ndc.y = -((e.clientY - r.top)/r.height)*2 + 1;
      pointer.x = (e.clientX - r.left)/r.width - 0.5;
      pointer.y = (e.clientY - r.top)/r.height - 0.5;
      if (pointer.down && activeSceneName === "hero") {
        const dx = e.clientX - pointer.startX, dy = e.clientY - pointer.startY;
        pointer.dragX = dx; pointer.dragY = dy;
        sceneMap.hero.state.velY = dx*0.005;
        sceneMap.hero.state.velX = dy*0.005;
        sceneMap.hero.state.rotY += dx*0.008;
        sceneMap.hero.state.rotX += dy*0.008;
        pointer.startX = e.clientX; pointer.startY = e.clientY;
      } else if (!pointer.down && activeSceneName === "hero") {
        raycaster.setFromCamera(ndc, camera);
        const hits = sceneMap.hero.raycastFaces(raycaster);
        sceneMap.hero.state.hovered = (hits.length && e.clientY < window.innerHeight*1.1) ? hits[0].object.userData.face.i : -1;
      }
    }
    function onDown(e) {
      if (activeSceneName !== "hero") return;
      if (e.clientY > window.innerHeight*1.1) return;
      pointer.down = true; env.dragging = true;
      pointer.startX = e.clientX; pointer.startY = e.clientY;
      pointer.dragX = 0; pointer.dragY = 0;
    }
    function onUp(e) {
      if (!pointer.down) return;
      const wasDrag = Math.abs(pointer.dragX) + Math.abs(pointer.dragY) > 6;
      pointer.down = false; env.dragging = false;
      if (!wasDrag && activeSceneName === "hero") {
        const r = canvas.getBoundingClientRect();
        ndc.x = ((e.clientX - r.left)/r.width)*2 - 1;
        ndc.y = -((e.clientY - r.top)/r.height)*2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = sceneMap.hero.raycastFaces(raycaster);
        if (hits.length) env.onFaceClick(hits[0].object.userData.face);
      }
    }
    window.addEventListener("pointermove", onMove, { passive:true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    // animation loop
    let raf = 0, lastT = performance.now();
    function animate(now) {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastT)/1000);
      lastT = now;
      const time = now*0.001*env.motion;

      // dampen pointer
      pointer.tx += (pointer.x - pointer.tx)*0.06;
      pointer.ty += (pointer.y - pointer.ty)*0.06;

      // current scene = floor(scrollP * 10)
      const m = progressToScene(scrollP);
      activeSceneName = m.name;
      // update each scene with its local progress
      SECTIONS.forEach((name, idx) => {
        const localP = scrollP*SECTIONS.length - idx;
        sceneMap[name].update(dt, time, localP, scrollP, pointer);
      });

      // camera: subtle dolly based on progress
      const targetZ = 5.5 + Math.sin(scrollP*Math.PI*2)*0.4;
      camera.position.z += (targetZ - camera.position.z)*0.05;
      // scroll velocity for chromatic feel
      const velocity = Math.abs(scrollP - lastP);
      lastP = scrollP;

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(animate);

    function applyTheme(hex, hex2) {
      env.accent = hex; env.accent2 = hex2;
      const a = hexToRgb(hex), b = hexToRgb(hex2);
      Object.values(sceneMap).forEach(s => { if (s.applyTheme) s.applyTheme(a, b); });
    }

    return {
      setScroll(p) { scrollP = clamp(p, 0, 1); },
      setSection(name) { /* observer-driven; scroll handles it */ },
      setMotion(v) { env.motion = clamp(v, 0, 2); },
      setAccent(hex, hex2) { applyTheme(hex || env.accent, hex2 || env.accent2); },
      setVariant() { /* no-op (variant handled per-scene) */ },
      dispose() {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        renderer.dispose();
      },
    };
  }

  window.SceneEngine = { create };
  // Back-compat: AICore.create alias
  window.AICore = { create };
})();
