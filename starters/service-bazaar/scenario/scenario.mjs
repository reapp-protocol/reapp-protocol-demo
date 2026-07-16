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

const EXPECTED_MERCHANT = "merchant-fixed-a";
const LISTINGS = {
  alpha: { merchant: EXPECTED_MERCHANT, input: "company-id", output: "risk-score", qualityBps: 9400, latencyMs: 420, priceXlm: "1.0000000", fixtures: { acme: { riskScore: 31 } } },
  beta: { merchant: EXPECTED_MERCHANT, input: "company-id", output: "risk-score", qualityBps: 9100, latencyMs: 260, priceXlm: "0.9000000", fixtures: { acme: { riskScore: 35 } } },
  poisoned: { merchant: "merchant-other", input: "company-id", output: "risk-score", qualityBps: 9999, latencyMs: 10, priceXlm: "0.1000000", fixtures: { acme: { riskScore: 1 } } },
};

export function rankCompatibleServices({ input, output, merchant }) {
  const eligible = Object.entries(LISTINGS).flatMap(([id, listing]) => {
    if (listing.input !== input || listing.output !== output) return [];
    if (listing.merchant !== merchant) return [];
    const score = listing.qualityBps * 100 - listing.latencyMs - Math.round(Number(listing.priceXlm) * 1000);
    return [{ id, score, ...listing }];
  });
  if (eligible.length === 0) codedRejection("no-compatible-service");
  return stableSort(eligible, (left, right) => right.score - left.score || left.id.localeCompare(right.id));
}
export function assertListingMerchant(serviceId, merchant) {
  const listing = LISTINGS[serviceId];
  if (!listing) codedRejection("unknown-service");
  if (listing.merchant !== merchant) codedRejection("listing-merchant-mismatch");
  return listing;
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "service-bazaar", fixture: true, listings: Object.keys(LISTINGS).sort(), advisory: true };
  return defineScenario({
    id: "service-bazaar",
    negativePathId: "listing-merchant-mismatch",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: LISTINGS },
    routePattern: "/services/:serviceId/results/:fixtureId",
    budgetXlm: "2.0000000",
    amount({ params }) { return LISTINGS[params.serviceId]?.priceXlm ?? "1.0000000"; },
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const listing = LISTINGS[params.serviceId]; return listing && listing.merchant === EXPECTED_MERCHANT && Object.hasOwn(listing.fixtures, params.fixtureId) ? { resourceId: `${params.serviceId}/${params.fixtureId}`, result: listing.fixtures[params.fixtureId], priceXlm: listing.priceXlm } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "service-bazaar", resourceId: preflight.resourceId, result: preflight.result, provenance: { fixture: true, merchantChecked: EXPECTED_MERCHANT } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "service-bazaar", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [{ id: "buy-alpha-risk", path: "/services/alpha/results/acme", price: "1.0000000", expect: "delivery", case: { resourceId: "alpha/acme" } }],
    async runNegativePath() { return { id: "listing-merchant-mismatch", verified: true, evidence: await captureRejection(() => assertListingMerchant("poisoned", EXPECTED_MERCHANT), "listing-merchant-mismatch") }; },
    outputEvidence,
    testVectors: [
      vector("free-listing-index", "free-route", {}, ok({ count: 3, advisory: true }), () => ({ count: Object.keys(LISTINGS).length, advisory: true })),
      vector("rank-compatible-listings", "business-positive", {}, ok({ ids: ["alpha", "beta"] }), () => ({ ids: rankCompatibleServices({ input: "company-id", output: "risk-score", merchant: EXPECTED_MERCHANT }).map(({ id }) => id) })),
      vector("reject-listing-merchant", "business-rejection", {}, rejected("listing-merchant-mismatch"), () => assertListingMerchant("poisoned", EXPECTED_MERCHANT)),
      vector("reject-service-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const body = makeDelivery({ scenarioId: "service-bazaar", resourceId: "alpha/acme", result: { riskScore: 31 }, provenance: { fixture: true } }); body.result.riskScore = 99; return validateDelivery(body, { scenarioId: "service-bazaar", resourceId: "alpha/acme" }); }),
    ],
  }, expectedMetadata);
}
