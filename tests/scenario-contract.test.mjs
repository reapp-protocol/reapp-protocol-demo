import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  REQUIRED_SCENARIO_VECTOR_KINDS,
  SCENARIO_CONTRACT_LIMITS,
  defineScenario,
  runScenarioTestVectors,
  toBoundedScenarioOutput,
} from "../starter-kit-src/shared/scenario.mjs";

const EXPECTED_METADATA = Object.freeze({
  id: "sample-scenario",
  negativePathId: "sample-rejection",
  routePattern: "/things/:thingId",
  fixturePolicy: "deterministic-and-clearly-labeled",
});

function rejectWith(code) {
  const error = new Error(`fixture rejection: ${code}`);
  error.code = code;
  throw error;
}

function makeVectors() {
  return [
    {
      id: "free-index",
      kind: "free-route",
      input: { includePrice: true },
      expected: { ok: true, value: { fixture: true, priceXlm: "1.0000000" } },
      run(input) {
        return { fixture: true, priceXlm: input.includePrice ? "1.0000000" : null };
      },
    },
    {
      id: "sort-values",
      kind: "business-positive",
      input: { values: [3, 1, 2] },
      expected: { ok: true, value: { values: [1, 2, 3] } },
      run(input) {
        return { values: [...input.values].sort((left, right) => left - right) };
      },
    },
    {
      id: "reject-missing-fixture",
      kind: "business-rejection",
      input: { fixtureId: "missing" },
      expected: { ok: false, code: "unknown-fixture" },
      run() {
        rejectWith("unknown-fixture");
      },
    },
    {
      id: "reject-tampered-delivery",
      kind: "delivery-tamper",
      input: { digest: "tampered" },
      expected: { ok: false, code: "delivery-hash-mismatch" },
      async run() {
        rejectWith("delivery-hash-mismatch");
      },
    },
  ];
}

function makeDefinition() {
  return {
    id: "sample-scenario",
    negativePathId: "sample-rejection",
    fixtures: {
      policy: "deterministic-and-clearly-labeled",
      version: 1,
      records: {
        alpha: {
          fixture: true,
          payload: { title: "Alpha", values: [1, 2, 3] },
        },
      },
    },
    routePattern: "/things/:thingId",
    budgetXlm: "4.0000000",
    amount: "1.0000000",
    configureFreeRoutes() {},
    preflight() {
      return { fixtureId: "alpha", priceXlm: "1.0000000", work: {} };
    },
    fulfill() {
      return { body: { fixtureId: "alpha" } };
    },
    validateDelivery({ body }) {
      return body;
    },
    deliveryEvidence({ value }) {
      return { fixtureId: "alpha", facts: value };
    },
    plan: [
      {
        id: "buy-alpha",
        path: "/things/alpha?view=full",
        price: "1.0000000",
        expect: "delivery",
        case: { fixtureId: "alpha" },
      },
    ],
    runNegativePath() {
      return { id: "sample-rejection", checks: [] };
    },
    outputEvidence() {
      return { schemaVersion: 1, artifactIds: ["alpha"], facts: {} };
    },
    testVectors: makeVectors(),
  };
}

function defineValidScenario(definition = makeDefinition(), metadata = EXPECTED_METADATA) {
  return defineScenario(definition, metadata);
}

test("defineScenario validates injected catalog metadata and deeply freezes JSON", () => {
  const definition = makeDefinition();
  const scenario = defineValidScenario(definition);

  assert.deepEqual(Object.keys(scenario).sort(), [
    "amount",
    "budgetXlm",
    "configureFreeRoutes",
    "deliveryEvidence",
    "fixtures",
    "fulfill",
    "id",
    "negativePathId",
    "outputEvidence",
    "plan",
    "preflight",
    "routePattern",
    "runNegativePath",
    "testVectors",
    "validateDelivery",
  ].sort());
  for (const value of [
    scenario,
    scenario.fixtures,
    scenario.fixtures.records,
    scenario.fixtures.records.alpha,
    scenario.fixtures.records.alpha.payload,
    scenario.fixtures.records.alpha.payload.values,
    scenario.plan,
    scenario.plan[0],
    scenario.plan[0].case,
    scenario.testVectors,
    scenario.testVectors[0],
    scenario.testVectors[0].input,
    scenario.testVectors[0].expected,
    scenario.testVectors[0].expected.value,
  ]) assert.equal(Object.isFrozen(value), true);

  definition.fixtures.records.alpha.payload.title = "mutated";
  definition.plan[0].case.fixtureId = "mutated";
  definition.testVectors[0].input.includePrice = false;
  assert.equal(scenario.fixtures.records.alpha.payload.title, "Alpha");
  assert.equal(scenario.plan[0].case.fixtureId, "alpha");
  assert.equal(scenario.testVectors[0].input.includePrice, true);
});

test("catalog parity is caller supplied and every compared field is exact", () => {
  for (const [field, replacement, pattern] of [
    ["id", "other-scenario", /id does not match/],
    ["negativePathId", "other-rejection", /negativePathId does not match/],
    ["routePattern", "/other/:thingId", /routePattern does not match/],
  ]) {
    const definition = makeDefinition();
    definition[field] = replacement;
    assert.throws(() => defineValidScenario(definition), pattern);
  }
  assert.throws(
    () => defineValidScenario(makeDefinition(), { ...EXPECTED_METADATA, extra: true }),
    /expected metadata must contain exactly/,
  );
  assert.throws(
    () => defineValidScenario(makeDefinition(), {
      ...EXPECTED_METADATA,
      fixturePolicy: "unlabeled",
    }),
    /fixturePolicy is not supported/,
  );
});

test("scenario, fixture, plan, and vector objects reject unknown or missing keys", () => {
  const extraScenario = makeDefinition();
  extraScenario.extra = true;
  assert.throws(() => defineValidScenario(extraScenario), /scenario must contain exactly/);

  const missingScenario = makeDefinition();
  delete missingScenario.outputEvidence;
  assert.throws(() => defineValidScenario(missingScenario), /scenario must contain exactly/);

  const extraFixtures = makeDefinition();
  extraFixtures.fixtures.extra = true;
  assert.throws(() => defineValidScenario(extraFixtures), /fixtures must contain exactly/);

  const extraPlan = makeDefinition();
  extraPlan.plan[0].extra = true;
  assert.throws(() => defineValidScenario(extraPlan), /plan step 1 must contain exactly/);

  const extraVector = makeDefinition();
  extraVector.testVectors[0].extra = true;
  assert.throws(() => defineValidScenario(extraVector), /test vector 1 must contain exactly/);

  const accessor = makeDefinition();
  Object.defineProperty(accessor, "id", { enumerable: true, get: () => "sample-scenario" });
  assert.throws(() => defineValidScenario(accessor), /cannot contain accessors/);
});

test("identifiers, routes, paths, and exact XLM amounts fail closed", () => {
  const invalidId = makeDefinition();
  invalidId.id = "Sample Scenario";
  assert.throws(() => defineValidScenario(invalidId), /scenario id must be/);

  for (const amount of ["0", "0.0000000", "01", ".5", "1.", "1.00000000", "1e2", 1]) {
    const definition = makeDefinition();
    definition.budgetXlm = amount;
    assert.throws(() => defineValidScenario(definition), /budgetXlm/);
  }

  const invalidRoute = makeDefinition();
  invalidRoute.routePattern = "/things/*";
  assert.throws(() => defineValidScenario(invalidRoute), /routePattern/);

  const wrongPlanRoute = makeDefinition();
  wrongPlanRoute.plan[0].path = "/elsewhere/alpha";
  assert.throws(() => defineValidScenario(wrongPlanRoute), /does not match/);

  const nonCanonicalPath = makeDefinition();
  nonCanonicalPath.plan[0].path = "/things/../things/alpha";
  assert.throws(() => defineValidScenario(nonCanonicalPath), /not canonical/);
});

test("plans require unique delivery ids and exact paths", () => {
  const duplicateId = makeDefinition();
  duplicateId.plan.push({ ...duplicateId.plan[0], path: "/things/beta", case: { fixtureId: "beta" } });
  assert.throws(() => defineValidScenario(duplicateId), /step id buy-alpha is duplicated/);

  const duplicatePath = makeDefinition();
  duplicatePath.plan.push({ ...duplicatePath.plan[0], id: "buy-beta", case: { fixtureId: "beta" } });
  assert.throws(() => defineValidScenario(duplicatePath), /plan path .* is duplicated/);

  const negativeInPlan = makeDefinition();
  negativeInPlan.plan[0].expect = "budget-rejection";
  assert.throws(() => defineValidScenario(negativeInPlan), /expect must be delivery/);
});

test("all four vector kinds and unique vector ids are mandatory", () => {
  assert.deepEqual(REQUIRED_SCENARIO_VECTOR_KINDS, [
    "free-route",
    "business-positive",
    "business-rejection",
    "delivery-tamper",
  ]);
  const missingKind = makeDefinition();
  missingKind.testVectors.pop();
  assert.throws(() => defineValidScenario(missingKind), /missing required kinds: delivery-tamper/);

  const duplicate = makeDefinition();
  duplicate.testVectors[1].id = duplicate.testVectors[0].id;
  assert.throws(() => defineValidScenario(duplicate), /test vector id free-index is duplicated/);

  const unsupported = makeDefinition();
  unsupported.testVectors[0].kind = "network";
  assert.throws(() => defineValidScenario(unsupported), /kind is not supported/);
});

test("vector expectations use normalized success values or stable rejection codes", () => {
  const extraSuccessKey = makeDefinition();
  extraSuccessKey.testVectors[0].expected.extra = true;
  assert.throws(() => defineValidScenario(extraSuccessKey), /expected success must contain exactly/);

  const invalidCode = makeDefinition();
  invalidCode.testVectors[2].expected.code = "UNKNOWN_FIXTURE";
  assert.throws(() => defineValidScenario(invalidCode), /rejection code must be/);

  const missingOk = makeDefinition();
  delete missingOk.testVectors[0].expected.ok;
  assert.throws(() => defineValidScenario(missingOk), /must set ok to true or false/);
});

test("runScenarioTestVectors executes sequentially and returns frozen normalized evidence", async () => {
  const scenario = defineValidScenario();
  const results = await runScenarioTestVectors(scenario);
  assert.equal(results.length, 4);
  assert.deepEqual(results.map(({ id, kind, passed }) => ({ id, kind, passed })), [
    { id: "free-index", kind: "free-route", passed: true },
    { id: "sort-values", kind: "business-positive", passed: true },
    { id: "reject-missing-fixture", kind: "business-rejection", passed: true },
    { id: "reject-tampered-delivery", kind: "delivery-tamper", passed: true },
  ]);
  assert.equal(Object.isFrozen(results), true);
  assert.equal(Object.isFrozen(results[0]), true);
  assert.equal(Object.isFrozen(results[0].actual), true);
  assert.deepEqual(results[2].actual, { ok: false, code: "unknown-fixture" });
  await assert.rejects(
    runScenarioTestVectors(Object.freeze({ testVectors: Object.freeze([]) })),
    /requires a scenario returned by defineScenario/,
  );
});

test("the vector runner rejects mismatches and uncoded exceptions", async () => {
  const mismatch = makeDefinition();
  mismatch.testVectors[0].expected.value.priceXlm = "2.0000000";
  await assert.rejects(runScenarioTestVectors(defineValidScenario(mismatch)), /free-index failed/);

  const uncoded = makeDefinition();
  uncoded.testVectors[2].run = () => {
    throw new Error("message-only rejection");
  };
  await assert.rejects(
    runScenarioTestVectors(defineValidScenario(uncoded)),
    /threw without a lowercase kebab-case error code/,
  );
});

test("fixtures, plan cases, vectors, results, and hook outputs are size bounded", async () => {
  const fixtures = makeDefinition();
  fixtures.fixtures.records = { blob: "x".repeat(SCENARIO_CONTRACT_LIMITS.fixtureBytes) };
  assert.throws(() => defineValidScenario(fixtures), /fixture records is .* maximum/);

  const planCase = makeDefinition();
  planCase.plan[0].case = { blob: "x".repeat(SCENARIO_CONTRACT_LIMITS.planCaseBytes) };
  assert.throws(() => defineValidScenario(planCase), /plan step 1 case is .* maximum/);

  const vectorInput = makeDefinition();
  vectorInput.testVectors[0].input = {
    blob: "x".repeat(SCENARIO_CONTRACT_LIMITS.testVectorInputBytes),
  };
  assert.throws(() => defineValidScenario(vectorInput), /test vector 1 input is .* maximum/);

  const oversizedResult = makeDefinition();
  oversizedResult.testVectors[0].run = () => (
    { blob: "x".repeat(SCENARIO_CONTRACT_LIMITS.testVectorResultBytes) }
  );
  await assert.rejects(
    runScenarioTestVectors(defineValidScenario(oversizedResult)),
    /test vector free-index result is .* maximum/,
  );

  assert.throws(
    () => toBoundedScenarioOutput({ blob: "x".repeat(32) }, "small output", 16),
    /small output is .* maximum/,
  );
});

test("strict JSON rejects cycles, undefined values, accessors, and non-finite numbers", () => {
  const cycle = {};
  cycle.self = cycle;
  for (const records of [
    { value: undefined },
    { value: Number.NaN },
    { value: 1n },
    cycle,
  ]) {
    const definition = makeDefinition();
    definition.fixtures.records = records;
    assert.throws(() => defineValidScenario(definition), /non-JSON|non-finite|cycle/);
  }

  const recordsWithAccessor = {};
  Object.defineProperty(recordsWithAccessor, "secret", { enumerable: true, get: () => "value" });
  const definition = makeDefinition();
  definition.fixtures.records = recordsWithAccessor;
  assert.throws(() => defineValidScenario(definition), /contains an accessor/);
});

test("toBoundedScenarioOutput returns an independent deeply frozen JSON object", () => {
  const source = { schemaVersion: 1, nested: { ids: ["alpha"] } };
  const output = toBoundedScenarioOutput(source);
  source.nested.ids[0] = "mutated";
  assert.deepEqual(output, { schemaVersion: 1, nested: { ids: ["alpha"] } });
  assert.equal(Object.isFrozen(output), true);
  assert.equal(Object.isFrozen(output.nested), true);
  assert.equal(Object.isFrozen(output.nested.ids), true);
  assert.throws(() => toBoundedScenarioOutput([]), /must be a JSON object/);
  assert.throws(() => toBoundedScenarioOutput({}, "output", 0), /positive safe integer/);
});

test("the scenario definition layer imports no catalog and performs no I/O", async () => {
  const source = await readFile(
    new URL("../starter-kit-src/shared/scenario.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /catalog\.json|scripts\/starters|node:(?:fs|http|https|net)/);
  assert.doesNotMatch(source, /\b(?:fetch|setTimeout|setInterval)\s*\(|process\.env|Math\.random|Date\.now/);
  for (const match of source.matchAll(/\bfrom\s+["']([^"']+)["']/g)) {
    assert.match(match[1], /^(?:node:(?:buffer|util)|\.\/evidence\.mjs)$/);
  }
});
