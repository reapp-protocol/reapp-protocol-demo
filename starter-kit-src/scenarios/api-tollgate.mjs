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

const ROUTES = {
  "inventory/widget-a": { service: "inventory", resourceId: "widget-a", upstreamPath: "/v1/inventory/widget-a", payload: { available: 18, warehouse: "bkk-1" } },
  "weather/bangkok": { service: "weather", resourceId: "bangkok", upstreamPath: "/v1/weather/bangkok", payload: { condition: "clear", celsius: 31 } },
};

export function resolveUpstream(service, resourceId) {
  const key = `${service}/${resourceId}`;
  if (!Object.hasOwn(ROUTES, key)) codedRejection("upstream-not-allowlisted");
  const route = ROUTES[key];
  return { service: route.service, resourceId: route.resourceId, upstreamPath: route.upstreamPath, payload: route.payload };
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "api-tollgate", fixture: true, routes: Object.keys(ROUTES).sort() };
  return defineScenario({
    id: "api-tollgate",
    negativePathId: "upstream-not-allowlisted",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: ROUTES },
    routePattern: "/gateway/:service/:resourceId",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { try { const route = resolveUpstream(params.service, params.resourceId); return { resourceId: `${route.service}/${route.resourceId}`, route, priceXlm: "1.0000000" }; } catch (error) { if (error.code === "upstream-not-allowlisted") return false; throw error; } },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "api-tollgate", resourceId: preflight.resourceId, result: preflight.route.payload, provenance: { fixture: true, upstreamPath: preflight.route.upstreamPath, forwardedHeaders: [] } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "api-tollgate", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [{ id: "buy-inventory", path: "/gateway/inventory/widget-a", price: "1.0000000", expect: "delivery", case: { resourceId: "inventory/widget-a" } }],
    async runNegativePath() { return { id: "upstream-not-allowlisted", verified: true, evidence: await captureRejection(() => resolveUpstream("admin", "restricted"), "upstream-not-allowlisted") }; },
    outputEvidence,
    testVectors: [
      vector("free-route-index", "free-route", {}, ok({ count: 2 }), () => ({ count: Object.keys(ROUTES).length })),
      vector("resolve-inventory-route", "business-positive", {}, ok({ path: "/v1/inventory/widget-a", available: 18 }), () => { const route = resolveUpstream("inventory", "widget-a"); return { path: route.upstreamPath, available: route.payload.available }; }),
      vector("reject-unknown-upstream", "business-rejection", {}, rejected("upstream-not-allowlisted"), () => resolveUpstream("internal", "users")),
      vector("reject-gateway-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const body = makeDelivery({ scenarioId: "api-tollgate", resourceId: "inventory/widget-a", result: { available: 18 }, provenance: { fixture: true } }); body.result.available = 19; return validateDelivery(body, { scenarioId: "api-tollgate", resourceId: "inventory/widget-a" }); }),
    ],
  }, expectedMetadata);
}
