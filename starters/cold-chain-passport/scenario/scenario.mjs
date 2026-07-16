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
  sha256Json,
  validateDelivery,
  vector,
} from "./support.mjs";

const SHIPMENTS = {
  normal: {
    thresholdCelsius: 8,
    expectedIntervalMinutes: 10,
    telemetry: [{ minute: 0, celsius: 4 }, { minute: 10, celsius: 5 }, { minute: 20, celsius: 6 }, { minute: 30, celsius: 5 }],
    custody: [{ minute: 0, holder: "origin" }, { minute: 18, holder: "carrier" }, { minute: 35, holder: "receiver" }],
  },
  breached: {
    thresholdCelsius: 8,
    expectedIntervalMinutes: 10,
    telemetry: [{ minute: 0, celsius: 4 }, { minute: 10, celsius: 10 }, { minute: 20, celsius: 11 }, { minute: 30, celsius: 5 }],
    custody: [{ minute: 0, holder: "origin" }, { minute: 8, holder: "carrier" }, { minute: 35, holder: "receiver" }],
  },
  incomplete: {
    thresholdCelsius: 8,
    expectedIntervalMinutes: 10,
    telemetry: [{ minute: 0, celsius: 4 }, { minute: 10, celsius: 5 }, { minute: 40, celsius: 6 }],
    custody: [{ minute: 0, holder: "origin" }, { minute: 45, holder: "receiver" }],
  },
};

export function buildPassport(shipmentId) {
  const shipment = SHIPMENTS[shipmentId];
  if (!shipment) codedRejection("unknown-shipment");
  const telemetry = [...shipment.telemetry].sort((a, b) => a.minute - b.minute);
  const gaps = [];
  let excursionMinutes = 0;
  for (let index = 1; index < telemetry.length; index += 1) {
    const interval = telemetry[index].minute - telemetry[index - 1].minute;
    if (interval > shipment.expectedIntervalMinutes) gaps.push({ from: telemetry[index - 1].minute, to: telemetry[index].minute, minutes: interval });
    if (telemetry[index - 1].celsius > shipment.thresholdCelsius) excursionMinutes += interval;
  }
  const findings = { shipmentId, status: gaps.length > 0 ? "incomplete" : excursionMinutes > 0 ? "breached" : "pass", excursionMinutes, gaps, custody: [...shipment.custody].sort((a, b) => a.minute - b.minute) };
  return { ...findings, evidenceSha256: sha256Json({ telemetry, custody: findings.custody }) };
}
export function assertPassportComplete(passport) {
  if (passport.status === "incomplete") codedRejection("incomplete-sensor-evidence");
  return passport;
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "cold-chain-passport", fixture: true, shipments: Object.keys(SHIPMENTS).sort(), thresholdUnit: "celsius" };
  return defineScenario({
    id: "cold-chain-passport",
    negativePathId: "incomplete-sensor-evidence",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: SHIPMENTS },
    routePattern: "/shipments/:shipmentId/passport",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { return Object.hasOwn(SHIPMENTS, params.shipmentId) ? { resourceId: params.shipmentId, priceXlm: "1.0000000" } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "cold-chain-passport", resourceId: preflight.resourceId, result: buildPassport(preflight.resourceId), provenance: { fixture: true, sensorContinuityChecked: true } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "cold-chain-passport", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [{ id: "buy-normal-passport", path: "/shipments/normal/passport", price: "1.0000000", expect: "delivery", case: { resourceId: "normal" } }],
    async runNegativePath() { const passport = buildPassport("incomplete"); return { id: "incomplete-sensor-evidence", verified: true, explicitStatus: passport.status, gaps: passport.gaps, evidence: await captureRejection(() => assertPassportComplete(passport), "incomplete-sensor-evidence") }; },
    outputEvidence,
    testVectors: [
      vector("free-shipment-index", "free-route", {}, ok({ shipments: ["breached", "incomplete", "normal"] }), () => ({ shipments: Object.keys(SHIPMENTS).sort() })),
      vector("calculate-breach-duration", "business-positive", {}, ok({ status: "breached", excursionMinutes: 20 }), () => { const result = buildPassport("breached"); return { status: result.status, excursionMinutes: result.excursionMinutes }; }),
      vector("reject-incomplete-evidence", "business-rejection", {}, rejected("incomplete-sensor-evidence"), () => assertPassportComplete(buildPassport("incomplete"))),
      vector("reject-passport-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const body = makeDelivery({ scenarioId: "cold-chain-passport", resourceId: "normal", result: buildPassport("normal"), provenance: { fixture: true } }); body.result.status = "breached"; return validateDelivery(body, { scenarioId: "cold-chain-passport", resourceId: "normal" }); }),
    ],
  }, expectedMetadata);
}
