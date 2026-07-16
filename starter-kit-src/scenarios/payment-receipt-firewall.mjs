import { defineScenario } from "../shared/scenario.mjs";
import {
  FIXTURE_POLICY,
  assertAction,
  codedRejection,
  deliveryEvidence,
  makeDelivery,
  ok,
  outputEvidence,
  registerManifestRoute,
  rejected,
  requireRecord,
  sha256Json,
  validateDelivery,
  vector,
} from "./support.mjs";

const VAULT = {
  alpha: { classification: "fixture-public", payload: { token: "alpha-evidence", version: 1 } },
  beta: { classification: "fixture-public", payload: { token: "beta-evidence", version: 1 } },
};

export function vaultRecord(resourceId) {
  const record = requireRecord(VAULT, resourceId, "unknown-vault-resource");
  const payload = { ...record.payload };
  return { resourceId, ...record, payload, payloadSha256: sha256Json(payload) };
}

export function verifyVaultRecord(value) {
  if (sha256Json(value.payload) !== value.payloadSha256) codedRejection("vault-record-integrity");
  return { verified: true, resourceId: value.resourceId };
}

export function classifyReplay({ exactProof, exactResource, completedRecord }) {
  if (exactProof && exactResource && completedRecord) {
    return { decision: "byte-identical-recovery", executePaidWork: false };
  }
  if (!exactResource) codedRejection("resource-binding-mismatch");
  if (!exactProof && completedRecord) codedRejection("rebound-transaction-conflict");
  codedRejection("replay-state-unavailable");
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "payment-receipt-firewall", fixture: true, resources: Object.keys(VAULT).sort(), persistenceRequired: true };
  return defineScenario({
    id: "payment-receipt-firewall",
    negativePathId: "durable-replay-after-restart",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: VAULT },
    routePattern: "/vault/:resourceId",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { return Object.hasOwn(VAULT, params.resourceId) ? { resourceId: params.resourceId, priceXlm: "1.0000000" } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "payment-receipt-firewall", resourceId: preflight.resourceId, result: vaultRecord(preflight.resourceId), provenance: { fixture: true, durableResponse: true } }) }; },
    validateDelivery({ body, step }) { const value = validateDelivery(body, { scenarioId: "payment-receipt-firewall", resourceId: step.case.resourceId }); verifyVaultRecord(value); return value; },
    deliveryEvidence,
    plan: [{ id: "buy-vault-alpha", path: "/vault/alpha", price: "1.0000000", expect: "delivery", case: { resourceId: "alpha" } }],
    async runNegativePath({ actions }) { const expectReplayAfterRestart = assertAction(actions, "expectDurableReplayAfterRestart"); return { id: "durable-replay-after-restart", verified: true, evidence: await expectReplayAfterRestart({ deliveryIndex: 0 }) }; },
    outputEvidence,
    testVectors: [
      vector("free-firewall-policy", "free-route", {}, ok({ persistenceRequired: true, resources: 2 }), () => ({ persistenceRequired: manifest.persistenceRequired, resources: manifest.resources.length })),
      vector("verify-vault-record", "business-positive", {}, ok({ verified: true, resourceId: "alpha" }), () => verifyVaultRecord(vaultRecord("alpha"))),
      vector("reject-rebound-transaction", "business-rejection", { exactProof: false, exactResource: true, completedRecord: true }, rejected("rebound-transaction-conflict"), classifyReplay),
      vector("reject-vault-tamper", "delivery-tamper", {}, rejected("vault-record-integrity"), () => { const result = vaultRecord("alpha"); result.payload.version = 2; const body = makeDelivery({ scenarioId: "payment-receipt-firewall", resourceId: "alpha", result, provenance: { fixture: true } }); return verifyVaultRecord(validateDelivery(body, { scenarioId: "payment-receipt-firewall", resourceId: "alpha" })); }),
    ],
  }, expectedMetadata);
}
