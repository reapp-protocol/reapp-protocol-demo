import { createHash } from "node:crypto";
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

const SEEDS = { alpha: "72656170702d616c706861", beta: "72656170702d62657461" };
const TIERS = { small: { iterations: 128, priceXlm: "0.5000000" }, medium: { iterations: 512, priceXlm: "1.0000000" } };
const MAX_ITERATIONS = 512;

export function hashChain(seedHex, iterations) {
  if (!/^[0-9a-f]+$/.test(seedHex) || seedHex.length % 2 !== 0) codedRejection("invalid-compute-seed");
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > MAX_ITERATIONS) codedRejection("compute-tier-over-ceiling");
  let value = Buffer.from(seedHex, "hex");
  for (let index = 0; index < iterations; index += 1) value = createHash("sha256").update(value).digest();
  return { digest: value.toString("hex"), iterations };
}

function compute(tier, seedId) {
  if (!Object.hasOwn(TIERS, tier) || !Object.hasOwn(SEEDS, seedId)) codedRejection("unknown-compute-fixture");
  return { tier, seedId, ...hashChain(SEEDS[seedId], TIERS[tier].iterations) };
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "compute-broker", fixture: true, tiers: TIERS, maxIterations: MAX_ITERATIONS };
  return defineScenario({
    id: "compute-broker",
    negativePathId: "compute-tier-over-ceiling",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: { seeds: SEEDS, tiers: TIERS, maxIterations: MAX_ITERATIONS } },
    routePattern: "/compute/sha256-chain/:tier/:seedId",
    budgetXlm: "2.0000000",
    amount({ params }) { return TIERS[params.tier]?.priceXlm ?? "1.0000000"; },
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { const tier = TIERS[params.tier]; return tier && Object.hasOwn(SEEDS, params.seedId) ? { resourceId: `${params.tier}/${params.seedId}`, tier: params.tier, seedId: params.seedId, priceXlm: tier.priceXlm } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "compute-broker", resourceId: preflight.resourceId, result: compute(preflight.tier, preflight.seedId), provenance: { fixture: true, algorithm: "sha256-chain" } }) }; },
    validateDelivery({ body, step }) { const result = validateDelivery(body, { scenarioId: "compute-broker", resourceId: step.case.resourceId }); const recomputed = compute(result.tier, result.seedId); if (recomputed.digest !== result.digest) codedRejection("compute-digest-mismatch"); return result; },
    deliveryEvidence,
    plan: [{ id: "buy-small-alpha", path: "/compute/sha256-chain/small/alpha", price: "0.5000000", expect: "delivery", case: { resourceId: "small/alpha" } }],
    async runNegativePath() { return { id: "compute-tier-over-ceiling", verified: true, evidence: await captureRejection(() => hashChain(SEEDS.alpha, MAX_ITERATIONS + 1), "compute-tier-over-ceiling") }; },
    outputEvidence,
    testVectors: [
      vector("free-compute-policy", "free-route", {}, ok({ maxIterations: 512, tiers: ["medium", "small"] }), () => ({ maxIterations: MAX_ITERATIONS, tiers: Object.keys(TIERS).sort() })),
      vector("compute-small-vector", "business-positive", {}, ok({ digest: "6ee752ca54df6cd9", iterations: 128 }), () => { const result = compute("small", "alpha"); return { digest: result.digest.slice(0, 16), iterations: result.iterations }; }),
      vector("reject-excessive-work", "business-rejection", {}, rejected("compute-tier-over-ceiling"), () => hashChain(SEEDS.alpha, 513)),
      vector("reject-compute-tamper", "delivery-tamper", {}, rejected("compute-digest-mismatch"), () => { const result = compute("small", "alpha"); const body = makeDelivery({ scenarioId: "compute-broker", resourceId: "small/alpha", result: { ...result, digest: "0".repeat(64) }, provenance: { fixture: true } }); const value = validateDelivery(body, { scenarioId: "compute-broker", resourceId: "small/alpha" }); const recomputed = compute(value.tier, value.seedId); if (recomputed.digest !== value.digest) codedRejection("compute-digest-mismatch"); return value; }),
    ],
  }, expectedMetadata);
}
