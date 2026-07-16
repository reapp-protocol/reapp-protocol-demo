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
  validateDelivery,
  vector,
} from "./support.mjs";

const CASES = {
  "case-clean": {
    research: { dependsOn: [], status: "passed", artifact: "sources-v1" },
    verification: { dependsOn: ["research"], status: "passed", artifact: "checks-v1" },
    synthesis: { dependsOn: ["research", "verification"], status: "passed", artifact: "brief-v1" },
  },
  "case-blocked": {
    research: { dependsOn: [], status: "passed", artifact: "sources-v2" },
    verification: { dependsOn: ["research"], status: "failed", artifact: "checks-v2" },
    synthesis: { dependsOn: ["research", "verification"], status: "pending", artifact: null },
  },
};

export function executeWorkflowStage(caseId, stage, completed = []) {
  const graph = CASES[caseId];
  const node = graph?.[stage];
  if (!node) codedRejection("unknown-workflow-stage");
  const missing = node.dependsOn.filter((dependency) => !completed.includes(dependency));
  if (missing.length > 0) codedRejection("workflow-dependency-missing");
  if (node.status === "failed") codedRejection("workflow-verification-failed");
  if (stage === "synthesis" && graph.verification.status !== "passed") codedRejection("failed-stage-blocks-synthesis");
  return { caseId, stage, status: node.status, artifact: node.artifact, dependencies: node.dependsOn };
}
export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "multi-agent-workflow", fixture: true, stages: ["research", "verification", "synthesis"] };
  return defineScenario({
    id: "multi-agent-workflow",
    negativePathId: "failed-stage-blocks-synthesis",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: CASES },
    routePattern: "/workflow/:caseId/:stage",
    budgetXlm: "4.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const node = CASES[params.caseId]?.[params.stage]; return node ? { resourceId: `${params.caseId}/${params.stage}`, priceXlm: "1.0000000", node } : false; },
    fulfill({ preflight }) { const [caseId, stage] = preflight.resourceId.split("/"); const completed = stage === "research" ? [] : stage === "verification" ? ["research"] : ["research", "verification"]; return { body: makeDelivery({ scenarioId: "multi-agent-workflow", resourceId: preflight.resourceId, result: executeWorkflowStage(caseId, stage, completed), provenance: { fixture: true, dependencyChecked: true } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "multi-agent-workflow", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [
      { id: "buy-clean-research", path: "/workflow/case-clean/research", price: "1.0000000", expect: "delivery", case: { resourceId: "case-clean/research" } },
      { id: "buy-clean-verification", path: "/workflow/case-clean/verification", price: "1.0000000", expect: "delivery", case: { resourceId: "case-clean/verification" } },
      { id: "buy-clean-synthesis", path: "/workflow/case-clean/synthesis", price: "1.0000000", expect: "delivery", case: { resourceId: "case-clean/synthesis" } },
    ],
    async runNegativePath() { return { id: "failed-stage-blocks-synthesis", verified: true, evidence: await captureRejection(() => executeWorkflowStage("case-blocked", "synthesis", ["research", "verification"]), "failed-stage-blocks-synthesis") }; },
    outputEvidence,
    testVectors: [
      vector("free-stage-manifest", "free-route", {}, ok({ stages: ["research", "verification", "synthesis"] }), () => ({ stages: manifest.stages })),
      vector("execute-ordered-stage", "business-positive", {}, ok({ artifact: "checks-v1", dependencies: ["research"] }), () => { const value = executeWorkflowStage("case-clean", "verification", ["research"]); return { artifact: value.artifact, dependencies: value.dependencies }; }),
      vector("reject-failed-synthesis", "business-rejection", {}, rejected("failed-stage-blocks-synthesis"), () => executeWorkflowStage("case-blocked", "synthesis", ["research", "verification"])),
      vector("reject-workflow-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const result = executeWorkflowStage("case-clean", "research", []); const body = makeDelivery({ scenarioId: "multi-agent-workflow", resourceId: "case-clean/research", result, provenance: { fixture: true } }); body.result.artifact = "forged"; return validateDelivery(body, { scenarioId: "multi-agent-workflow", resourceId: "case-clean/research" }); }),
    ],
  }, expectedMetadata);
}
