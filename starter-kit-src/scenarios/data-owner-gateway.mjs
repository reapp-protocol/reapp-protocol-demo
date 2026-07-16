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

const ACTIVE_OWNER = "owner-alpha";
const DATASETS = {
  "owner-alpha/energy": { ownerId: "owner-alpha", datasetId: "energy", observedAt: "2026-07-01T00:00:00Z", permittedUse: ["research", "forecasting"], rows: [["hour", "kwh"], ["00", 18], ["01", 16]] },
  "owner-beta/logistics": { ownerId: "owner-beta", datasetId: "logistics", observedAt: "2026-07-01T00:00:00Z", permittedUse: ["research"], rows: [["lane", "hours"], ["bkk-sin", 31]] },
};

export function resolveOwnedDataset(ownerId, datasetId, endpointOwner = ACTIVE_OWNER) {
  const record = DATASETS[`${ownerId}/${datasetId}`];
  if (!record) codedRejection("unknown-dataset");
  if (record.ownerId !== endpointOwner) codedRejection("dataset-owner-mismatch");
  const rows = record.rows.map((row) => [...row]);
  return {
    ...record,
    permittedUse: [...record.permittedUse],
    rows,
    contentSha256: sha256Json(rows),
  };
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "data-owner-gateway", fixture: true, endpointOwner: ACTIVE_OWNER, datasets: ["energy"] };
  return defineScenario({
    id: "data-owner-gateway",
    negativePathId: "dataset-owner-mismatch",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: DATASETS },
    routePattern: "/datasets/:ownerId/:datasetId",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { try { const result = resolveOwnedDataset(params.ownerId, params.datasetId); return { resourceId: `${params.ownerId}/${params.datasetId}`, result, priceXlm: "1.0000000" }; } catch (error) { if (["unknown-dataset", "dataset-owner-mismatch"].includes(error.code)) return false; throw error; } },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "data-owner-gateway", resourceId: preflight.resourceId, result: preflight.result, provenance: { fixture: true, directOwnerEndpoint: ACTIVE_OWNER } }) }; },
    validateDelivery({ body, step }) { const value = validateDelivery(body, { scenarioId: "data-owner-gateway", resourceId: step.case.resourceId }); if (sha256Json(value.rows) !== value.contentSha256) codedRejection("dataset-integrity-mismatch"); return value; },
    deliveryEvidence,
    plan: [{ id: "buy-owner-energy", path: "/datasets/owner-alpha/energy", price: "1.0000000", expect: "delivery", case: { resourceId: "owner-alpha/energy" } }],
    async runNegativePath() { return { id: "dataset-owner-mismatch", verified: true, evidence: await captureRejection(() => resolveOwnedDataset("owner-beta", "logistics"), "dataset-owner-mismatch") }; },
    outputEvidence,
    testVectors: [
      vector("free-owner-manifest", "free-route", {}, ok({ owner: "owner-alpha", datasetCount: 1 }), () => ({ owner: ACTIVE_OWNER, datasetCount: manifest.datasets.length })),
      vector("resolve-owner-dataset", "business-positive", {}, ok({ owner: "owner-alpha", rows: 3 }), () => { const result = resolveOwnedDataset("owner-alpha", "energy"); return { owner: result.ownerId, rows: result.rows.length }; }),
      vector("reject-owner-mismatch", "business-rejection", {}, rejected("dataset-owner-mismatch"), () => resolveOwnedDataset("owner-beta", "logistics")),
      vector("reject-dataset-tamper", "delivery-tamper", {}, rejected("dataset-integrity-mismatch"), () => { const result = resolveOwnedDataset("owner-alpha", "energy"); result.rows.push(["02", 999]); const body = makeDelivery({ scenarioId: "data-owner-gateway", resourceId: "owner-alpha/energy", result, provenance: { fixture: true } }); const value = validateDelivery(body, { scenarioId: "data-owner-gateway", resourceId: "owner-alpha/energy" }); if (sha256Json(value.rows) !== value.contentSha256) codedRejection("dataset-integrity-mismatch"); return value; }),
    ],
  }, expectedMetadata);
}
