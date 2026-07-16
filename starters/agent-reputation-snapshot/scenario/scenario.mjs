import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { defineScenario } from "../shared/scenario.mjs";
import {
  FIXTURE_POLICY,
  captureRejection,
  canonicalJson,
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

// Deterministic fixture signers for offline vectors; neither key is funded or production-safe.
const TRUSTED_FIXTURE_SEED = Buffer.from("11".repeat(32), "hex");
const UNTRUSTED_FIXTURE_SEED = Buffer.from("22".repeat(32), "hex");
const PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const trustedFixturePrivateKey = createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, TRUSTED_FIXTURE_SEED]), format: "der", type: "pkcs8" });
const untrustedFixturePrivateKey = createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, UNTRUSTED_FIXTURE_SEED]), format: "der", type: "pkcs8" });
const trustedFixturePublicKey = createPublicKey(trustedFixturePrivateKey);

function signedEvent(event, issuer, fixturePrivateKey) {
  return { ...event, issuer, signature: sign(null, Buffer.from(canonicalJson(event)), fixturePrivateKey).toString("base64") };
}

const EVENTS = [
  signedEvent({ eventId: "e1", agent: "agent-alpha", outcome: "completed", ageSeconds: 40 }, "trusted-fixture", trustedFixturePrivateKey),
  signedEvent({ eventId: "e2", agent: "agent-alpha", outcome: "failed", ageSeconds: 80 }, "trusted-fixture", trustedFixturePrivateKey),
  signedEvent({ eventId: "e3", agent: "agent-alpha", outcome: "completed", ageSeconds: 20 }, "untrusted-fixture", untrustedFixturePrivateKey),
  signedEvent({ eventId: "e4", agent: "agent-alpha", outcome: "completed", ageSeconds: 9000 }, "trusted-fixture", trustedFixturePrivateKey),
];

export function reputationSnapshot(agent, events = EVENTS, freshnessSeconds = 3600) {
  const accepted = [];
  const excluded = [];
  for (const event of events) {
    const { signature, issuer, ...payload } = event;
    if (issuer !== "trusted-fixture") { excluded.push({ eventId: event.eventId, reason: "untrusted-issuer" }); continue; }
    if (!verify(null, Buffer.from(canonicalJson(payload)), trustedFixturePublicKey, Buffer.from(signature, "base64"))) codedRejection("invalid-event-signature");
    if (payload.ageSeconds > freshnessSeconds) { excluded.push({ eventId: event.eventId, reason: "stale-event" }); continue; }
    if (payload.agent === agent) accepted.push(payload);
  }
  if (accepted.length === 0) codedRejection("no-trusted-events");
  const completed = accepted.filter(({ outcome }) => outcome === "completed").length;
  const score = Math.round((completed / accepted.length) * 10_000);
  return { agent, scoreBps: score, acceptedEventIds: accepted.map(({ eventId }) => eventId), excluded };
}

export function assertTrustedIssuer(event) {
  if (event.issuer !== "trusted-fixture") codedRejection("untrusted-reputation-issuer");
  return event;
}

export function createScenario(expectedMetadata) {
  const manifest = { scenarioId: "agent-reputation-snapshot", fixture: true, issuer: "trusted-fixture", freshnessSeconds: 3600 };
  return defineScenario({
    id: "agent-reputation-snapshot",
    negativePathId: "untrusted-reputation-issuer",
    fixtures: { policy: FIXTURE_POLICY, version: 1, records: { events: EVENTS, trustSet: ["trusted-fixture"] } },
    routePattern: "/agents/:agentAddress/reputation",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes(routes) { registerManifestRoute(routes, manifest); },
    preflight({ params }) { return params.agentAddress === "agent-alpha" ? { resourceId: params.agentAddress, priceXlm: "1.0000000" } : false; },
    fulfill({ preflight }) { return { body: makeDelivery({ scenarioId: "agent-reputation-snapshot", resourceId: preflight.resourceId, result: reputationSnapshot(preflight.resourceId), provenance: { fixture: true, issuer: "trusted-fixture" } }) }; },
    validateDelivery({ body, step }) { return validateDelivery(body, { scenarioId: "agent-reputation-snapshot", resourceId: step.case.resourceId }); },
    deliveryEvidence,
    plan: [{ id: "buy-agent-alpha-score", path: "/agents/agent-alpha/reputation", price: "1.0000000", expect: "delivery", case: { resourceId: "agent-alpha" } }],
    async runNegativePath() { return { id: "untrusted-reputation-issuer", verified: true, evidence: await captureRejection(() => assertTrustedIssuer(EVENTS[2]), "untrusted-reputation-issuer") }; },
    outputEvidence,
    testVectors: [
      vector("free-trust-policy", "free-route", {}, ok({ issuer: "trusted-fixture", freshnessSeconds: 3600 }), () => ({ issuer: "trusted-fixture", freshnessSeconds: 3600 })),
      vector("calculate-reputation", "business-positive", {}, ok({ scoreBps: 5000, accepted: ["e1", "e2"], excluded: 2 }), () => { const value = reputationSnapshot("agent-alpha"); return { scoreBps: value.scoreBps, accepted: value.acceptedEventIds, excluded: value.excluded.length }; }),
      vector("reject-untrusted-issuer", "business-rejection", {}, rejected("untrusted-reputation-issuer"), () => assertTrustedIssuer(EVENTS[2])),
      vector("reject-reputation-tamper", "delivery-tamper", {}, rejected("delivery-integrity-mismatch"), () => { const body = makeDelivery({ scenarioId: "agent-reputation-snapshot", resourceId: "agent-alpha", result: reputationSnapshot("agent-alpha"), provenance: { fixture: true } }); body.result.scoreBps = 10000; return validateDelivery(body, { scenarioId: "agent-reputation-snapshot", resourceId: "agent-alpha" }); }),
    ],
  }, expectedMetadata);
}
