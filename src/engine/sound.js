// sound.js — the optional UI sound layer. OFF by default, always.
//
// A dimension almost no portfolio has: quiet, synthesized instrument sounds —
// a filtered tick on navigation clicks, a soft noise sweep when the fullscreen
// menu opens, a low thump when the reader crosses into a new section. Nothing
// is sampled and nothing is fetched: every sound is synthesized in ~10 lines
// of WebAudio, so the layer costs zero bytes of assets.
//
// Consent model: the visitor opts in via the SOUND toggle (fullscreen menu
// footer). The AudioContext is only CREATED on that first opt-in gesture —
// which also satisfies browser autoplay policies (ctx starts in a user
// gesture → never suspended). Preference persists in localStorage; the
// html.sm-sound class is the single visual source of truth for toggle state
// (CSS styles the dot off it — React never re-renders stale sound text).
(function () {
  "use strict";

  var KEY = "sm-sound";
  var ctx = null;
  var master = null;
  var on = false;

  function ensureCtx() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (e) { return false; }
  }

  // ── Synth voices ─────────────────────────────────────────────────────────
  function tick() {
    // Short filtered click — navigation taps. 45ms, band-passed noise burst.
    var t = ctx.currentTime;
    var buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2400; bp.Q.value = 6;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.22, t);
    src.connect(bp); bp.connect(g); g.connect(master);
    src.start(t);
  }

  function whoosh() {
    // Menu-open sweep — 260ms of noise through a falling lowpass.
    var t = ctx.currentTime;
    var buf = ctx.createBuffer(1, ctx.sampleRate * 0.28, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(280, t + 0.26);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t);
  }

  function thump() {
    // Section-crossing heartbeat — 70Hz sine, very quiet, fast decay.
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(74, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.14);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.09, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.18);
  }

  var VOICES = { tick: tick, whoosh: whoosh, thump: thump };

  function play(name) {
    if (!on || !ctx) return;
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* opportunistic */ } }
    var v = VOICES[name];
    if (v) { try { v(); } catch (e) { /* a failed blip must never break UI */ } }
  }

  function setOn(next) {
    on = !!next && ensureCtx();
    document.documentElement.classList.toggle("sm-sound", on);
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* opportunistic */ }
    if (on) play("tick"); // immediate confirmation beat
  }

  // ── Wiring — delegated, so React re-renders can't orphan listeners ──────
  document.addEventListener("click", function (e) {
    var toggle = e.target.closest && e.target.closest(".sound-toggle");
    if (toggle) { setOn(!on); return; }
    if (!on) return;
    if (e.target.closest && e.target.closest(".nav-menu-links a, .nav-links a, .nav-cta, .nav-menu-cta, .btn-primary, .dock a, .builder-opt")) {
      play("tick");
    }
    if (e.target.closest && e.target.closest(".nav-burger")) play("whoosh");
  }, true);

  window.addEventListener("sm:section", function () { play("thump"); });

  // Restore persisted preference. The AudioContext still needs a user gesture
  // on some browsers — resume lazily on the first play() attempt.
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* opportunistic */ }
  if (saved === "1") {
    // Defer creation to the first real interaction (autoplay policy).
    var arm = function () {
      window.removeEventListener("pointerdown", arm, true);
      window.removeEventListener("keydown", arm, true);
      setOn(true);
    };
    window.addEventListener("pointerdown", arm, true);
    window.addEventListener("keydown", arm, true);
    document.documentElement.classList.add("sm-sound"); // visual state now
  }

  window.SMSound = { play: play, set: setOn, isOn: function () { return on; } };
})();
