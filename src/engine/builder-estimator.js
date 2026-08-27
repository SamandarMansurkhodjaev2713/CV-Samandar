// builder-estimator.js — deterministic, locale-neutral project specification.
//
// The form deliberately does not calculate money or delivery dates: a short
// questionnaire cannot produce an honest commercial promise. It exposes only
// the decisions useful before discovery — composition, relative complexity,
// delivery stages, risks and the next concrete step.
(function exposeBuilderEstimator(root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.BUILDER_ESTIMATOR = api;
})(typeof window !== "undefined" ? window : globalThis, function createBuilderEstimator() {
  "use strict";

  var VERSION = "2026.3";
  var TYPE_IDS = ["web", "ai", "bot", "automation"];
  var STAGE_IDS = ["prototype", "mvp", "production"];
  var DRIVER_IDS = ["ai", "integrations", "auth", "payments", "realtime", "migration", "motion", "load"];
  var READINESS_IDS = ["brief", "access", "design", "deadline"];
  var COMPLEXITY_BANDS = ["low", "moderate", "high", "critical"];
  var LAYER_IDS = ["client", "logic", "ai", "data", "qa", "infra"];
  var COMPONENT_IDS = [
    "react-client", "telegram-client", "workflow-client",
    "node-api", "python-api", "workflow-engine",
    "llm", "retrieval", "evals",
    "postgres", "redis", "migration-pipeline",
    "acceptance", "test-design", "api-ui", "regression", "load-checks",
    "managed-deploy", "containers", "ci", "observability", "queue-cdn"
  ];
  var STAGE_PLAN_IDS = [
    "define", "prototype", "acceptance", "decision",
    "architecture", "build", "verify", "release", "audit", "handoff"
  ];
  var RISK_IDS = [
    "brief-gap", "access-gap", "design-gap", "deadline-gap",
    "ai-quality", "third-party", "payments", "realtime", "migration", "load"
  ];
  var NEXT_STEP_IDS = [
    "scope-clarification", "dependency-access-review", "critical-flow-alignment",
    "scope-prioritization", "technical-discovery", "scope-confirmation"
  ];
  var PROOF_ITEM_IDS = [
    "working-slice", "contracts", "data-path", "ai-evals",
    "acceptance", "test-design", "api-ui", "regression", "load-checks",
    "deploy", "monitoring", "handoff", "decision"
  ];

  var TYPE_BASE = { web: 5, ai: 13, bot: 6, automation: 7 };
  var STAGE_WEIGHT = { prototype: 0, mvp: 14, production: 28 };
  var DRIVER_WEIGHT = {
    ai: 8, integrations: 5, auth: 4, payments: 7,
    realtime: 7, migration: 8, motion: 4, load: 10
  };
  var READINESS_GAP_WEIGHT = { brief: 6, access: 5, design: 4, deadline: 3 };
  var STAGE_PLANS = {
    prototype: ["define", "prototype", "acceptance", "decision"],
    mvp: ["define", "architecture", "build", "verify", "release"],
    production: ["audit", "architecture", "build", "verify", "release", "handoff"]
  };
  var DRIVER_RISKS = {
    ai: "ai-quality", integrations: "third-party", payments: "payments",
    realtime: "realtime", migration: "migration", load: "load"
  };
  var READINESS_RISKS = {
    brief: "brief-gap", access: "access-gap", design: "design-gap", deadline: "deadline-gap"
  };

  function canonical(values, allowed) {
    var source = Array.isArray(values) ? values : [];
    return allowed.filter(function present(id) { return source.indexOf(id) !== -1; });
  }

  function bandFor(score) {
    if (score >= 70) return "critical";
    if (score >= 50) return "high";
    if (score >= 30) return "moderate";
    return "low";
  }

  function layer(id, active, componentIds) {
    return { id: id, active: !!active, componentIds: active ? componentIds.slice() : [] };
  }

  function buildLayers(typeId, stageId, driverIds) {
    var has = function has(id) { return driverIds.indexOf(id) !== -1; };
    var aiActive = typeId === "ai" || has("ai");
    var client = typeId === "bot" ? ["telegram-client"]
      : typeId === "automation" ? ["workflow-client"] : ["react-client"];
    var logic = typeId === "ai" ? ["python-api"]
      : typeId === "automation" ? ["workflow-engine", "node-api"] : ["node-api"];
    var data = ["postgres"];
    var qa = stageId === "prototype" ? ["acceptance"] : ["test-design", "api-ui", "regression"];
    var infra = stageId === "production" ? ["containers", "ci", "observability"] : ["managed-deploy"];

    if (has("realtime") || has("load")) data.push("redis");
    if (has("migration")) data.push("migration-pipeline");
    if (has("load")) {
      qa.push("load-checks");
      infra.push("queue-cdn");
    }

    return [
      layer("client", true, client),
      layer("logic", true, logic),
      layer("ai", aiActive, aiActive ? ["llm", "retrieval", "evals"] : []),
      layer("data", true, data),
      layer("qa", true, qa),
      layer("infra", true, infra)
    ];
  }

  function riskIdsFor(driverIds, missingReadiness) {
    var risks = missingReadiness.map(function readinessRisk(id) { return READINESS_RISKS[id]; });
    DRIVER_IDS.forEach(function addDriverRisk(id) {
      if (driverIds.indexOf(id) === -1 || !DRIVER_RISKS[id]) return;
      if (risks.indexOf(DRIVER_RISKS[id]) === -1) risks.push(DRIVER_RISKS[id]);
    });
    return risks;
  }

  function nextStepFor(typeId, stageId, driverIds, missingReadiness) {
    var priority = [
      ["brief", "scope-clarification"],
      ["access", "dependency-access-review"],
      ["design", "critical-flow-alignment"],
      ["deadline", "scope-prioritization"]
    ];
    for (var index = 0; index < priority.length; index += 1) {
      if (missingReadiness.indexOf(priority[index][0]) !== -1) return priority[index][1];
    }
    if (typeId === "ai" || stageId === "production" || driverIds.length >= 4) return "technical-discovery";
    return "scope-confirmation";
  }

  function proofScopeFor(stageId, driverIds) {
    var build = ["working-slice", "contracts", "data-path"];
    var verify = stageId === "prototype" ? ["acceptance"] : ["test-design", "api-ui", "regression"];
    var ship = stageId === "prototype" ? ["decision"] : ["deploy", "monitoring", "handoff"];
    if (driverIds.indexOf("ai") !== -1) build.push("ai-evals");
    if (driverIds.indexOf("load") !== -1) verify.push("load-checks");
    return { build: build, verify: verify, ship: ship };
  }

  function estimateProject(config) {
    config = config || {};
    var typeId = TYPE_IDS.indexOf(config.typeId) !== -1 ? config.typeId : "web";
    var stageId = STAGE_IDS.indexOf(config.stageId) !== -1 ? config.stageId : "mvp";
    var driverIds = canonical(config.driverIds, DRIVER_IDS);
    var readinessIds = canonical(config.readinessIds, READINESS_IDS);
    var missingReadiness = READINESS_IDS.filter(function missing(id) { return readinessIds.indexOf(id) === -1; });
    var score = TYPE_BASE[typeId] + STAGE_WEIGHT[stageId];

    driverIds.forEach(function addDriver(id) { score += DRIVER_WEIGHT[id]; });
    missingReadiness.forEach(function addGap(id) { score += READINESS_GAP_WEIGHT[id]; });
    score = Math.max(0, Math.min(100, Math.round(score)));

    return {
      complexity: { score: score, band: bandFor(score) },
      layers: buildLayers(typeId, stageId, driverIds),
      nextStepId: nextStepFor(typeId, stageId, driverIds, missingReadiness),
      proofScope: proofScopeFor(stageId, driverIds),
      riskIds: riskIdsFor(driverIds, missingReadiness),
      stagePlanIds: STAGE_PLANS[stageId].slice()
    };
  }

  return {
    VERSION: VERSION,
    TYPE_IDS: TYPE_IDS,
    STAGE_IDS: STAGE_IDS,
    DRIVER_IDS: DRIVER_IDS,
    READINESS_IDS: READINESS_IDS,
    COMPLEXITY_BANDS: COMPLEXITY_BANDS,
    LAYER_IDS: LAYER_IDS,
    COMPONENT_IDS: COMPONENT_IDS,
    STAGE_PLAN_IDS: STAGE_PLAN_IDS,
    RISK_IDS: RISK_IDS,
    NEXT_STEP_IDS: NEXT_STEP_IDS,
    PROOF_ITEM_IDS: PROOF_ITEM_IDS,
    estimateProject: estimateProject
  };
});
