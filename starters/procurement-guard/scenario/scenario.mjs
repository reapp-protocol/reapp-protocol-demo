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

const APPROVED_VENDORS = new Set(["vendor-alpha", "vendor-beta"]);
const QUOTES = {
  "vendor-alpha/rfq-7": { vendorId: "vendor-alpha", requestId: "rfq-7", totalUsdCents: 12900, leadDays: 3, quoteAgeMinutes: 20, items: [{ sku: "sensor", quantity: 3 }] },
  "vendor-beta/rfq-7": { vendorId: "vendor-beta", requestId: "rfq-7", totalUsdCents: 12100, leadDays: 7, quoteAgeMinutes: 25, items: [{ sku: "sensor", quantity: 3 }] },
  "vendor-rogue/rfq-7": { vendorId: "vendor-rogue", requestId: "rfq-7", totalUsdCents: 5000, leadDays: 1, quoteAgeMinutes: 5, items: [{ sku: "sensor", quantity: 3 }] },
};

export function assertApprovedVendor(vendorId) {
  if (!APPROVED_VENDORS.has(vendorId)) codedRejection("unauthorized-vendor");
  return vendorId;
}

export function selectQuote(requestId, maximumLeadDays, maximumQuoteAgeMinutes = 60) {
  const eligible = Object.values(QUOTES).filter((quote) => quote.requestId === requestId && APPROVED_VENDORS.has(quote.vendorId) && quote.leadDays <= maximumLeadDays && quote.quoteAgeMinutes <= maximumQuoteAgeMinutes);
  if (eligible.length === 0) codedRejection("no-approved-quote");
  return stableSort(eligible, (left, right) => left.totalUsdCents - right.totalUsdCents || left.leadDays - right.leadDays)[0];
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "procurement-guard", fixture: true, approvedVendors: [...APPROVED_VENDORS].sort(), requestIds: ["rfq-7"] };
  return defineScenario({
    id: "procurement-guard",
    negativePathId: "unauthorized-vendor",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: QUOTES },
    routePattern: "/vendors/:vendorId/quote-packs/:requestId",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const quote = QUOTES[`${params.vendorId}/${params.requestId}`]; return quote && APPROVED_VENDORS.has(params.vendorId) ? { resourceId: `${params.vendorId}/${params.requestId}`, quote, priceXlm: "1.0000000" } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "procurement-guard", resourceId: preflight.resourceId, result: { ...preflight.quote, policy: { vendorApproved: true, quoteFresh: preflight.quote.quoteAgeMinutes <= 60 } }, provenance: { fixture: true, selectionPolicy: "lowest-cost-within-lead-time" } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "procurement-guard", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [{ id: "buy-alpha-quote-pack", path: "/vendors/vendor-alpha/quote-packs/rfq-7", price: "1.0000000", expect: "delivery", case: { resourceId: "vendor-alpha/rfq-7" } }],
    async runNegativePath() { return { id: "unauthorized-vendor", verified: true, cheaperQuoteUsdCents: QUOTES["vendor-rogue/rfq-7"].totalUsdCents, evidence: await captureRejection(() => assertApprovedVendor("vendor-rogue"), "unauthorized-vendor") }; },
    outputEvidence,
    testVectors: [
      vector("free-vendor-policy", "free-route", {}, ok({ approved: ["vendor-alpha", "vendor-beta"], requests: ["rfq-7"] }), () => ({ approved: manifest.approvedVendors, requests: manifest.requestIds })),
      vector("select-approved-quote", "business-positive", {}, ok({ vendorId: "vendor-alpha", totalUsdCents: 12900, leadDays: 3 }), () => { const result = selectQuote("rfq-7", 5); return { vendorId: result.vendorId, totalUsdCents: result.totalUsdCents, leadDays: result.leadDays }; }),
      vector("reject-unauthorized-vendor", "business-rejection", {}, rejected("unauthorized-vendor"), () => assertApprovedVendor("vendor-rogue")),
      vector("reject-quote-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const quote = QUOTES["vendor-alpha/rfq-7"]; const body = makeDelivery({ scenarioId: "procurement-guard", resourceId: "vendor-alpha/rfq-7", result: quote, provenance: { fixture: true } }); body.result.totalUsdCents = 1; return validateDelivery(body, { scenarioId: "procurement-guard", resourceId: "vendor-alpha/rfq-7" }); }),
    ],
  }, expectedMetadata);
}
