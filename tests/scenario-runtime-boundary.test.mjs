import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import {
  SCENARIO_HOOK_OUTPUT_LIMITS,
  assertDefinedScenario,
  defineScenario,
  toBoundedDeliveryEvidence,
  toBoundedFinalOutputEvidence,
  toBoundedNegativePathEvidence,
} from "../starter-kit-src/shared/scenario.mjs";

const metadata = Object.freeze({
  fixturePolicy: "deterministic-and-clearly-labeled",
  id: "runtime-boundary",
  negativePathId: "fixture-rejection",
  routePattern: "/items/:itemId",
});

function codedRejection(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function vector(id, kind, expected, run) {
  return { id, kind, input: { fixture: true }, expected, run };
}

function makeScenario() {
  return defineScenario({
    id: "runtime-boundary",
    negativePathId: "fixture-rejection",
    fixtures: {
      policy: "deterministic-and-clearly-labeled",
      version: 1,
      records: { alpha: { fixture: true, value: "alpha" } },
    },
    routePattern: "/items/:itemId",
    budgetXlm: "2.0000000",
    amount: "1.0000000",
    configureFreeRoutes() {},
    preflight() {
      return { fixtureId: "alpha", priceXlm: "1.0000000" };
    },
    fulfill() {
      return { body: { fixtureId: "alpha", value: "alpha" } };
    },
    validateDelivery({ body }) {
      return body;
    },
    deliveryEvidence({ value }) {
      return { fixtureId: value.fixtureId };
    },
    plan: [{
      id: "buy-alpha",
      path: "/items/alpha",
      price: "1.0000000",
      expect: "delivery",
      case: { fixtureId: "alpha" },
    }],
    runNegativePath() {
      return { rejected: true };
    },
    outputEvidence() {
      return { delivered: ["alpha"] };
    },
    testVectors: [
      vector(
        "free-index",
        "free-route",
        { ok: true, value: { fixture: true } },
        () => ({ fixture: true }),
      ),
      vector(
        "business-result",
        "business-positive",
        { ok: true, value: { value: "alpha" } },
        () => ({ value: "alpha" }),
      ),
      vector(
        "business-reject",
        "business-rejection",
        { ok: false, code: "unknown-fixture" },
        () => codedRejection("unknown-fixture"),
      ),
      vector(
        "delivery-reject",
        "delivery-tamper",
        { ok: false, code: "delivery-mismatch" },
        () => codedRejection("delivery-mismatch"),
      ),
    ],
  }, metadata);
}

test("only the exact defineScenario result carries the runtime brand", () => {
  const scenario = makeScenario();
  assert.equal(Object.isFrozen(scenario), true);
  assert.equal(assertDefinedScenario(scenario), scenario);

  const lookalikes = [
    Object.freeze({ ...scenario }),
    Object.freeze(Object.assign(Object.create(null), scenario)),
    new Proxy(scenario, {}),
    Object.freeze({
      id: scenario.id,
      negativePathId: scenario.negativePathId,
      routePattern: scenario.routePattern,
      testVectors: scenario.testVectors,
    }),
  ];
  for (const lookalike of lookalikes) {
    assert.throws(
      () => assertDefinedScenario(lookalike),
      /requires a scenario returned by defineScenario/,
    );
  }
});

test("runtime hook helpers enforce named byte bounds", () => {
  assert.deepEqual(SCENARIO_HOOK_OUTPUT_LIMITS, {
    deliveryEvidenceBytes: 32 * 1024,
    negativePathEvidenceBytes: 128 * 1024,
    finalOutputEvidenceBytes: 128 * 1024,
  });
  assert.equal(Object.isFrozen(SCENARIO_HOOK_OUTPUT_LIMITS), true);

  for (const [convert, maximum, label] of [
    [toBoundedDeliveryEvidence, SCENARIO_HOOK_OUTPUT_LIMITS.deliveryEvidenceBytes, "delivery"],
    [toBoundedNegativePathEvidence, SCENARIO_HOOK_OUTPUT_LIMITS.negativePathEvidenceBytes, "negative path"],
    [toBoundedFinalOutputEvidence, SCENARIO_HOOK_OUTPUT_LIMITS.finalOutputEvidenceBytes, "final output"],
  ]) {
    assert.throws(
      () => convert({ blob: "x".repeat(maximum) }),
      new RegExp(`scenario ${label} evidence is .* maximum`),
    );
  }
});

test("runtime hook helpers clone and deeply freeze JSON evidence", () => {
  const source = { ids: ["alpha"], nested: { accepted: true } };
  for (const convert of [
    toBoundedDeliveryEvidence,
    toBoundedNegativePathEvidence,
    toBoundedFinalOutputEvidence,
  ]) {
    const output = convert(source);
    assert.notEqual(output, source);
    assert.deepEqual(output, source);
    assert.equal(Object.isFrozen(output), true);
    assert.equal(Object.isFrozen(output.ids), true);
    assert.equal(Object.isFrozen(output.nested), true);
  }
  source.ids[0] = "mutated";
  source.nested.accepted = false;
});

test("runtime boundaries reject secret-bearing non-JSON values", () => {
  const unsafe = [
    { secret: 1n },
    { secret: Symbol("secret") },
    { secret: () => "secret" },
    { secret: Buffer.from("secret") },
    { secret: new URL("https://example.test/private") },
    { secret: { sign() {}, secretKey: Buffer.from("secret") } },
  ];
  for (const convert of [
    toBoundedDeliveryEvidence,
    toBoundedNegativePathEvidence,
    toBoundedFinalOutputEvidence,
  ]) {
    for (const value of unsafe) {
      assert.throws(() => convert(value), /non-JSON|non-plain object/);
    }
  }
});
