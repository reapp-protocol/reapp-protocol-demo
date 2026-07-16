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
  requireRecord,
  sha256,
  validateDelivery,
  vector,
} from "./support.mjs";

const PATCHES = {
  "issue-101": { host: "api.fixture.local", patch: "- timeout=0\n+ timeout=5000\n", priceXlm: "1.0000000" },
  "issue-205": { host: "api.fixture.local", patch: "- retries=9\n+ retries=2\n", priceXlm: "1.0000000" },
};

export function preparePatch(issueId, host) {
  const record = requireRecord(PATCHES, issueId, "unknown-issue");
  if (host !== record.host) codedRejection("host-not-allowlisted");
  return { issueId, host, patch: record.patch, patchSha256: sha256(record.patch), writeMode: "atomic-rename" };
}

export function decideChallengeTransition(state, status) {
  if (state === "settled" && status === 402) codedRejection("repeated-payment-challenge");
  if (state !== "quoted" || status !== 402) codedRejection("invalid-payment-transition");
  return { next: "settle-once", retryLimit: 1 };
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "coding-agent-purchase-hook", fixture: true, issues: Object.keys(PATCHES).sort() };
  return defineScenario({
    id: "coding-agent-purchase-hook",
    negativePathId: "repeated-payment-challenge",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: PATCHES },
    routePattern: "/artifacts/:issueId/patch",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const patch = PATCHES[params.issueId]; return patch ? { resourceId: params.issueId, priceXlm: patch.priceXlm } : false; },
    fulfill({ preflight }) { const result = preparePatch(preflight.resourceId, "api.fixture.local"); return { body: makeDelivery({ scenarioId: "coding-agent-purchase-hook", resourceId: preflight.resourceId, result, provenance: { fixture: true, hashCheckedBeforeWrite: true } }) }; },
    validateDelivery({ body, step }) { const result = validateDelivery(body, { scenarioId: "coding-agent-purchase-hook", resourceId: step.case.resourceId }); if (sha256(result.patch) !== result.patchSha256) codedRejection("patch-hash-mismatch"); return result; },
    deliveryEvidence,
    plan: [{ id: "buy-issue-101-patch", path: "/artifacts/issue-101/patch", price: "1.0000000", expect: "delivery", case: { resourceId: "issue-101" } }],
    async runNegativePath() { return { id: "repeated-payment-challenge", verified: true, evidence: await captureRejection(() => decideChallengeTransition("settled", 402), "repeated-payment-challenge") }; },
    outputEvidence,
    testVectors: [
      vector("free-issue-index", "free-route", {}, ok({ count: 2 }), () => ({ count: Object.keys(PATCHES).length })),
      vector("prepare-atomic-patch", "business-positive", {}, ok({ writeMode: "atomic-rename", digestLength: 64 }), () => { const value = preparePatch("issue-101", "api.fixture.local"); return { writeMode: value.writeMode, digestLength: value.patchSha256.length }; }),
      vector("reject-repeated-challenge", "business-rejection", {}, rejected("repeated-payment-challenge"), () => decideChallengeTransition("settled", 402)),
      vector("reject-patch-tamper", "delivery-tamper", {}, rejected("patch-hash-mismatch"), () => { const result = preparePatch("issue-101", "api.fixture.local"); const body = makeDelivery({ scenarioId: "coding-agent-purchase-hook", resourceId: "issue-101", result: { ...result, patch: `${result.patch}tampered` }, provenance: { fixture: true } }); const value = validateDelivery(body, { scenarioId: "coding-agent-purchase-hook", resourceId: "issue-101" }); if (sha256(value.patch) !== value.patchSha256) codedRejection("patch-hash-mismatch"); return value; }),
    ],
  }, expectedMetadata);
}
