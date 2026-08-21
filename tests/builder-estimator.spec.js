"use strict";

const { test } = require("@playwright/test");
const assert = require("node:assert/strict");
const estimator = require("../src/engine/builder-estimator.js");

test("builder estimator exposes the approved lower 2026.2 entry bands", () => {
  assert.equal(estimator.VERSION, "2026.2");

  const expected = {
    prototype: { min: 150, max: 450 },
    mvp: { min: 450, max: 1400 },
    production: { min: 1500, max: 4200 },
  };

  for (const [stageId, budget] of Object.entries(expected)) {
    const result = estimator.estimateProject({
      typeId: "web",
      stageId,
      readinessIds: estimator.READINESS_IDS,
    });
    assert.deepEqual(
      { min: result.budget.min, max: result.budget.max },
      budget,
      `${stageId}: approved base band`
    );
  }
});

test("builder estimator covers every type, stage and driver combination safely", () => {
  const subsets = [];
  for (let mask = 0; mask < (1 << estimator.DRIVER_IDS.length); mask += 1) {
    subsets.push(estimator.DRIVER_IDS.filter((_id, index) => mask & (1 << index)));
  }
  for (const typeId of estimator.TYPE_IDS) {
    for (const stageId of estimator.STAGE_IDS) {
      for (const driverIds of subsets) {
        const result = estimator.estimateProject({ typeId, stageId, driverIds, readinessIds: estimator.READINESS_IDS });
        const caseId = `${typeId}/${stageId}/${driverIds.join(",") || "none"}`;
        assert.equal(Number.isFinite(result.weeks.min), true, `${caseId}: finite weeks.min`);
        assert.equal(Number.isFinite(result.weeks.max), true, `${caseId}: finite weeks.max`);
        assert.equal(Number.isFinite(result.budget.min), true, `${caseId}: finite budget.min`);
        assert.equal(Number.isFinite(result.budget.max), true, `${caseId}: finite budget.max`);
        assert.ok(result.weeks.min <= result.weeks.max, `${caseId}: ordered timeline`);
        assert.ok(result.budget.min <= result.budget.max, `${caseId}: ordered budget`);
        assert.ok(
          result.estimateBandId.includes(`${result.budget.min}-${result.budget.max}`),
          `${caseId}: stable estimate id`
        );
      }
    }
  }
});

test("adding complexity never lowers time or budget", () => {
  for (const typeId of estimator.TYPE_IDS) {
    for (const stageId of estimator.STAGE_IDS) {
      let drivers = [];
      let previous = estimator.estimateProject({ typeId, stageId, driverIds: drivers, readinessIds: estimator.READINESS_IDS });
      for (const driverId of estimator.DRIVER_IDS) {
        drivers = drivers.concat(driverId);
        const next = estimator.estimateProject({ typeId, stageId, driverIds: drivers, readinessIds: estimator.READINESS_IDS });
        const caseId = `${typeId}/${stageId}/+${driverId}`;
        assert.ok(next.weeks.min >= previous.weeks.min, `${caseId}: weeks.min is monotonic`);
        assert.ok(next.weeks.max >= previous.weeks.max, `${caseId}: weeks.max is monotonic`);
        assert.ok(next.budget.min >= previous.budget.min, `${caseId}: budget.min is monotonic`);
        assert.ok(next.budget.max >= previous.budget.max, `${caseId}: budget.max is monotonic`);
        previous = next;
      }
    }
  }
});

test("maturity is monotonic and automation does not invent an AI layer", () => {
  for (const typeId of estimator.TYPE_IDS) {
    const prototype = estimator.estimateProject({ typeId, stageId: "prototype" });
    const mvp = estimator.estimateProject({ typeId, stageId: "mvp" });
    const production = estimator.estimateProject({ typeId, stageId: "production" });
    assert.ok(mvp.weeks.min >= prototype.weeks.min, `${typeId}: MVP time >= prototype`);
    assert.ok(production.weeks.min >= mvp.weeks.min, `${typeId}: production time >= MVP`);
    assert.ok(mvp.budget.min >= prototype.budget.min, `${typeId}: MVP budget >= prototype`);
    assert.ok(production.budget.min >= mvp.budget.min, `${typeId}: production budget >= MVP`);
  }
  const automation = estimator.estimateProject({ typeId: "automation", stageId: "mvp" });
  assert.equal(automation.layers.find((layer) => layer.id === "ai").active, false);
  const aiAutomation = estimator.estimateProject({ typeId: "automation", stageId: "mvp", driverIds: ["ai"] });
  assert.equal(aiAutomation.layers.find((layer) => layer.id === "ai").active, true);
});
