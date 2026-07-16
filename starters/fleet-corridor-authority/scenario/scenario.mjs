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
  validateDelivery,
  vector,
} from "./support.mjs";

const ROUTES = {
  "route-north": {
    weatherEpoch: "wx-2026-07-16t08",
    segments: {
      "segment-1": { order: 1, from: "hub-a", to: "hub-b", clearance: "open" },
      "segment-2": { order: 2, from: "hub-b", to: "hub-c", clearance: "open" },
      "segment-3": { order: 3, from: "hub-c", to: "hub-d", clearance: "open" },
    },
  },
};

export function clearance(routeId, segmentId, completedOrders, weatherEpoch) {
  const route = ROUTES[routeId];
  const segment = route?.segments[segmentId];
  if (!segment) codedRejection("unknown-corridor-segment");
  if (weatherEpoch !== route.weatherEpoch) codedRejection("weather-epoch-mismatch");
  const expectedOrder = completedOrders.length + 1;
  if (segment.order !== expectedOrder || completedOrders.some((order, index) => order !== index + 1)) codedRejection("segment-sequence-invalid");
  return { routeId, segmentId, order: segment.order, from: segment.from, to: segment.to, clearance: segment.clearance, weatherEpoch };
}
export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "fleet-corridor-authority", fixture: true, routeId: "route-north", segmentCount: 3, weatherEpoch: ROUTES["route-north"].weatherEpoch };
  return defineScenario({
    id: "fleet-corridor-authority",
    negativePathId: "operator-revocation",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: ROUTES },
    routePattern: "/corridors/:routeId/segments/:segmentId",
    budgetXlm: "4.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const segment = ROUTES[params.routeId]?.segments[params.segmentId]; return segment ? { resourceId: `${params.routeId}/${params.segmentId}`, routeId: params.routeId, segmentId: params.segmentId, priceXlm: "1.0000000" } : false; },
    fulfill({ preflight }) { const completed = preflight.segmentId === "segment-1" ? [] : preflight.segmentId === "segment-2" ? [1] : [1, 2]; return { body: makeDelivery({ scenarioId: "fleet-corridor-authority", resourceId: preflight.resourceId, result: clearance(preflight.routeId, preflight.segmentId, completed, manifest.weatherEpoch), provenance: { fixture: true, sequenceChecked: true } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "fleet-corridor-authority", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [
      { id: "buy-segment-one", path: "/corridors/route-north/segments/segment-1", price: "1.0000000", expect: "delivery", case: { resourceId: "route-north/segment-1" } },
      { id: "buy-segment-two", path: "/corridors/route-north/segments/segment-2", price: "1.0000000", expect: "delivery", case: { resourceId: "route-north/segment-2" } },
    ],
    async runNegativePath({ actions }) { const expectRevocation = assertAction(actions, "expectRevocationRejection"); return { id: "operator-revocation", verified: true, evidence: await expectRevocation({ path: "/corridors/route-north/segments/segment-3", priceXlm: "1.0000000" }) }; },
    outputEvidence,
    testVectors: [
      vector("free-corridor-manifest", "free-route", {}, ok({ routeId: "route-north", segmentCount: 3 }), () => ({ routeId: manifest.routeId, segmentCount: manifest.segmentCount })),
      vector("validate-next-segment", "business-positive", {}, ok({ order: 2, from: "hub-b", to: "hub-c" }), () => { const result = clearance("route-north", "segment-2", [1], manifest.weatherEpoch); return { order: result.order, from: result.from, to: result.to }; }),
      vector("reject-out-of-order-segment", "business-rejection", {}, rejected("segment-sequence-invalid"), () => clearance("route-north", "segment-3", [1], manifest.weatherEpoch)),
      vector("reject-clearance-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const body = makeDelivery({ scenarioId: "fleet-corridor-authority", resourceId: "route-north/segment-1", result: clearance("route-north", "segment-1", [], manifest.weatherEpoch), provenance: { fixture: true } }); body.result.clearance = "closed"; return validateDelivery(body, { scenarioId: "fleet-corridor-authority", resourceId: "route-north/segment-1" }); }),
    ],
  }, expectedMetadata);
}
