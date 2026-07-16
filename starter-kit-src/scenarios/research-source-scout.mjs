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
  stableSort,
  validateDelivery,
  vector,
} from "./support.mjs";

const RECORDS = {
  market: { title: "Market Data", relevance: 98, facts: ["volume-up", "spread-tight"] },
  academic: { title: "Academic Papers", relevance: 94, facts: ["sample-1200", "peer-reviewed"] },
  news: { title: "News Archive", relevance: 89, facts: ["filing-published", "launch-confirmed"] },
  patents: { title: "Patent Index", relevance: 77, facts: ["three-families", "two-jurisdictions"] },
};

export function rankSources(records = RECORDS) {
  return stableSort(
    Object.entries(records).map(([id, record]) => ({ id, relevance: record.relevance })),
    (left, right) => right.relevance - left.relevance || left.id.localeCompare(right.id),
  );
}
function sourceResult(sourceId) {
  const source = requireRecord(RECORDS, sourceId, "unknown-source");
  return { sourceId, ...source, provenance: `fixture:${sourceId}:v1` };
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "research-source-scout", fixture: true, sources: rankSources() };
  return defineScenario({
    id: "research-source-scout",
    negativePathId: "budget-exhausted",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: RECORDS },
    routePattern: "/source/:sourceId",
    budgetXlm: "3.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) {
      if (!Object.hasOwn(RECORDS, params.sourceId)) return false;
      return { resourceId: params.sourceId, priceXlm: "1.0000000" };
    },
    fulfill({ preflight }) {
      const result = sourceResult(preflight.resourceId);
      return { body: makeDelivery({
        scenarioId: "research-source-scout",
        resourceId: preflight.resourceId,
        result,
        provenance: { fixture: true, rank: result.relevance },
      }) };
    },
    validateDelivery({ body, step }) {
      return validateDelivery(body, { scenarioId: "research-source-scout", resourceId: step.case.resourceId });
    },
    deliveryEvidence,
    plan: ["market", "academic", "news"].map((resourceId) => ({
      id: `buy-${resourceId}`,
      path: `/source/${resourceId}`,
      price: "1.0000000",
      expect: "delivery",
      case: { resourceId },
    })),
    async runNegativePath({ actions }) {
      const expectBudgetRejection = assertAction(actions, "expectBudgetRejection");
      const evidence = await expectBudgetRejection({ path: "/source/patents", priceXlm: "1.0000000" });
      return { id: "budget-exhausted", verified: true, fourthResource: "patents", evidence };
    },
    outputEvidence,
    testVectors: [
      vector("free-ranked-index", "free-route", {}, ok({ ids: ["market", "academic", "news", "patents"] }), () => ({ ids: rankSources().map(({ id }) => id) })),
      vector("rank-source-fixtures", "business-positive", {}, ok({ first: "market", last: "patents" }), () => ({ first: rankSources()[0].id, last: rankSources().at(-1).id })),
      vector("reject-unknown-source", "business-rejection", { id: "missing" }, rejected("unknown-source"), ({ id }) => sourceResult(id)),
      vector("reject-tampered-delivery", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => validateDelivery({ ...makeDelivery({ scenarioId: "research-source-scout", resourceId: "market", result: sourceResult("market"), provenance: { fixture: true } }), integrity: { algorithm: "sha256", digest: "0".repeat(64) } }, { scenarioId: "research-source-scout", resourceId: "market" })),
    ],
  }, expectedMetadata);
}
