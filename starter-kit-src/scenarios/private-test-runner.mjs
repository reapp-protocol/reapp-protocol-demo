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
  sha256Json,
  validateDelivery,
  vector,
} from "./support.mjs";

const PATCHES = {
  "patch-safe": { outcomes: [{ name: "rejects-negative", passed: true }, { name: "caps-transfer", passed: true }] },
  "patch-regression": { outcomes: [{ name: "rejects-negative", passed: true }, { name: "caps-transfer", passed: false }] },
};

export function runPrivateChecks(patchId) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(patchId)) codedRejection("patch-path-traversal");
  const patch = requireRecord(PATCHES, patchId, "unknown-patch");
  const tests = patch.outcomes.map(({ name, passed }) => ({ name, passed }));
  const report = { patchId, passed: tests.every(({ passed }) => passed), tests, privateSourcesIncluded: false };
  return { ...report, reportSha256: sha256Json(report) };
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "private-test-runner", fixture: true, patchIds: Object.keys(PATCHES).sort(), privateSourcesExposed: false };
  return defineScenario({
    id: "private-test-runner",
    negativePathId: "patch-path-traversal",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: PATCHES },
    routePattern: "/checks/:patchId/report",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.patchId) && Object.hasOwn(PATCHES, params.patchId) ? { resourceId: params.patchId, priceXlm: "1.0000000" } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "private-test-runner", resourceId: preflight.resourceId, result: runPrivateChecks(preflight.resourceId), provenance: { fixture: true, privateSourcesIncluded: false } }) }; },
    validateDelivery({ body, step }) { const result = validateDelivery(body, { scenarioId: "private-test-runner", resourceId: step.case.resourceId }); const { reportSha256, ...report } = result; if (sha256Json(report) !== reportSha256) codedRejection("test-report-mismatch"); return result; },
    deliveryEvidence,
    plan: [{ id: "buy-safe-report", path: "/checks/patch-safe/report", price: "1.0000000", expect: "delivery", case: { resourceId: "patch-safe" } }],
    async runNegativePath() { return { id: "patch-path-traversal", verified: true, evidence: await captureRejection(() => runPrivateChecks("../private-tests"), "patch-path-traversal") }; },
    outputEvidence,
    testVectors: [
      vector("free-runner-policy", "free-route", {}, ok({ privateSourcesExposed: false, patchCount: 2 }), () => ({ privateSourcesExposed: false, patchCount: Object.keys(PATCHES).length })),
      vector("run-known-bad-patch", "business-positive", {}, ok({ passed: false, failed: ["caps-transfer"] }), () => { const report = runPrivateChecks("patch-regression"); return { passed: report.passed, failed: report.tests.filter(({ passed }) => !passed).map(({ name }) => name) }; }),
      vector("reject-path-traversal", "business-rejection", {}, rejected("patch-path-traversal"), () => runPrivateChecks("../../etc/passwd")),
      vector("reject-report-tamper", "delivery-tamper", {}, rejected("test-report-mismatch"), () => { const result = runPrivateChecks("patch-safe"); const body = makeDelivery({ scenarioId: "private-test-runner", resourceId: "patch-safe", result: { ...result, passed: false }, provenance: { fixture: true } }); const value = validateDelivery(body, { scenarioId: "private-test-runner", resourceId: "patch-safe" }); const { reportSha256, ...report } = value; if (sha256Json(report) !== reportSha256) codedRejection("test-report-mismatch"); return value; }),
    ],
  }, expectedMetadata);
}
