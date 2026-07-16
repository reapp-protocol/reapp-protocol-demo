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

const TOOLS = {
  "supply-risk": { priceXlm: "0.8000000", schema: { fixtureId: "string" }, fixtures: { semiconductors: { score: 72, drivers: ["single-source", "port-delay"] } } },
  "document-classifier": { priceXlm: "1.2000000", schema: { fixtureId: "string" }, fixtures: { invoice: { class: "invoice", confidenceBps: 9910 } } },
};

export function quoteTool(toolId, fixtureId, ceilingXlm) {
  const tool = TOOLS[toolId];
  if (!tool || !Object.hasOwn(tool.fixtures, fixtureId)) codedRejection("unknown-tool-input");
  if (Number(tool.priceXlm) > Number(ceilingXlm)) codedRejection("tool-price-ceiling");
  return { toolId, fixtureId, priceXlm: tool.priceXlm, result: tool.fixtures[fixtureId] };
}
export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "paid-tool-gateway", fixture: true, tools: Object.entries(TOOLS).map(([id, tool]) => ({ id, priceXlm: tool.priceXlm, schema: tool.schema })) };
  return defineScenario({
    id: "paid-tool-gateway",
    negativePathId: "tool-price-ceiling",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: TOOLS },
    routePattern: "/tools/:toolId/results/:fixtureId",
    budgetXlm: "2.0000000",
    amount({ params }) { return TOOLS[params.toolId]?.priceXlm ?? "1.0000000"; },
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const tool = TOOLS[params.toolId]; return tool && Object.hasOwn(tool.fixtures, params.fixtureId) ? { resourceId: `${params.toolId}/${params.fixtureId}`, priceXlm: tool.priceXlm, result: tool.fixtures[params.fixtureId] } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "paid-tool-gateway", resourceId: preflight.resourceId, result: preflight.result, provenance: { fixture: true, schemaDeclared: true, fixtureSelected: true } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "paid-tool-gateway", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [{ id: "buy-supply-risk", path: "/tools/supply-risk/results/semiconductors", price: "0.8000000", expect: "delivery", case: { resourceId: "supply-risk/semiconductors" } }],
    async runNegativePath() { return { id: "tool-price-ceiling", verified: true, evidence: await captureRejection(() => quoteTool("document-classifier", "invoice", "1.0000000"), "tool-price-ceiling") }; },
    outputEvidence,
    testVectors: [
      vector("free-tool-discovery", "free-route", {}, ok({ ids: ["document-classifier", "supply-risk"] }), () => ({ ids: Object.keys(TOOLS).sort() })),
      vector("quote-tool-below-ceiling", "business-positive", {}, ok({ toolId: "supply-risk", priceXlm: "0.8000000" }), () => { const quote = quoteTool("supply-risk", "semiconductors", "1.0000000"); return { toolId: quote.toolId, priceXlm: quote.priceXlm }; }),
      vector("reject-price-ceiling", "business-rejection", {}, rejected("tool-price-ceiling"), () => quoteTool("document-classifier", "invoice", "1.0000000")),
      vector("reject-tool-result-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const body = makeDelivery({ scenarioId: "paid-tool-gateway", resourceId: "supply-risk/semiconductors", result: { score: 72 }, provenance: { fixture: true } }); body.result.score = 12; return validateDelivery(body, { scenarioId: "paid-tool-gateway", resourceId: "supply-risk/semiconductors" }); }),
    ],
  }, expectedMetadata);
}
