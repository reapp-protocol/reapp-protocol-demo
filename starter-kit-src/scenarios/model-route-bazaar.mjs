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
  stableSort,
  validateDelivery,
  vector,
} from "./support.mjs";

const MERCHANT = "merchant-model-fixture";
const PROVIDERS = {
  precise: { merchant: MERCHANT, quoteAgeSeconds: 30, qualityBps: 9700, latencyMs: 900, priceXlm: "1.2000000", prompts: { summary: { text: "Evidence-weighted summary", citations: 3 } } },
  fast: { merchant: MERCHANT, quoteAgeSeconds: 20, qualityBps: 9000, latencyMs: 240, priceXlm: "0.7000000", prompts: { summary: { text: "Fast concise summary", citations: 2 } } },
  stale: { merchant: MERCHANT, quoteAgeSeconds: 900, qualityBps: 9900, latencyMs: 100, priceXlm: "0.3000000", prompts: { summary: { text: "Stale route", citations: 4 } } },
};

export function selectProvider({ minimumQualityBps, maximumLatencyMs, maximumQuoteAgeSeconds }) {
  const eligible = Object.entries(PROVIDERS).flatMap(([id, provider]) => {
    if (provider.merchant !== MERCHANT || provider.quoteAgeSeconds > maximumQuoteAgeSeconds || provider.qualityBps < minimumQualityBps || provider.latencyMs > maximumLatencyMs) return [];
    return [{ id, ...provider }];
  });
  if (eligible.length === 0) codedRejection("no-provider-route");
  return stableSort(eligible, (left, right) => Number(left.priceXlm) - Number(right.priceXlm) || right.qualityBps - left.qualityBps)[0];
}
export function requireFreshProvider(providerId, maximumAgeSeconds = 120) {
  const provider = PROVIDERS[providerId];
  if (!provider) codedRejection("unknown-provider");
  if (provider.quoteAgeSeconds > maximumAgeSeconds) codedRejection("stale-provider-quote");
  return provider;
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "model-route-bazaar", fixture: true, providers: Object.keys(PROVIDERS).sort(), liveModelClaim: false };
  return defineScenario({
    id: "model-route-bazaar",
    negativePathId: "stale-provider-quote",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: PROVIDERS },
    routePattern: "/providers/:providerId/results/:promptId",
    budgetXlm: "2.0000000",
    amount({ params }) { return PROVIDERS[params.providerId]?.priceXlm ?? "1.0000000"; },
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const provider = PROVIDERS[params.providerId]; return provider && provider.quoteAgeSeconds <= 120 && Object.hasOwn(provider.prompts, params.promptId) ? { resourceId: `${params.providerId}/${params.promptId}`, result: provider.prompts[params.promptId], priceXlm: provider.priceXlm } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "model-route-bazaar", resourceId: preflight.resourceId, result: preflight.result, provenance: { fixture: true, liveModelClaim: false } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "model-route-bazaar", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [{ id: "buy-fast-summary", path: "/providers/fast/results/summary", price: "0.7000000", expect: "delivery", case: { resourceId: "fast/summary" } }],
    async runNegativePath() { return { id: "stale-provider-quote", verified: true, evidence: await captureRejection(() => requireFreshProvider("stale"), "stale-provider-quote") }; },
    outputEvidence,
    testVectors: [
      vector("free-provider-index", "free-route", {}, ok({ count: 3, liveModelClaim: false }), () => ({ count: Object.keys(PROVIDERS).length, liveModelClaim: false })),
      vector("select-policy-route", "business-positive", {}, ok({ id: "fast", priceXlm: "0.7000000" }), () => { const result = selectProvider({ minimumQualityBps: 8900, maximumLatencyMs: 1000, maximumQuoteAgeSeconds: 120 }); return { id: result.id, priceXlm: result.priceXlm }; }),
      vector("reject-stale-quote", "business-rejection", {}, rejected("stale-provider-quote"), () => requireFreshProvider("stale")),
      vector("reject-model-result-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const body = makeDelivery({ scenarioId: "model-route-bazaar", resourceId: "fast/summary", result: PROVIDERS.fast.prompts.summary, provenance: { fixture: true } }); body.result.text = "forged"; return validateDelivery(body, { scenarioId: "model-route-bazaar", resourceId: "fast/summary" }); }),
    ],
  }, expectedMetadata);
}
