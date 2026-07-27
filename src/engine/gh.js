// gh.js — live GitHub telemetry for the About section.
//
// ════════════════════════════════════════════════════════════════════════════
// WHY THIS EXISTS
// ─────────────────────────────────────────────────────────────────────────────
// About used to render a contribution graph built by `buildContribCells()`: a
// deterministic pseudo-random pattern, seeded from row/column indices, with a
// timer flashing random cells to "level 4" every couple of seconds to look
// live. It was decoration shaped exactly like a factual claim — a GitHub
// activity graph that had never touched GitHub. On a page whose central
// argument is "I own quality", that is the worst possible thing to fabricate,
// and it is the first thing a technical reader would check.
//
// This fetches the real thing instead. Public REST, no token, no auth:
//   GET /users/:user                 → public_repos, followers, created_at
//   GET /users/:user/events/public   → up to ~90 recent public events
//
// WHAT THE API CAN AND CANNOT GIVE US
// ─────────────────────────────────────────────────────────────────────────────
// The actual contribution calendar is GraphQL-only and needs an authenticated
// token, which a static site cannot hold without publishing it. So the strip is
// built from the public events feed instead: events bucketed by day over the
// last 28 days. That is genuinely less complete than the calendar — it misses
// private work and anything older than ~90 events — so the label says
// "публичная активность", not "contributions". An honest smaller claim beats an
// impressive fabricated one.
//
// FAILURE IS SILENT AND HONEST
// ─────────────────────────────────────────────────────────────────────────────
// Unauthenticated GitHub allows 60 requests/hour per IP. That is per VISITOR
// IP, so a normal reader will never come near it — but corporate NATs, blocked
// domains and offline reading all exist. On any failure this resolves to null
// and About falls back to a plain text line. It does NOT fall back to the old
// synthetic graph: a fabricated graph is exactly what this replaced.
// ════════════════════════════════════════════════════════════════════════════
(function () {
  "use strict";

  var USER = "SamandarMansurkhodjaev2713";
  var DAYS = 28;
  var CACHE_KEY = "sm_gh_v1";
  // Ten minutes. Long enough that clicking through to a landing and back does
  // not spend another pair of requests; short enough that "last push: 2h ago"
  // is never meaningfully stale.
  var CACHE_TTL_MS = 10 * 60 * 1000;
  var TIMEOUT_MS = 6000;

  function readCache() {
    try {
      var raw = window.sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj.at !== "number") return null;
      if (Date.now() - obj.at > CACHE_TTL_MS) return null;
      return obj.data;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try { window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: data })); }
    catch (e) { /* private mode / quota — the fetch still worked, just uncached */ }
  }

  function get(url) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : 0;
    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) {
      if (timer) window.clearTimeout(timer);
      if (!r.ok) throw new Error("gh " + r.status);
      return r.json();
    });
  }

  // Bucket events into DAYS daily counts, oldest first, then map counts to the
  // 0–4 levels the strip renders. Thresholds are deliberately low (1 event is
  // already level 1): this is a personal account, not a monorepo with CI bots,
  // and a scale calibrated for hundreds of daily events would render every real
  // day as blank.
  function buildDays(events) {
    var startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    var counts = new Array(DAYS).fill(0);
    for (var i = 0; i < events.length; i++) {
      var t = Date.parse(events[i].created_at);
      if (!t) continue;
      var dayIdx = DAYS - 1 - Math.floor((startOfToday.getTime() - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
      if (dayIdx >= 0 && dayIdx < DAYS) counts[dayIdx] += 1;
    }
    return counts.map(function (n) {
      var level = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4;
      return { n: n, level: level };
    });
  }

  // Most recent push, as a coarse relative age. Coarse on purpose: "14 минут
  // назад" invites the reader to watch it change, "сегодня" just tells them the
  // account is alive.
  function lastPush(events) {
    for (var i = 0; i < events.length; i++) {
      if (events[i].type === "PushEvent") return Date.parse(events[i].created_at) || null;
    }
    return events.length ? (Date.parse(events[0].created_at) || null) : null;
  }

  // Distinct repos touched, most recent first — the honest version of the
  // hand-written "recent work" list.
  function recentRepos(events, limit) {
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < events.length && out.length < limit; i++) {
      var e = events[i];
      var name = e.repo && e.repo.name ? String(e.repo.name).split("/").pop() : null;
      if (!name || seen[name]) continue;
      seen[name] = true;
      out.push({ name: name, type: e.type, at: Date.parse(e.created_at) || null });
    }
    return out;
  }

  var inflight = null;

  function load() {
    var cached = readCache();
    if (cached) return Promise.resolve(cached);
    if (inflight) return inflight;
    if (typeof fetch !== "function") return Promise.resolve(null);

    inflight = Promise.all([
      get("https://api.github.com/users/" + USER),
      get("https://api.github.com/users/" + USER + "/events/public?per_page=100"),
    ]).then(function (res) {
      var user = res[0] || {};
      var events = Array.isArray(res[1]) ? res[1] : [];
      var data = {
        user: USER,
        repos: typeof user.public_repos === "number" ? user.public_repos : null,
        followers: typeof user.followers === "number" ? user.followers : null,
        since: user.created_at ? Date.parse(user.created_at) : null,
        events: events.length,
        days: buildDays(events),
        lastPush: lastPush(events),
        recent: recentRepos(events, 3),
      };
      writeCache(data);
      inflight = null;
      return data;
    }).catch(function () {
      inflight = null;
      return null; // caller falls back to static copy — never to a fake graph
    });
    return inflight;
  }

  window.__SM_GH = { load: load, USER: USER, DAYS: DAYS };
})();
