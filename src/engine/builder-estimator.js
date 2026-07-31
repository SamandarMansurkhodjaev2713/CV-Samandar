// builder-estimator.js — locale-neutral, deterministic scope-preview model.
//
// The model intentionally returns a range, assumptions and confidence instead
// of pretending to produce a quote. It is shared by the UI, Contact handoff and
// Node tests, so display and delivery cannot silently diverge.
(function exposeBuilderEstimator(root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.BUILDER_ESTIMATOR = api;
})(typeof window !== "undefined" ? window : globalThis, function createBuilderEstimator() {
  "use strict";

  var VERSION = "2026.1";
  var TYPE_IDS = ["web", "ai", "bot", "automation"];
  var STAGE_IDS = ["prototype", "mvp", "production"];
  var DRIVER_IDS = ["ai", "integrations", "auth", "payments", "realtime", "migration", "motion", "load"];
  var READINESS_IDS = ["brief", "access", "design", "deadline"];

  var TYPES = {
    web: { factor: 1, client: ["Next.js / React"], logic: ["FastAPI / Node.js"] },
    ai: { factor: 1.28, client: ["Next.js / React"], logic: ["FastAPI"], forceAi: true },
    bot: { factor: 0.8, client: ["Telegram Bot API / Web App"], logic: ["Node.js / Python"] },
    automation: { factor: 0.92, client: ["Webhooks / n8n"], logic: ["Python / Node.js"] },
  };
  var STAGES = {
    prototype: { weeks: { min: 1, max: 2 }, budget: { min: 250, max: 700 }, confidenceBase: 0.82 },
    mvp: { weeks: { min: 2, max: 5 }, budget: { min: 700, max: 2000 }, confidenceBase: 0.76 },
    production: { weeks: { min: 6, max: 12 }, budget: { min: 2200, max: 6500 }, confidenceBase: 0.68 },
  };
  var DRIVER_WEIGHT = {
    ai: 0.24,
    integrations: 0.13,
    auth: 0.1,
    payments: 0.13,
    realtime: 0.16,
    migration: 0.16,
    motion: 0.12,
    load: 0.2,
  };
  var CAPABILITIES = {
    ai: "ai",
    integrations: "integrations",
    auth: "auth",
    payments: "payments",
    realtime: "realtime",
    migration: "migration",
    motion: "motion",
    load: "load",
  };

  function uniqueAllowed(values, allowed) {
    var seen = Object.create(null);
    return (Array.isArray(values) ? values : []).filter(function keep(value) {
      if (allowed.indexOf(value) === -1 || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function roundMoney(value) {
    if (value <= 1000) return Math.ceil(value / 50) * 50;
    return Math.ceil(value / 100) * 100;
  }

  function confidenceBand(score) {
    if (score >= 0.78) return "high";
    if (score >= 0.58) return "medium";
    return "low";
  }

  function candidateLayers(typeId, stageId, driverIds) {
    var type = TYPES[typeId];
    var has = function has(id) { return driverIds.indexOf(id) !== -1; };
    var aiActive = !!type.forceAi || has("ai");
    var data = ["PostgreSQL"];
    var infra = stageId === "production"
      ? ["Docker", "GitHub Actions", "Sentry"]
      : ["Managed deploy"];
    if (aiActive) data.push("pgvector");
    if (has("realtime") || has("load")) data.push("Redis");
    if (has("load")) infra.push("Queue / CDN");
    return [
      { id: "client", active: true, tech: type.client.slice() },
      { id: "logic", active: true, tech: type.logic.slice() },
      { id: "ai", active: aiActive, tech: aiActive ? ["Claude / OpenAI", "RAG / Evals"] : [] },
      { id: "data", active: true, tech: data },
      { id: "qa", active: true, tech: stageId === "prototype" ? ["Acceptance checks"] : ["Test design", "API / UI regression"] },
      { id: "infra", active: true, tech: infra },
    ];
  }

  function estimateProject(config) {
    config = config || {};
    var typeId = TYPE_IDS.indexOf(config.typeId) !== -1 ? config.typeId : "web";
    var stageId = STAGE_IDS.indexOf(config.stageId) !== -1 ? config.stageId : "mvp";
    var driverIds = uniqueAllowed(config.driverIds, DRIVER_IDS);
    var readinessIds = uniqueAllowed(config.readinessIds, READINESS_IDS);
    var type = TYPES[typeId];
    var stage = STAGES[stageId];
    var driverFactor = driverIds.reduce(function sum(total, id) { return total + DRIVER_WEIGHT[id]; }, 0);
    var missingReadiness = READINESS_IDS.filter(function missing(id) { return readinessIds.indexOf(id) === -1; });
    var uncertaintyFactor = missingReadiness.length * 0.055;
    var factor = type.factor * (1 + driverFactor + uncertaintyFactor);
    var weeks = {
      min: Math.max(1, Math.ceil(stage.weeks.min * factor)),
      max: Math.max(1, Math.ceil(stage.weeks.max * factor)),
    };
    var budget = {
      currency: "USD",
      min: roundMoney(stage.budget.min * factor),
      max: roundMoney(stage.budget.max * factor),
    };
    var confidenceScore = Math.max(0.35, Math.min(0.92,
      stage.confidenceBase + readinessIds.length * 0.035 - driverIds.length * 0.012
    ));
    var capabilities = driverIds.map(function mapCapability(id) { return CAPABILITIES[id]; });
    if (type.forceAi && capabilities.indexOf("ai") === -1) capabilities.unshift("ai");
    var layers = candidateLayers(typeId, stageId, driverIds);
    var thirdParty = driverIds.some(function thirdPartyFlag(id) {
      return id === "integrations" || id === "payments" || id === "ai";
    });

    return {
      estimateVersion: VERSION,
      typeId: typeId,
      stageId: stageId,
      driverIds: driverIds,
      readinessIds: readinessIds,
      capabilityIds: capabilities,
      assumptionIds: readinessIds.slice(),
      exclusionIds: missingReadiness,
      confidence: { score: Number(confidenceScore.toFixed(2)), band: confidenceBand(confidenceScore) },
      weeks: weeks,
      budget: budget,
      flags: {
        thirdParty: thirdParty,
        hosting: stageId !== "prototype",
        content: readinessIds.indexOf("brief") === -1,
      },
      layers: layers,
      proofScope: {
        build: capabilities.concat(["client", "logic", "data"]),
        verify: stageId === "prototype" ? ["acceptance"] : ["test-design", "api-ui", "regression"],
        ship: stageId === "prototype" ? ["demo"] : ["deploy", "monitoring", "rollback"],
      },
      estimateBandId: "custom-usd-" + budget.min + "-" + budget.max,
      timelineBandId: "weeks-" + weeks.min + "-" + weeks.max,
    };
  }

  return {
    VERSION: VERSION,
    TYPE_IDS: TYPE_IDS,
    STAGE_IDS: STAGE_IDS,
    DRIVER_IDS: DRIVER_IDS,
    READINESS_IDS: READINESS_IDS,
    estimateProject: estimateProject,
  };
});
