import { createHmac, timingSafeEqual } from "node:crypto";
import { defineScenario } from "../shared/scenario.mjs";
import {
  FIXTURE_POLICY,
  assertAction,
  canonicalJson,
  codedRejection,
  deliveryEvidence,
  makeDelivery,
  ok,
  outputEvidence,
  registerManifestRoute,
  rejected,
  validateDelivery,
  vector,
} from "./support.mjs";

const FIXTURE_REVIEW_KEY = "fixture-review-key-not-for-production";
const CASES = {
  "case-ready": { status: "ready", queuedSeconds: 45, decision: "approve", reasonCodes: ["policy-pass", "evidence-complete"] },
  "case-delayed": { status: "ready", queuedSeconds: 901, decision: "deny", reasonCodes: ["authority-expired"] },
};

function signatureFor(payload) {
  return createHmac("sha256", FIXTURE_REVIEW_KEY).update(canonicalJson(payload)).digest("hex");
}

export function signedDecision(caseId) {
  const record = CASES[caseId];
  if (!record || record.status !== "ready") codedRejection("review-not-ready");
  const decision = { caseId, decision: record.decision, reasonCodes: record.reasonCodes, queuedSeconds: record.queuedSeconds, reviewer: "fixture-reviewer" };
  return { ...decision, signature: signatureFor(decision), signatureScheme: "fixture-hmac-sha256" };
}

export function verifyDecision(value) {
  const { signature, signatureScheme, ...payload } = value;
  const expected = Buffer.from(signatureFor(payload), "hex");
  const received = typeof signature === "string" ? Buffer.from(signature, "hex") : Buffer.alloc(0);
  if (signatureScheme !== "fixture-hmac-sha256" || received.length !== expected.length || !timingSafeEqual(received, expected)) codedRejection("review-signature-invalid");
  return { verified: true, caseId: payload.caseId, decision: payload.decision };
}

export function assertAuthorityAt(expiresAt, settlementAttemptAt) {
  if (!Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(settlementAttemptAt)) {
    codedRejection("invalid-authority-time");
  }
  if (settlementAttemptAt >= expiresAt) codedRejection("authority-expires-in-queue");
  return { authorized: true, remainingSeconds: expiresAt - settlementAttemptAt };
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "human-review-outbox", fixture: true, slaSeconds: 900, cases: Object.keys(CASES).sort() };
  return defineScenario({
    id: "human-review-outbox",
    negativePathId: "authority-expires-in-queue",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: CASES },
    routePattern: "/reviews/:caseId/decision",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { return CASES[params.caseId]?.status === "ready" ? { resourceId: params.caseId, priceXlm: "1.0000000" } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "human-review-outbox", resourceId: preflight.resourceId, result: signedDecision(preflight.resourceId), provenance: { fixture: true, signer: "fixture-reviewer" } }) }; },
    validateDelivery({ body, step }) { const value = validateDelivery(body, { scenarioId: "human-review-outbox", resourceId: step.case.resourceId }); verifyDecision(value); return value; },
    deliveryEvidence,
    plan: [{ id: "buy-ready-decision", path: "/reviews/case-ready/decision", price: "1.0000000", expect: "delivery", case: { resourceId: "case-ready" } }],
    async runNegativePath({ actions }) { const expectExpiry = assertAction(actions, "expectExpiryRejection"); return { id: "authority-expires-in-queue", verified: true, queuedSeconds: CASES["case-delayed"].queuedSeconds, evidence: await expectExpiry({ path: "/reviews/case-delayed/decision", priceXlm: "1.0000000" }) }; },
    outputEvidence,
    testVectors: [
      vector("free-review-policy", "free-route", {}, ok({ slaSeconds: 900, cases: 2 }), () => ({ slaSeconds: manifest.slaSeconds, cases: manifest.cases.length })),
      vector("verify-signed-decision", "business-positive", {}, ok({ verified: true, caseId: "case-ready", decision: "approve" }), () => verifyDecision(signedDecision("case-ready"))),
      vector("reject-expired-authority", "business-rejection", { expiresAt: 100, attemptAt: 101 }, rejected("authority-expires-in-queue"), ({ expiresAt, attemptAt }) => assertAuthorityAt(expiresAt, attemptAt)),
      vector("reject-decision-tamper", "delivery-tamper", {}, rejected("review-signature-invalid"), () => { const result = signedDecision("case-ready"); result.decision = "deny"; const body = makeDelivery({ scenarioId: "human-review-outbox", resourceId: "case-ready", result, provenance: { fixture: true } }); return verifyDecision(validateDelivery(body, { scenarioId: "human-review-outbox", resourceId: "case-ready" })); }),
    ],
  }, expectedMetadata);
}
