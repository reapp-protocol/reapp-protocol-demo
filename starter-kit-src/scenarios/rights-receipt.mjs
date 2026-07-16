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
  sha256,
  validateDelivery,
  vector,
} from "./support.mjs";

const ASSETS = {
  "essay/v1": { assetId: "essay", licenseVersion: "v1", content: "Fixture essay content.", terms: ["commercial-use", "attribution-required"] },
  "essay/v2": { assetId: "essay", licenseVersion: "v2", content: "Fixture essay content.", terms: ["commercial-use", "attribution-required", "no-redistribution"] },
  "dataset/v1": { assetId: "dataset", licenseVersion: "v1", content: "a,b\n1,2\n", terms: ["analysis-only"] },
};

export function issueRightsReceipt(assetId, licenseVersion, txHash = "pending-testnet-transaction") {
  const key = `${assetId}/${licenseVersion}`;
  const asset = requireRecord(ASSETS, key, "unknown-license-version");
  return { ...asset, terms: [...asset.terms], assetSha256: sha256(asset.content), termsSha256: sha256(JSON.stringify(asset.terms)), paymentTx: txHash, exactBinding: key };
}

export function verifyRightsReceipt(receipt, assetId, licenseVersion) {
  const key = `${assetId}/${licenseVersion}`;
  if (receipt.exactBinding !== key || receipt.assetId !== assetId || receipt.licenseVersion !== licenseVersion) codedRejection("license-version-rebinding");
  if (sha256(receipt.content) !== receipt.assetSha256 || sha256(JSON.stringify(receipt.terms)) !== receipt.termsSha256) codedRejection("rights-receipt-integrity");
  return { verified: true, exactBinding: key };
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "rights-receipt", fixture: true, licenses: Object.keys(ASSETS).sort() };
  return defineScenario({
    id: "rights-receipt",
    negativePathId: "license-version-rebinding",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: ASSETS },
    routePattern: "/licenses/:assetId/:licenseVersion",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const key = `${params.assetId}/${params.licenseVersion}`; return Object.hasOwn(ASSETS, key) ? { resourceId: key, priceXlm: "1.0000000" } : false; },
    fulfill({ preflight, payment }) { return { body: makeDelivery({ scenarioId: "rights-receipt", resourceId: preflight.resourceId, result: issueRightsReceipt(...preflight.resourceId.split("/"), payment.txHash), provenance: { fixture: true, transactionBound: true } }) }; },
    validateDelivery({ body, step }) { const value = validateDelivery(body, { scenarioId: "rights-receipt", resourceId: step.case.resourceId }); verifyRightsReceipt(value, ...step.case.resourceId.split("/")); return value; },
    deliveryEvidence,
    plan: [{ id: "buy-essay-v1", path: "/licenses/essay/v1", price: "1.0000000", expect: "delivery", case: { resourceId: "essay/v1" } }],
    async runNegativePath({ actions }) { const rejectRebinding = assertAction(actions, "expectResourceRebinding"); return { id: "license-version-rebinding", verified: true, evidence: await rejectRebinding({ deliveryIndex: 0, targetPath: "/licenses/essay/v2" }) }; },
    outputEvidence,
    testVectors: [
      vector("free-license-index", "free-route", {}, ok({ licenses: ["dataset/v1", "essay/v1", "essay/v2"] }), () => ({ licenses: Object.keys(ASSETS).sort() })),
      vector("verify-rights-receipt", "business-positive", {}, ok({ verified: true, exactBinding: "essay/v1" }), () => verifyRightsReceipt(issueRightsReceipt("essay", "v1"), "essay", "v1")),
      vector("reject-version-rebinding", "business-rejection", {}, rejected("license-version-rebinding"), () => verifyRightsReceipt(issueRightsReceipt("essay", "v1"), "essay", "v2")),
      vector("reject-rights-tamper", "delivery-tamper", {}, rejected("rights-receipt-integrity"), () => { const result = issueRightsReceipt("essay", "v1"); result.content = "forged"; const body = makeDelivery({ scenarioId: "rights-receipt", resourceId: "essay/v1", result, provenance: { fixture: true } }); const value = validateDelivery(body, { scenarioId: "rights-receipt", resourceId: "essay/v1" }); return verifyRightsReceipt(value, "essay", "v1"); }),
    ],
  }, expectedMetadata);
}
