// cursor-constellation.js — Stack Radar (v61).
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// The previous build was a generic "draw glowing particles" toy — pretty, but
// pure noise: it said nothing about the person whose CV it sits in. This is the
// pivot to SIGNAL. Every node is a REAL technology from the stack, grouped into
// the six real domains (Frontend / Backend / AI / DevOps / Product / Telegram).
// Lines are real adjacencies (each tool → its domain hub → the stack spine).
//
//   • hover a node      → its label + domain surface; its cluster lights up,
//                         the rest dims. You read the breadth at a glance.
//   • click a node      → pins it and shows the REAL projects that use that
//                         tool (matched literally against each project's stack —
//                         no invented links). Click again / elsewhere = unpin.
//   • idle              → the whole map breathes slowly; a hint fades in.
//
// One engineer spanning all six domains, and the tools interconnect — that's the
// message a list can't carry. Warm accent only (no rainbow), slow motion, paused
// off-screen. ~35 nodes + a handful of lines → trivially cheap even on a phone.
//
// PUBLIC API (unchanged — drop-in for the old widget)
// ─────────────────────────────────────────────────────────────────────────────
//   const w = window.CursorConstellation.create(rootEl, { lang?, groups?, projects? })
//   w.dispose()
//   groups   = [{ k: "Frontend", items: ["React", ...] }, ...]
//   projects = [{ name: "...", stack: ["React", ...] }, ...]
// ════════════════════════════════════════════════════════════════════════════

(function () {
  "use strict";

  const TAU = Math.PI * 2;

  // ── Tuning ─────────────────────────────────────────────────────────────
  const DPR_MAX = 2;
  // Node radii (CSS px). Hubs (domains) read heavier than the tools orbiting them.
  const HUB_R = 5.2;
  const TECH_R = 3.0;
  // Pointer must come within this many CSS px of a node to "pick" it.
  const HOVER_RADIUS_PX = 30;
  // Idle breathing — base position + a tiny slow orbit. Kept small so the map
  // reads as a stable diagram that's alive, not a floaty mess.
  const DRIFT_AMP_TECH = 3.4;
  const DRIFT_AMP_HUB = 1.6;
  const DRIFT_SPEED = 0.00042;     // radians per ms
  const TWINKLE_SPEED = 0.0016;
  // Layout: domains sit on an ellipse; tools orbit their hub.
  const RING_RX_FACTOR = 0.31;
  const RING_RY_FACTOR = 0.31;
  const CLUSTER_R_FACTOR = 0.092;  // tool orbit radius as a share of min(w,h)
  const LAYOUT_ANGLE_OFFSET = -0.32;
  // Focus dimming — non-focused clusters fade to this alpha multiplier.
  const DIM_ALPHA = 0.26;
  const FOCUS_GROW = 1.9;          // hovered/pinned node radius multiplier
  // Show the centre hint after this much inactivity (ms).
  const IDLE_AFTER_MS = 2400;

  // Traveling signal pulses — continuous "network is alive" motion, independent
  // of hover/pin. One pulse per spine segment (hub-to-hub) + one per spoke
  // (tool-to-hub). Rides the SAME real adjacency lines already drawn in the
  // spine/spoke draw steps — no new data, purely decorative motion on top of
  // the honest structure that's already there.
  const PULSE_SPINE_PERIOD_MIN = 3200;   // ms — spine pulses (longer lines, slower)
  const PULSE_SPINE_PERIOD_MAX = 5500;
  const PULSE_SPOKE_PERIOD_MIN = 2200;   // ms — spoke pulses (shorter lines, brisker)
  const PULSE_SPOKE_PERIOD_MAX = 3800;
  const PULSE_R = 2.0;                   // head radius, CSS px (TECH_R is 3.0)
  const PULSE_TRAIL_STEPS = 2;           // faded circles behind the head (kept lean — see perf note)
  const PULSE_TRAIL_GAP = 0.05;          // trail spacing as a fraction of progress (0..1)
  const PULSE_ALPHA_SPINE = 0.55;
  const PULSE_ALPHA_SPOKE = 0.65;
  const PULSE_FOCUS_BOOST = 1.5;         // brightness multiplier for focused-cluster spokes

  // One-shot "ping" ring on click-pin — click's felt payoff. Self-pruning array.
  const PING_DURATION_MS = 560;
  const PING_MAX_R = 28;                 // px added to the base ~6px start radius

  const MEDIA_REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

  // ── Localized labels ──────────────────────────────────────────────────
  const I18N = {
    ru: {
      title: "stack.radar",
      subtitle: "наведи на узел · клик — где применяю",
      hint: "наведи на технологию",
      hint_touch: "коснись технологии",
      live: "live",
      domains_word: "доменов",
      used_in: "в проектах",
      core: "базовый инструмент стека",
      domain_one: "инструмент",
      domain_few: "инструмента",
      domain_many: "инструментов",
    },
    en: {
      title: "stack.radar",
      subtitle: "hover a node · click — where I use it",
      hint: "hover a technology",
      hint_touch: "tap a technology",
      live: "live",
      domains_word: "domains",
      used_in: "used in",
      core: "foundational stack tool",
      domain_one: "tool",
      domain_few: "tools",
      domain_many: "tools",
    },
    uz: {
      title: "stack.radar",
      subtitle: "tugunga olib bor · bos — qayerda ishlataman",
      hint: "texnologiyaga olib bor",
      hint_touch: "texnologiyaga teg",
      live: "live",
      domains_word: "domen",
      used_in: "loyihalarda",
      core: "stekning asosiy vositasi",
      domain_one: "vosita",
      domain_few: "vosita",
      domain_many: "vosita",
    },
  };

  // Sensible fallback graph so the widget never renders empty if the host
  // forgets to pass content. Mirrors the real stack groups.
  const FALLBACK_GROUPS = [
    { k: "Frontend", items: ["TypeScript", "React", "Next.js", "Astro", "GSAP", "Three.js", "Tailwind"] },
    { k: "Backend", items: ["Node.js", "Fastify", "tRPC", "Postgres", "Redis", "Prisma"] },
    { k: "AI / Automation", items: ["OpenAI", "Anthropic", "LangChain", "n8n", "RAG", "Vector DBs"] },
    { k: "DevOps", items: ["Docker", "GitHub Actions", "Cloudflare", "Railway", "Linux"] },
    { k: "Product", items: ["Figma", "Architecture", "Product strategy", "Tech spec"] },
    { k: "Telegram", items: ["Telegraf", "Bot API", "MTProto", "Web Apps"] },
  ];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  // Russian-style plural picker (1 инструмент / 2 инструмента / 5 инструментов).
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  function buildHtml(labels) {
    return (
      '<header class="cc-head">' +
        '<div class="cc-head-l">' +
          '<span class="cc-icon" aria-hidden="true">✦</span>' +
          '<div class="cc-head-titles">' +
            '<span class="cc-title">' + escapeHtml(labels.title) + '</span>' +
            '<span class="cc-subtitle mono">' + escapeHtml(labels.subtitle) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="cc-head-r">' +
          '<span class="cc-live mono"><span class="cc-live-dot"></span>' + escapeHtml(labels.live) + '</span>' +
        '</div>' +
      '</header>' +
      '<div class="cc-stage" data-cc-stage>' +
        '<canvas class="cc-canvas" data-cc-canvas></canvas>' +
        '<div class="cc-tip mono" data-cc-tip aria-hidden="true">' +
          '<span class="cc-tip-name" data-cc-tip-name></span>' +
          '<span class="cc-tip-dom" data-cc-tip-dom></span>' +
        '</div>' +
        '<div class="cc-hint mono" data-cc-hint>' +
          '<span class="cc-hint-line" data-cc-hint-text>' + escapeHtml(labels.hint) + '</span>' +
        '</div>' +
        '<div class="cc-readout mono" data-cc-readout aria-live="polite"></div>' +
      '</div>'
    );
  }

  // ── Factory ────────────────────────────────────────────────────────────
  function create(rootEl, opts) {
    const options = opts || {};
    if (!rootEl) {
      console.warn("[StackRadar] no rootEl, returning no-op.");
      return { dispose: function () {} };
    }
    const lang = options.lang in I18N ? options.lang : "ru";
    const labels = Object.assign({}, I18N[lang], options.labels || {});
    const groups = (Array.isArray(options.groups) && options.groups.length) ? options.groups : FALLBACK_GROUPS;
    const projects = Array.isArray(options.projects) ? options.projects : [];

    rootEl.classList.add("cursor-constellation", "cc", "cc-radar");
    rootEl.innerHTML = buildHtml(labels);

    const canvas = rootEl.querySelector("[data-cc-canvas]");
    const hint = rootEl.querySelector("[data-cc-hint]");
    const hintText = rootEl.querySelector("[data-cc-hint-text]");
    const tip = rootEl.querySelector("[data-cc-tip]");
    const tipName = rootEl.querySelector("[data-cc-tip-name]");
    const tipDom = rootEl.querySelector("[data-cc-tip-dom]");
    const readout = rootEl.querySelector("[data-cc-readout]");

    if (!canvas || !canvas.getContext) {
      console.warn("[StackRadar] canvas unavailable, abort.");
      return { dispose: function () {} };
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("[StackRadar] 2d context unavailable, abort.");
      return { dispose: function () {} };
    }

    const isTouch = (typeof window !== "undefined" && (("ontouchstart" in window) || (navigator.maxTouchPoints > 0)));
    if (isTouch && hintText) hintText.textContent = labels.hint_touch;

    const motionMedia = window.matchMedia ? window.matchMedia(MEDIA_REDUCED_MOTION)
      : { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    // Fold in the device-tier flag (set once at boot by app.jsx on low-tier
    // devices) alongside the live OS media query — low-tier devices need the
    // extra per-frame pulse/ping arc fills skipped too, not just OS-level
    // reduced-motion. data-motion-lite is set once and never toggled later.
    function computeReducedMotion() {
      return motionMedia.matches || document.documentElement.hasAttribute("data-motion-lite");
    }
    let prefersReducedMotion = computeReducedMotion();

    // ── Build the graph from real content ─────────────────────────────────
    // node = { label, gi, hub, projects, bx, by, x, y, phase, tw }
    const nodes = [];
    const hubs = [];   // one per group, also pushed into nodes (hub:true)
    const pulses = []; // { a, b, spine, gi, period, phase } — rebuilt in layout(), a/b are LIVE node refs
    const pings = [];  // { node, startedAt } — one-shot, self-pruning; node ref (not x/y) so it tracks drift

    function projectsForTech(label) {
      const norm = String(label).toLowerCase();
      const out = [];
      for (let i = 0; i < projects.length; i++) {
        const st = Array.isArray(projects[i].stack) ? projects[i].stack : [];
        for (let j = 0; j < st.length; j++) {
          if (String(st[j]).toLowerCase() === norm) { out.push(projects[i].name); break; }
        }
      }
      return out;
    }

    let totalTools = 0;
    groups.forEach(function (g, gi) {
      const items = Array.isArray(g.items) ? g.items : [];
      const hub = { label: g.k || "", gi: gi, hub: true, count: items.length, projects: [], bx: 0, by: 0, x: 0, y: 0, phase: gi * 1.7, tw: gi * 0.9 };
      hubs.push(hub);
      nodes.push(hub);
      items.forEach(function (label, ti) {
        totalTools++;
        nodes.push({
          label: label, gi: gi, hub: false,
          projects: projectsForTech(label),
          // base + current positions filled by layout()
          bx: 0, by: 0, x: 0, y: 0,
          ti: ti, count: items.length,
          phase: (gi * 2.1 + ti * 0.9), tw: (gi + ti) * 0.7,
        });
      });
    });

    // ── Canvas sizing ─────────────────────────────────────────────────────
    let dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    let cssW = 0, cssH = 0;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(2, rect.width);
      cssH = Math.max(2, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    }

    // Deterministic layout — domains on an ellipse, tools orbiting each hub.
    function layout() {
      if (cssW < 2 || cssH < 2) return;
      const cx = cssW / 2, cy = cssH / 2;
      const rx = cssW * RING_RX_FACTOR, ry = cssH * RING_RY_FACTOR;
      const clusterR = Math.min(cssW, cssH) * CLUSTER_R_FACTOR;
      const G = Math.max(1, groups.length);
      hubs.forEach(function (hub, gi) {
        const a = (gi / G) * TAU + LAYOUT_ANGLE_OFFSET;
        hub.bx = cx + Math.cos(a) * rx;
        hub.by = cy + Math.sin(a) * ry;
      });
      // tools around their hub
      let ni = 0;
      nodes.forEach(function (n) {
        if (n.hub) return;
        const hub = hubs[n.gi];
        const cnt = Math.max(1, n.count);
        // spread tools on a ring around the hub, radius wobbled per-index so it
        // doesn't read as a rigid circle.
        const a = (n.ti / cnt) * TAU + n.gi * 1.3;
        const wob = 0.66 + ((n.ti * 37) % 11) / 11 * 0.5;
        n.bx = hub.bx + Math.cos(a) * clusterR * wob;
        n.by = hub.by + Math.sin(a) * clusterR * wob * 0.92;
        // keep inside the stage with a margin
        n.bx = clamp(n.bx, 14, cssW - 14);
        n.by = clamp(n.by, 40, cssH - 30);
        ni++;
      });

      // Rebuild the pulse list against the (possibly resized) line set.
      // Deterministic per-line phase offset (hashed from index) so pulses
      // desync from each other without Math.random() — keeps layout()
      // reproducible/pure like the rest of this function. Entries hold LIVE
      // references to hub/node objects (not x/y copies), so p.a.x/p.b.x etc.
      // in the draw step always read current drifted positions.
      pulses.length = 0;
      for (let i = 0; i < hubs.length; i++) {
        const a = hubs[i], b = hubs[(i + 1) % hubs.length];
        const period = PULSE_SPINE_PERIOD_MIN + ((i * 977) % (PULSE_SPINE_PERIOD_MAX - PULSE_SPINE_PERIOD_MIN));
        pulses.push({ a: a, b: b, spine: true, gi: -1, period: period, phase: (i * 613) % period });
      }
      let pulseI = 0;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.hub) continue;
        const hub = hubs[n.gi];
        const period = PULSE_SPOKE_PERIOD_MIN + ((pulseI * 811) % (PULSE_SPOKE_PERIOD_MAX - PULSE_SPOKE_PERIOD_MIN));
        pulses.push({ a: hub, b: n, spine: false, gi: n.gi, period: period, phase: (pulseI * 349) % period });
        pulseI++;
      }
    }

    resize();
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    if (resizeObserver) resizeObserver.observe(canvas);
    else window.addEventListener("resize", resize);

    function readVar(name, fallback) {
      const cs = getComputedStyle(document.documentElement);
      const val = cs.getPropertyValue(name).trim();
      if (!val) return fallback;
      const parts = val.split(/\s+/).map(function (v) { return parseInt(v, 10); });
      if (parts.length !== 3 || parts.some(function (v) { return isNaN(v); })) return fallback;
      return parts;
    }

    // ── Interaction state ─────────────────────────────────────────────────
    let pointerX = -9999, pointerY = -9999, pointerInside = false;
    let hovered = null;     // node under the cursor
    let pinned = null;      // node locked by click
    let lastActivityAt = (typeof performance !== "undefined" ? performance.now() : 0);

    function localCoords(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      return [clientX - rect.left, clientY - rect.top];
    }

    function pickNodeAt(x, y) {
      let best = null, bestD = HOVER_RADIUS_PX * HOVER_RADIUS_PX;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const dx = n.x - x, dy = n.y - y;
        const d = dx * dx + dy * dy;
        // hubs get a slightly larger pick radius (they're bigger)
        const pad = n.hub ? 8 : 0;
        const lim = (HOVER_RADIUS_PX + pad) * (HOVER_RADIUS_PX + pad);
        if (d < lim && d < bestD) { bestD = d; best = n; }
      }
      return best;
    }

    function focusGroupIndex() {
      const f = pinned || hovered;
      return f ? f.gi : -1;
    }

    function onPointerMove(e) {
      const c = localCoords(e.clientX, e.clientY);
      pointerX = c[0]; pointerY = c[1];
      pointerInside = true;
      lastActivityAt = performance.now();
      if (hint) hint.classList.remove("is-visible");
    }
    function onPointerLeave() {
      pointerInside = false;
      pointerX = -9999; pointerY = -9999;
    }
    function onPointerDown(e) {
      const c = localCoords(e.clientX, e.clientY);
      pointerX = c[0]; pointerY = c[1];
      pointerInside = true;
      lastActivityAt = performance.now();
      const hit = pickNodeAt(pointerX, pointerY);
      const wasPinned = pinned;
      // Toggle pin: same node unpins; a different node repins; empty space clears.
      if (hit && pinned && hit === pinned) pinned = null;
      else pinned = hit || null;
      // Ping only on a NEW pin (never on unpin/no-op) — unpinning stays quiet.
      // Stores a NODE REFERENCE (not an x/y snapshot) so the ring tracks the
      // node's ongoing idle drift instead of visibly detaching from it mid-animation.
      if (pinned && pinned !== wasPinned && !prefersReducedMotion) {
        pings.push({ node: pinned, startedAt: performance.now() });
        if (pings.length > 3) pings.shift(); // hard cap — never unbounded
      }
      if (pinned && typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(10); } catch (err) { /* opportunistic */ }
      }
      updateReadout();
    }

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointerdown", onPointerDown);

    // Keyboard escape clears the pin (a11y — pinned state shouldn't trap).
    function onKeyDown(e) { if (e.key === "Escape" && pinned) { pinned = null; updateReadout(); } }
    document.addEventListener("keydown", onKeyDown);

    // ── Readout (bottom bar) — context-sensitive, honest copy ─────────────
    function defaultReadout() {
      const unit = plural(totalTools, labels.domain_one, labels.domain_few, labels.domain_many);
      return '<span class="cc-ro-num">' + totalTools + '</span> <span class="cc-ro-unit">' + escapeHtml(unit) + '</span>' +
             '<span class="cc-ro-sep">·</span><span class="cc-ro-unit">' + groups.length + ' ' + escapeHtml(labels.domains_word) + '</span>';
    }
    function nodeReadout(n) {
      if (n.hub) {
        const unit = plural(n.count, labels.domain_one, labels.domain_few, labels.domain_many);
        return '<span class="cc-ro-dom">' + escapeHtml(n.label) + '</span><span class="cc-ro-sep">·</span>' +
               '<span class="cc-ro-unit">' + n.count + ' ' + escapeHtml(unit) + '</span>';
      }
      const dom = hubs[n.gi] ? hubs[n.gi].label : "";
      let tail;
      if (n.projects && n.projects.length) {
        tail = '<span class="cc-ro-sep">·</span><span class="cc-ro-unit">' + escapeHtml(labels.used_in) + '</span> ' +
               '<span class="cc-ro-proj">' + n.projects.map(escapeHtml).join(' · ') + '</span>';
      } else {
        tail = '<span class="cc-ro-sep">·</span><span class="cc-ro-unit">' + escapeHtml(labels.core) + '</span>';
      }
      return '<span class="cc-ro-dom">' + escapeHtml(dom) + '</span><span class="cc-ro-sep">›</span>' +
             '<span class="cc-ro-name">' + escapeHtml(n.label) + '</span>' + tail;
    }
    function updateReadout() {
      if (!readout) return;
      const f = pinned || hovered;
      readout.classList.toggle("is-pinned", !!pinned);
      readout.innerHTML = f ? nodeReadout(f) : defaultReadout();
    }
    updateReadout();

    // Tooltip near the hovered node (crisp DOM text, not canvas).
    function updateTip() {
      if (!tip) return;
      const n = hovered;
      if (!n) { tip.classList.remove("is-on"); tip.setAttribute("aria-hidden", "true"); return; }
      if (tipName) tipName.textContent = n.label;
      if (tipDom) tipDom.textContent = n.hub ? "" : (hubs[n.gi] ? hubs[n.gi].label : "");
      tip.style.transform = "translate(" + n.x.toFixed(1) + "px, " + n.y.toFixed(1) + "px)";
      tip.classList.toggle("cc-tip-hub", !!n.hub);
      tip.classList.add("is-on");
      tip.setAttribute("aria-hidden", "false");
    }

    // ── Visibility / motion gates ─────────────────────────────────────────
    let isVisible = true;
    let documentVisible = !document.hidden;
    let io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.target === canvas) isVisible = e.isIntersecting; });
      }, { threshold: [0, 0.04] });
      io.observe(canvas);
    }
    function onVisibilityChange() { documentVisible = !document.hidden; }
    document.addEventListener("visibilitychange", onVisibilityChange);
    function onMotionChange() { prefersReducedMotion = computeReducedMotion(); }
    if (motionMedia.addEventListener) motionMedia.addEventListener("change", onMotionChange);
    else if (motionMedia.addListener) motionMedia.addListener(onMotionChange);

    // ── Render loop ───────────────────────────────────────────────────────
    let rafHandle = 0;
    let prevHovered = null;
    let focusT = 0; // eased 0..1 toward "something is focused" — see tick()

    function positionsTick(now) {
      // Update current positions from base + idle drift.
      const drift = prefersReducedMotion ? 0 : 1;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const amp = n.hub ? DRIFT_AMP_HUB : DRIFT_AMP_TECH;
        n.x = n.bx + Math.sin(now * DRIFT_SPEED + n.phase) * amp * drift;
        n.y = n.by + Math.cos(now * DRIFT_SPEED * 0.82 + n.phase) * amp * drift;
      }
    }

    function tick(now) {
      rafHandle = requestAnimationFrame(tick);
      if (!isVisible || !documentVisible) return;

      positionsTick(now);

      // Hover pick (cheap — runs every frame so it tracks drifting nodes).
      hovered = pointerInside ? pickNodeAt(pointerX, pointerY) : null;
      if (hovered !== prevHovered) {
        prevHovered = hovered;
        if (canvas) canvas.style.cursor = hovered ? "pointer" : "crosshair";
        updateReadout();
        updateTip();
      } else if (hovered) {
        updateTip(); // keep tooltip glued to the drifting node
      }

      // Idle hint.
      if (hint && !hovered && !pinned && now - lastActivityAt > IDLE_AFTER_MS) {
        hint.classList.add("is-visible");
      }

      const accent = readVar("--accent-rgb", [217, 119, 87]);
      const accent2 = readVar("--accent-2-rgb", [200, 155, 94]);
      const focusGi = focusGroupIndex();
      const focusNode = pinned || hovered;

      // Ease focus power-up/down over ~150-250ms instead of an instant alpha
      // cut, so clusters visibly "power up"/"power down" rather than snapping.
      // Reduced motion: snap instantly (0 lerp) — identical to prior behavior.
      const focusTargetOn = focusNode ? 1 : 0;
      focusT = prefersReducedMotion ? focusTargetOn : focusT + (focusTargetOn - focusT) * 0.12;

      ctx.clearRect(0, 0, cssW, cssH);

      // 1) Stack spine — hub-to-hub ring. Faint; brightens subtly when nothing
      //    is focused so the full-stack shape reads at rest.
      const spineBase = focusGi === -1 ? 0.16 : 0.06;
      ctx.lineWidth = 1;
      for (let i = 0; i < hubs.length; i++) {
        const a = hubs[i], b = hubs[(i + 1) % hubs.length];
        ctx.strokeStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + "," + spineBase.toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // 1.5) Traveling signal pulses — always-on network motion, independent of
      //      hover/pin, so the map reads "alive" before anyone touches it. Painted
      //      on top of the static spine/spoke strokes but underneath node circles
      //      (step 3) so a pulse visually "arrives" at a node and disappears
      //      behind its halo. Skipped entirely under reduced motion — the
      //      spine/spokes already read fine fully static, no partial state to fake.
      if (!prefersReducedMotion) {
        for (let i = 0; i < pulses.length; i++) {
          const p = pulses[i];
          const t = ((now + p.phase) % p.period) / p.period; // 0..1 loop progress
          const focusedCluster = (focusGi === -1) || (p.gi === -1) || (p.gi === focusGi);
          const boost = (focusGi !== -1 && p.gi === focusGi) ? PULSE_FOCUS_BOOST : 1;
          const baseA = (p.spine ? PULSE_ALPHA_SPINE : PULSE_ALPHA_SPOKE) * (focusedCluster ? 1 : DIM_ALPHA) * boost;
          for (let s = 0; s < PULSE_TRAIL_STEPS; s++) {
            const tt = t - s * PULSE_TRAIL_GAP;
            if (tt < 0 || tt > 1) continue;
            const px = p.a.x + (p.b.x - p.a.x) * tt;
            const py = p.a.y + (p.b.y - p.a.y) * tt;
            const fall = 1 - s / PULSE_TRAIL_STEPS;        // trail fade-out
            const edge = Math.sin(tt * Math.PI);             // fade in/out at line ends
            const a2 = baseA * fall * edge;
            if (a2 <= 0.01) continue;
            const r2 = PULSE_R * (1 - s * 0.22) * (0.85 + edge * 0.15);
            ctx.fillStyle = "rgba(255, 240, 220, " + a2.toFixed(3) + ")";
            ctx.beginPath(); ctx.arc(px, py, r2, 0, TAU); ctx.fill();
          }
        }
      }

      // 2) Spokes — each tool to its hub. Focused cluster glows; others dim.
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n.hub) continue;
        const hub = hubs[n.gi];
        const focusedCluster = (focusGi === -1) || (n.gi === focusGi);
        const base = focusedCluster ? 0.30 : 0.05;
        ctx.strokeStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + "," + base.toFixed(3) + ")";
        ctx.lineWidth = focusedCluster && n.gi === focusGi ? 1.1 : 0.7;
        ctx.beginPath(); ctx.moveTo(hub.x, hub.y); ctx.lineTo(n.x, n.y); ctx.stroke();
      }

      // 2.5) One-shot ping ring(s) on pin — click's felt payoff beyond the
      //      existing static pinned-ring (drawn next, in step 3). Deliberately
      //      uses the accent color: this is the one "important accent hit"
      //      moment here, everything else (pulses, node cores) stays warm-white/
      //      accent-2. Self-pruning array — hard-capped at spawn (onPointerDown)
      //      and each ring removes itself here on expiry. Reads pg.node.x/y live
      //      (not a snapshot) so the ring tracks the node's idle drift instead of
      //      visibly detaching from it.
      if (pings.length) {
        for (let i = pings.length - 1; i >= 0; i--) {
          const pg = pings[i];
          const t = (now - pg.startedAt) / PING_DURATION_MS;
          if (t >= 1) { pings.splice(i, 1); continue; }
          const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic — matches --e-entrance feel
          const rr = 6 + eased * PING_MAX_R;
          const aa = (1 - t) * 0.55;
          ctx.strokeStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + "," + aa.toFixed(3) + ")";
          ctx.lineWidth = 1.4 * (1 - t * 0.5);
          ctx.beginPath(); ctx.arc(pg.node.x, pg.node.y, rr, 0, TAU); ctx.stroke();
        }
      }

      // 3) Nodes.
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const focusedCluster = (focusGi === -1) || (n.gi === focusGi);
        const isFocusNode = n === focusNode;
        const tw = prefersReducedMotion ? 1 : (0.82 + Math.sin(now * TWINKLE_SPEED + n.tw) * 0.18);
        let r = (n.hub ? HUB_R : TECH_R) * tw;
        if (isFocusNode) r *= (1 + (FOCUS_GROW - 1) * focusT);
        const dim = focusedCluster ? 1 : (1 - (1 - DIM_ALPHA) * focusT);

        // soft halo
        const haloA = (n.hub ? 0.22 : 0.16) * dim * (isFocusNode ? 1.8 : 1);
        ctx.fillStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + "," + haloA.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.8, 0, TAU); ctx.fill();

        // mid ring (accent-2 for warmth on hubs / focus)
        if (n.hub || isFocusNode) {
          ctx.fillStyle = "rgba(" + accent2[0] + "," + accent2[1] + "," + accent2[2] + "," + (0.5 * dim).toFixed(3) + ")";
          ctx.beginPath(); ctx.arc(n.x, n.y, r * 1.7, 0, TAU); ctx.fill();
        }

        // core
        const coreA = (n.hub ? 0.95 : 0.8) * (focusedCluster ? 1 : 0.5);
        ctx.fillStyle = isFocusNode
          ? "rgba(255, 244, 230, " + coreA.toFixed(3) + ")"
          : "rgba(255, 238, 220, " + coreA.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, TAU); ctx.fill();

        // pinned ring
        if (n === pinned) {
          ctx.strokeStyle = "rgba(" + accent[0] + "," + accent[1] + "," + accent[2] + ",0.9)";
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.arc(n.x, n.y, r + 6, 0, TAU); ctx.stroke();
        }
      }

      // 4) Hub labels — always faintly present so the six domains are legible
      //    even before any interaction. The focused domain reads full strength.
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "600 11px " + "ui-monospace, 'JetBrains Mono', monospace";
      for (let i = 0; i < hubs.length; i++) {
        const h = hubs[i];
        const focusedCluster = (focusGi === -1) || (h.gi === focusGi);
        const a = focusedCluster ? 0.85 : 0.28;
        ctx.fillStyle = "rgba(255, 240, 220, " + a.toFixed(3) + ")";
        const ly = h.y - (HUB_R * 2.4) - 8;
        ctx.fillText(String(h.label).toUpperCase(), h.x, ly);
      }
    }

    // Boot.
    lastActivityAt = (typeof performance !== "undefined" ? performance.now() : 0);
    rafHandle = requestAnimationFrame(tick);

    return {
      dispose: function () {
        if (rafHandle) cancelAnimationFrame(rafHandle);
        rafHandle = 0;
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        canvas.removeEventListener("pointerdown", onPointerDown);
        document.removeEventListener("keydown", onKeyDown);
        if (resizeObserver) resizeObserver.disconnect();
        else window.removeEventListener("resize", resize);
        if (io) io.disconnect();
        document.removeEventListener("visibilitychange", onVisibilityChange);
        if (motionMedia.removeEventListener) motionMedia.removeEventListener("change", onMotionChange);
        else if (motionMedia.removeListener) motionMedia.removeListener(onMotionChange);
      },
    };
  }

  window.CursorConstellation = { create: create };
})();
