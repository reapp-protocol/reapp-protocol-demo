import { defineScenario } from "../shared/scenario.mjs";
import {
  FIXTURE_POLICY,
  captureRejection,
  codedRejection,
  deliveryEvidence,
  makeDelivery,
  ok,
  outputEvidence,
  registerManifestRoute,
  rejected,
  stableSort,
  validateDelivery,
  vector,
} from "./support.mjs";

const FORECASTS = {
  "job-fresh": {
    forecastAgeMinutes: 10, durationHours: 2, requiredCapacity: 4, deadlineHour: 5,
    slots: [{ hour: 0, intensity: 420, capacity: 6 }, { hour: 1, intensity: 390, capacity: 5 }, { hour: 2, intensity: 180, capacity: 5 }, { hour: 3, intensity: 160, capacity: 4 }, { hour: 4, intensity: 300, capacity: 8 }],
  },
  "job-stale": {
    forecastAgeMinutes: 180, durationHours: 1, requiredCapacity: 2, deadlineHour: 3,
    slots: [{ hour: 0, intensity: 100, capacity: 4 }, { hour: 1, intensity: 120, capacity: 4 }],
  },
};

export function selectRunWindow(jobId, maximumForecastAgeMinutes = 60) {
  const job = FORECASTS[jobId];
  if (!job) codedRejection("unknown-job");
  if (job.forecastAgeMinutes > maximumForecastAgeMinutes) codedRejection("forecast-expired");
  const candidates = [];
  for (let start = 0; start + job.durationHours <= job.deadlineHour; start += 1) {
    const slots = Array.from({ length: job.durationHours }, (_, offset) => job.slots.find(({ hour }) => hour === start + offset));
    if (slots.some((slot) => !slot || slot.capacity < job.requiredCapacity)) continue;
    candidates.push({ startHour: start, endHour: start + job.durationHours, averageIntensity: Math.round(slots.reduce((sum, slot) => sum + slot.intensity, 0) / slots.length), minimumCapacity: Math.min(...slots.map(({ capacity }) => capacity)) });
  }
  if (candidates.length === 0) codedRejection("no-feasible-run-window");
  return { jobId, ...stableSort(candidates, (left, right) => left.averageIntensity - right.averageIntensity || left.startHour - right.startHour)[0] };
}
export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "carbon-aware-run-window", fixture: true, jobs: Object.keys(FORECASTS).sort(), maximumForecastAgeMinutes: 60 };
  return defineScenario({
    id: "carbon-aware-run-window",
    negativePathId: "forecast-expired",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: FORECASTS },
    routePattern: "/schedules/:jobId/window",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { try { const result = selectRunWindow(params.jobId); return { resourceId: params.jobId, result, priceXlm: "1.0000000" }; } catch (error) { if (["unknown-job", "forecast-expired", "no-feasible-run-window"].includes(error.code)) return false; throw error; } },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "carbon-aware-run-window", resourceId: preflight.resourceId, result: preflight.result, provenance: { fixture: true, forecastAgeMinutes: FORECASTS[preflight.resourceId].forecastAgeMinutes } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "carbon-aware-run-window", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [{ id: "buy-fresh-window", path: "/schedules/job-fresh/window", price: "1.0000000", expect: "delivery", case: { resourceId: "job-fresh" } }],
    async runNegativePath() { return { id: "forecast-expired", verified: true, evidence: await captureRejection(() => selectRunWindow("job-stale"), "forecast-expired") }; },
    outputEvidence,
    testVectors: [
      vector("free-forecast-policy", "free-route", {}, ok({ maximumAgeMinutes: 60, jobs: 2 }), () => ({ maximumAgeMinutes: manifest.maximumForecastAgeMinutes, jobs: manifest.jobs.length })),
      vector("select-low-carbon-window", "business-positive", {}, ok({ startHour: 2, endHour: 4, averageIntensity: 170 }), () => { const result = selectRunWindow("job-fresh"); return { startHour: result.startHour, endHour: result.endHour, averageIntensity: result.averageIntensity }; }),
      vector("reject-stale-forecast", "business-rejection", {}, rejected("forecast-expired"), () => selectRunWindow("job-stale")),
      vector("reject-window-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const body = makeDelivery({ scenarioId: "carbon-aware-run-window", resourceId: "job-fresh", result: selectRunWindow("job-fresh"), provenance: { fixture: true } }); body.result.averageIntensity = 1; return validateDelivery(body, { scenarioId: "carbon-aware-run-window", resourceId: "job-fresh" }); }),
    ],
  }, expectedMetadata);
}
