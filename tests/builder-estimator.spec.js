"use strict";

const { test } = require("@playwright/test");
const assert = require("node:assert/strict");
const estimator = require("../src/engine/builder-estimator.js");

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

const CONTRACT_KEYS = ["complexity", "layers", "nextStepId", "proofScope", "riskIds", "stagePlanIds"];
const PROOF_KEYS = ["build", "ship", "verify"];
const DRIVER_MASK_COUNT = 1 << estimator.DRIVER_IDS.length;
const READINESS_MASK_COUNT = 1 << estimator.READINESS_IDS.length;
const BAND_RANK = new Map(estimator.COMPLEXITY_BANDS.map((id, index) => [id, index]));
const SCORE_COUNT = estimator.TYPE_IDS.length * estimator.STAGE_IDS.length * DRIVER_MASK_COUNT * READINESS_MASK_COUNT;
const scoreMatrix = new Uint8Array(SCORE_COUNT);
let matrixReady = false;

function idsFromMask(ids, mask) {
  return ids.filter((_id, index) => mask & (1 << index));
}

function matrixIndex(typeIndex, stageIndex, driverMask, readinessMask) {
  return (((typeIndex * estimator.STAGE_IDS.length + stageIndex) * DRIVER_MASK_COUNT + driverMask)
    * READINESS_MASK_COUNT) + readinessMask;
}

function assertUniqueKnownIds(actual, allowed, label, allowEmpty = false) {
  assert.equal(Array.isArray(actual), true, `${label}: array`);
  if (!allowEmpty) assert.ok(actual.length > 0, `${label}: non-empty`);
  assert.equal(new Set(actual).size, actual.length, `${label}: unique`);
  actual.forEach((id) => assert.ok(allowed.includes(id), `${label}: known id ${id}`));
}

function expectedBand(score) {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "moderate";
  return "low";
}

function assertContract(result, caseId) {
  assert.deepEqual(Object.keys(result).sort(), CONTRACT_KEYS, `${caseId}: exact public contract`);
  assert.equal(Number.isInteger(result.complexity.score), true, `${caseId}: integer complexity score`);
  assert.ok(result.complexity.score >= 0 && result.complexity.score <= 100, `${caseId}: bounded complexity score`);
  assert.equal(result.complexity.band, expectedBand(result.complexity.score), `${caseId}: score matches band`);
  assert.ok(BAND_RANK.has(result.complexity.band), `${caseId}: known complexity band`);

  assertUniqueKnownIds(result.stagePlanIds, estimator.STAGE_PLAN_IDS, `${caseId}: stage plan`);
  assertUniqueKnownIds(result.riskIds, estimator.RISK_IDS, `${caseId}: risks`, true);
  assert.ok(estimator.NEXT_STEP_IDS.includes(result.nextStepId), `${caseId}: known next step`);

  assert.equal(Array.isArray(result.layers), true, `${caseId}: layers array`);
  assert.deepEqual(result.layers.map((layer) => layer.id), estimator.LAYER_IDS, `${caseId}: stable layer topology`);
  result.layers.forEach((layer) => {
    assert.deepEqual(Object.keys(layer).sort(), ["active", "componentIds", "id"], `${caseId}/${layer.id}: layer contract`);
    assert.equal(typeof layer.active, "boolean", `${caseId}/${layer.id}: active flag`);
    assertUniqueKnownIds(
      layer.componentIds,
      estimator.COMPONENT_IDS,
      `${caseId}/${layer.id}: components`,
      !layer.active
    );
    if (!layer.active) assert.deepEqual(layer.componentIds, [], `${caseId}/${layer.id}: inactive layer is empty`);
  });

  assert.deepEqual(Object.keys(result.proofScope).sort(), PROOF_KEYS, `${caseId}: proof scope contract`);
  PROOF_KEYS.forEach((key) => {
    assertUniqueKnownIds(result.proofScope[key], estimator.PROOF_ITEM_IDS, `${caseId}: proof ${key}`);
  });

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /(?:budget|price|cost|currency|usd|\$|weeks?|timeline|duration|estimateBandId)/i, `${caseId}: no commercial or duration output`);
}

function populateMatrix() {
  if (matrixReady) return;
  estimator.TYPE_IDS.forEach((typeId, typeIndex) => {
    estimator.STAGE_IDS.forEach((stageId, stageIndex) => {
      for (let driverMask = 0; driverMask < DRIVER_MASK_COUNT; driverMask += 1) {
        for (let readinessMask = 0; readinessMask < READINESS_MASK_COUNT; readinessMask += 1) {
          const result = estimator.estimateProject({
            typeId,
            stageId,
            driverIds: idsFromMask(estimator.DRIVER_IDS, driverMask),
            readinessIds: idsFromMask(estimator.READINESS_IDS, readinessMask),
          });
          scoreMatrix[matrixIndex(typeIndex, stageIndex, driverMask, readinessMask)] = result.complexity.score;
        }
      }
    });
  });
  matrixReady = true;
}

function scoreAt(typeIndex, stageIndex, driverMask, readinessMask) {
  populateMatrix();
  return scoreMatrix[matrixIndex(typeIndex, stageIndex, driverMask, readinessMask)];
}

test("scope preview exposes only the locale-neutral decision contract", () => {
  assert.equal(estimator.VERSION, "2026.3");
  const result = estimator.estimateProject({});
  assertContract(result, "fallback");

  const invalid = estimator.estimateProject({
    typeId: "unknown",
    stageId: "unknown",
    driverIds: ["unknown"],
    readinessIds: ["unknown"],
  });
  assert.deepEqual(invalid, result, "invalid values fall back without leaking into output");
});

test("every type, stage, driver and readiness combination is valid and deterministic", () => {
  estimator.TYPE_IDS.forEach((typeId, typeIndex) => {
    estimator.STAGE_IDS.forEach((stageId, stageIndex) => {
      for (let driverMask = 0; driverMask < DRIVER_MASK_COUNT; driverMask += 1) {
        const driverIds = idsFromMask(estimator.DRIVER_IDS, driverMask);
        for (let readinessMask = 0; readinessMask < READINESS_MASK_COUNT; readinessMask += 1) {
          const readinessIds = idsFromMask(estimator.READINESS_IDS, readinessMask);
          const config = { typeId, stageId, driverIds, readinessIds };
          const caseId = `${typeId}/${stageId}/d${driverMask}/r${readinessMask}`;
          const first = estimator.estimateProject(config);
          const second = estimator.estimateProject(config);
          assertContract(first, caseId);
          assert.deepEqual(second, first, `${caseId}: repeatable result`);
          scoreMatrix[matrixIndex(typeIndex, stageIndex, driverMask, readinessMask)] = first.complexity.score;
        }
      }
    });
  });
  matrixReady = true;
});

test("complexity is monotonic across drivers, maturity and readiness gaps", () => {
  for (let typeIndex = 0; typeIndex < estimator.TYPE_IDS.length; typeIndex += 1) {
    for (let stageIndex = 0; stageIndex < estimator.STAGE_IDS.length; stageIndex += 1) {
      for (let driverMask = 0; driverMask < DRIVER_MASK_COUNT; driverMask += 1) {
        for (let readinessMask = 0; readinessMask < READINESS_MASK_COUNT; readinessMask += 1) {
          const base = scoreAt(typeIndex, stageIndex, driverMask, readinessMask);

          for (let driverIndex = 0; driverIndex < estimator.DRIVER_IDS.length; driverIndex += 1) {
            const driverBit = 1 << driverIndex;
            if (driverMask & driverBit) continue;
            const withDriver = scoreAt(typeIndex, stageIndex, driverMask | driverBit, readinessMask);
            assert.ok(withDriver >= base, `driver monotonic at t${typeIndex}/s${stageIndex}/d${driverMask}/r${readinessMask}/+${driverIndex}`);
          }

          for (let readinessIndex = 0; readinessIndex < estimator.READINESS_IDS.length; readinessIndex += 1) {
            const readinessBit = 1 << readinessIndex;
            if (readinessMask & readinessBit) continue;
            const withMoreReadiness = scoreAt(typeIndex, stageIndex, driverMask, readinessMask | readinessBit);
            assert.ok(withMoreReadiness <= base, `readiness monotonic at t${typeIndex}/s${stageIndex}/d${driverMask}/r${readinessMask}/+${readinessIndex}`);
          }

          if (stageIndex < estimator.STAGE_IDS.length - 1) {
            const moreMature = scoreAt(typeIndex, stageIndex + 1, driverMask, readinessMask);
            assert.ok(moreMature >= base, `maturity monotonic at t${typeIndex}/s${stageIndex}/d${driverMask}/r${readinessMask}`);
          }
        }
      }
    }
  }
});

test("semantic sets are canonical and returned data is isolated between calls", () => {
  const canonical = estimator.estimateProject({
    typeId: "automation",
    stageId: "mvp",
    driverIds: ["ai", "load", "integrations"],
    readinessIds: ["brief", "access", "design"],
  });
  const shuffled = estimator.estimateProject({
    typeId: "automation",
    stageId: "mvp",
    driverIds: ["load", "ai", "integrations", "ai", "unknown"],
    readinessIds: ["design", "brief", "access", "brief", "unknown"],
  });
  assert.deepEqual(shuffled, canonical, "order, duplicates and unknown ids do not change the decision");

  canonical.layers[0].componentIds.push("mutated");
  canonical.stagePlanIds.push("mutated");
  const fresh = estimator.estimateProject({
    typeId: "automation",
    stageId: "mvp",
    driverIds: ["ai", "load", "integrations"],
    readinessIds: ["brief", "access", "design"],
  });
  assert.equal(fresh.layers[0].componentIds.includes("mutated"), false, "layer data is fresh");
  assert.equal(fresh.stagePlanIds.includes("mutated"), false, "stage data is fresh");

  const automation = estimator.estimateProject({ typeId: "automation", stageId: "mvp" });
  assert.equal(automation.layers.find((layer) => layer.id === "ai").active, false, "automation does not invent AI");
  const aiAutomation = estimator.estimateProject({ typeId: "automation", stageId: "mvp", driverIds: ["ai"] });
  assert.equal(aiAutomation.layers.find((layer) => layer.id === "ai").active, true, "AI driver activates the AI layer");
});

test("next step follows readiness priority before technical discovery", () => {
  const allReady = estimator.READINESS_IDS.slice();
  const without = (id) => allReady.filter((candidate) => candidate !== id);

  assert.equal(estimator.estimateProject({ readinessIds: without("brief") }).nextStepId, "scope-clarification");
  assert.equal(estimator.estimateProject({ readinessIds: without("access") }).nextStepId, "dependency-access-review");
  assert.equal(estimator.estimateProject({ readinessIds: without("design") }).nextStepId, "critical-flow-alignment");
  assert.equal(estimator.estimateProject({ readinessIds: without("deadline") }).nextStepId, "scope-prioritization");
  assert.equal(
    estimator.estimateProject({ typeId: "ai", stageId: "production", driverIds: estimator.DRIVER_IDS, readinessIds: allReady }).nextStepId,
    "technical-discovery"
  );
  assert.equal(
    estimator.estimateProject({ typeId: "web", stageId: "prototype", readinessIds: allReady }).nextStepId,
    "scope-confirmation"
  );
});
