import { Buffer } from "node:buffer";
import { isDeepStrictEqual } from "node:util";
import {
  canonicalJsonStringify,
  toJsonSafeObject,
  toJsonSafeValue,
} from "./evidence.mjs";

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ERROR_CODE = IDENTIFIER;
const EXACT_AMOUNT = /^(?:0|[1-9]\d*)(?:\.(\d{1,7}))?$/;
const ROUTE_PARAMETER = /^:[A-Za-z][A-Za-z0-9]*$/;
const ROUTE_LITERAL = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

const SCENARIO_KEYS = Object.freeze([
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
]);
const EXPECTED_METADATA_KEYS = Object.freeze([
  "fixturePolicy",
  "id",
  "negativePathId",
  "routePattern",
]);
const FIXTURE_KEYS = Object.freeze(["policy", "records", "version"]);
const PLAN_STEP_KEYS = Object.freeze(["case", "expect", "id", "path", "price"]);
const VECTOR_KEYS = Object.freeze(["expected", "id", "input", "kind", "run"]);
const SUCCESS_EXPECTATION_KEYS = Object.freeze(["ok", "value"]);
const REJECTION_EXPECTATION_KEYS = Object.freeze(["code", "ok"]);
const definedScenarios = new WeakSet();

export const REQUIRED_SCENARIO_VECTOR_KINDS = Object.freeze([
  "free-route",
  "business-positive",
  "business-rejection",
  "delivery-tamper",
]);

export const SCENARIO_CONTRACT_LIMITS = Object.freeze({
  fixtureBytes: 512 * 1024,
  hookOutputBytes: 128 * 1024,
  planBytes: 256 * 1024,
  planCaseBytes: 32 * 1024,
  planSteps: 64,
  testVectorBytes: 512 * 1024,
  testVectorCount: 128,
  testVectorInputBytes: 64 * 1024,
  testVectorExpectedBytes: 64 * 1024,
  testVectorResultBytes: 64 * 1024,
});

/**
 * Runtime-facing bounds for values returned by scenario hooks. Keeping the
 * names explicit prevents a caller from accidentally applying a fixture or
 * test-vector limit to persisted delivery evidence.
 */
export const SCENARIO_HOOK_OUTPUT_LIMITS = Object.freeze({
  deliveryEvidenceBytes: 32 * 1024,
  negativePathEvidenceBytes: SCENARIO_CONTRACT_LIMITS.hookOutputBytes,
  finalOutputEvidenceBytes: SCENARIO_CONTRACT_LIMITS.hookOutputBytes,
});

function fail(message) {
  throw new Error(`scenario contract: ${message}`);
}

function assertPlainDataObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail(`${label} must be a plain object`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") fail(`${label} cannot contain symbol keys`);
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      fail(`${label} cannot contain accessors`);
    }
  }
  return value;
}

function assertExactKeys(value, expectedKeys, label) {
  assertPlainDataObject(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length
    || !actual.every((key, index) => key === expected[index])
  ) {
    fail(`${label} must contain exactly: ${expected.join(", ")}`);
  }
  return value;
}

function assertIdentifier(value, label) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    fail(`${label} must be a lowercase kebab-case identifier`);
  }
  return value;
}

function assertFunction(value, label) {
  if (typeof value !== "function") fail(`${label} must be a function`);
  return value;
}

function assertExactAmount(value, label) {
  if (typeof value !== "string") fail(`${label} must be an exact decimal string`);
  if (!EXACT_AMOUNT.test(value)) {
    fail(`${label} must be canonical with no more than seven decimal places`);
  }
  const [whole, fraction = ""] = value.split(".");
  const stroops = BigInt(whole) * 10_000_000n
    + BigInt(fraction.padEnd(7, "0") || "0");
  if (stroops <= 0n) fail(`${label} must be greater than zero`);
  return value;
}

function assertRoutePattern(value, label = "routePattern") {
  if (
    typeof value !== "string"
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.endsWith("/")
    || value.includes("?")
    || value.includes("#")
    || /[\r\n]/.test(value)
  ) {
    fail(`${label} must be an exact absolute GET route without a query or fragment`);
  }
  const segments = value.slice(1).split("/");
  if (
    segments.length === 0
    || segments.some((segment) => !ROUTE_LITERAL.test(segment) && !ROUTE_PARAMETER.test(segment))
  ) {
    fail(`${label} contains an unsupported route segment`);
  }
  const parameterNames = segments
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1));
  if (new Set(parameterNames).size !== parameterNames.length) {
    fail(`${label} contains a duplicate parameter name`);
  }
  return value;
}

function assertRequestPath(value, label) {
  if (
    typeof value !== "string"
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("#")
    || /[\r\n]/.test(value)
  ) {
    fail(`${label} must be an exact absolute request path`);
  }
  let parsed;
  try {
    parsed = new URL(value, "http://127.0.0.1");
  } catch {
    fail(`${label} is not a valid request path`);
  }
  const canonical = `${parsed.pathname}${parsed.search}`;
  if (canonical !== value) fail(`${label} is not canonical`);
  return value;
}

function routePatternRegExp(routePattern) {
  const source = routePattern
    .slice(1)
    .split("/")
    .map((segment) => (
      segment.startsWith(":")
        ? "[^/?#]+"
        : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    ))
    .join("/");
  return new RegExp(`^/${source}$`);
}

function assertPathMatchesRoute(path, routePattern, label) {
  const pathname = new URL(path, "http://127.0.0.1").pathname;
  if (!routePatternRegExp(routePattern).test(pathname)) {
    fail(`${label} does not match ${routePattern}`);
  }
}

function jsonByteLength(value, label) {
  return Buffer.byteLength(canonicalJsonStringify(value, label), "utf8");
}

function assertJsonSize(value, maximum, label) {
  const bytes = jsonByteLength(value, label);
  if (bytes > maximum) fail(`${label} is ${bytes} bytes; maximum is ${maximum}`);
  return bytes;
}

function boundedJsonValue(value, maximum, label) {
  const checked = toJsonSafeValue(value, label);
  assertJsonSize(checked, maximum, label);
  return checked;
}

function boundedJsonObject(value, maximum, label) {
  const checked = toJsonSafeObject(value, label);
  assertJsonSize(checked, maximum, label);
  return checked;
}

function validateExpectedMetadata(value) {
  assertExactKeys(value, EXPECTED_METADATA_KEYS, "expected metadata");
  const id = assertIdentifier(value.id, "expected metadata id");
  const negativePathId = assertIdentifier(
    value.negativePathId,
    "expected metadata negativePathId",
  );
  const routePattern = assertRoutePattern(
    value.routePattern,
    "expected metadata routePattern",
  );
  if (value.fixturePolicy !== "deterministic-and-clearly-labeled") {
    fail("expected metadata fixturePolicy is not supported");
  }
  return Object.freeze({
    fixturePolicy: value.fixturePolicy,
    id,
    negativePathId,
    routePattern,
  });
}

function validateFixtures(value, expectedPolicy) {
  assertExactKeys(value, FIXTURE_KEYS, "fixtures");
  if (value.policy !== expectedPolicy) fail("fixtures policy does not match expected metadata");
  if (value.version !== 1) fail("fixtures version must be 1");
  const records = boundedJsonObject(
    value.records,
    SCENARIO_CONTRACT_LIMITS.fixtureBytes,
    "fixture records",
  );
  const fixtures = Object.freeze({ policy: value.policy, version: 1, records });
  assertJsonSize(fixtures, SCENARIO_CONTRACT_LIMITS.fixtureBytes, "fixtures");
  return fixtures;
}

function validatePlan(value, routePattern) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("plan must contain at least one delivery step");
  }
  if (value.length > SCENARIO_CONTRACT_LIMITS.planSteps) {
    fail(`plan cannot contain more than ${SCENARIO_CONTRACT_LIMITS.planSteps} steps`);
  }
  const ids = new Set();
  const paths = new Set();
  const steps = value.map((step, index) => {
    const label = `plan step ${index + 1}`;
    assertExactKeys(step, PLAN_STEP_KEYS, label);
    const id = assertIdentifier(step.id, `${label} id`);
    if (ids.has(id)) fail(`plan step id ${id} is duplicated`);
    ids.add(id);
    const path = assertRequestPath(step.path, `${label} path`);
    if (paths.has(path)) fail(`plan path ${path} is duplicated`);
    paths.add(path);
    assertPathMatchesRoute(path, routePattern, `${label} path`);
    if (step.expect !== "delivery") fail(`${label} expect must be delivery`);
    const price = assertExactAmount(step.price, `${label} price`);
    const caseValue = boundedJsonObject(
      step.case,
      SCENARIO_CONTRACT_LIMITS.planCaseBytes,
      `${label} case`,
    );
    return Object.freeze({ id, path, price, expect: "delivery", case: caseValue });
  });
  const frozen = Object.freeze(steps);
  assertJsonSize(frozen, SCENARIO_CONTRACT_LIMITS.planBytes, "plan");
  return frozen;
}

function validateVectorExpectation(value, label) {
  assertPlainDataObject(value, `${label} expected`);
  if (value.ok === true) {
    assertExactKeys(value, SUCCESS_EXPECTATION_KEYS, `${label} expected success`);
    return Object.freeze({
      ok: true,
      value: boundedJsonValue(
        value.value,
        SCENARIO_CONTRACT_LIMITS.testVectorExpectedBytes,
        `${label} expected value`,
      ),
    });
  }
  if (value.ok === false) {
    assertExactKeys(value, REJECTION_EXPECTATION_KEYS, `${label} expected rejection`);
    const code = assertIdentifier(value.code, `${label} rejection code`);
    return Object.freeze({ ok: false, code });
  }
  fail(`${label} expected must set ok to true or false`);
}

function validateTestVectors(value) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("testVectors must contain offline vectors");
  }
  if (value.length > SCENARIO_CONTRACT_LIMITS.testVectorCount) {
    fail(`testVectors cannot contain more than ${SCENARIO_CONTRACT_LIMITS.testVectorCount} entries`);
  }
  const ids = new Set();
  const foundKinds = new Set();
  const vectors = value.map((vector, index) => {
    const label = `test vector ${index + 1}`;
    assertExactKeys(vector, VECTOR_KEYS, label);
    const id = assertIdentifier(vector.id, `${label} id`);
    if (ids.has(id)) fail(`test vector id ${id} is duplicated`);
    ids.add(id);
    if (!REQUIRED_SCENARIO_VECTOR_KINDS.includes(vector.kind)) {
      fail(`${label} kind is not supported`);
    }
    foundKinds.add(vector.kind);
    const input = boundedJsonValue(
      vector.input,
      SCENARIO_CONTRACT_LIMITS.testVectorInputBytes,
      `${label} input`,
    );
    const expected = validateVectorExpectation(vector.expected, label);
    const run = assertFunction(vector.run, `${label} run`);
    return Object.freeze({ id, kind: vector.kind, input, expected, run });
  });
  const missing = REQUIRED_SCENARIO_VECTOR_KINDS.filter((kind) => !foundKinds.has(kind));
  if (missing.length > 0) fail(`testVectors are missing required kinds: ${missing.join(", ")}`);

  const frozen = Object.freeze(vectors);
  const serializable = frozen.map(({ id, kind, input, expected }) => ({
    id,
    kind,
    input,
    expected,
  }));
  assertJsonSize(serializable, SCENARIO_CONTRACT_LIMITS.testVectorBytes, "testVectors");
  return frozen;
}

function assertCatalogParity(definition, expected) {
  if (definition.id !== expected.id) fail("scenario id does not match expected metadata");
  if (definition.negativePathId !== expected.negativePathId) {
    fail("scenario negativePathId does not match expected metadata");
  }
  if (definition.routePattern !== expected.routePattern) {
    fail("scenario routePattern does not match expected metadata");
  }
}

/**
 * Defines one deterministic business scenario. `expectedMetadata` is supplied by
 * the generator from the frozen catalog; this module never reads catalog files.
 */
export function defineScenario(definition, expectedMetadata) {
  assertExactKeys(definition, SCENARIO_KEYS, "scenario");
  const expected = validateExpectedMetadata(expectedMetadata);

  const id = assertIdentifier(definition.id, "scenario id");
  const negativePathId = assertIdentifier(definition.negativePathId, "scenario negativePathId");
  const routePattern = assertRoutePattern(definition.routePattern);
  assertCatalogParity({ id, negativePathId, routePattern }, expected);

  const amount = typeof definition.amount === "function"
    ? assertFunction(definition.amount, "scenario amount")
    : assertExactAmount(definition.amount, "scenario amount");
  const scenario = Object.freeze({
    id,
    negativePathId,
    fixtures: validateFixtures(definition.fixtures, expected.fixturePolicy),
    routePattern,
    budgetXlm: assertExactAmount(definition.budgetXlm, "scenario budgetXlm"),
    amount,
    configureFreeRoutes: assertFunction(
      definition.configureFreeRoutes,
      "scenario configureFreeRoutes",
    ),
    preflight: assertFunction(definition.preflight, "scenario preflight"),
    fulfill: assertFunction(definition.fulfill, "scenario fulfill"),
    validateDelivery: assertFunction(
      definition.validateDelivery,
      "scenario validateDelivery",
    ),
    deliveryEvidence: assertFunction(
      definition.deliveryEvidence,
      "scenario deliveryEvidence",
    ),
    plan: validatePlan(definition.plan, routePattern),
    runNegativePath: assertFunction(
      definition.runNegativePath,
      "scenario runNegativePath",
    ),
    outputEvidence: assertFunction(definition.outputEvidence, "scenario outputEvidence"),
    testVectors: validateTestVectors(definition.testVectors),
  });
  definedScenarios.add(scenario);
  return scenario;
}

/**
 * Accepts only the exact frozen object returned by defineScenario in this
 * module instance. Structural copies, proxies, and hand-built lookalikes are
 * intentionally rejected even when every public field appears valid.
 */
export function assertDefinedScenario(scenario) {
  if (
    !scenario
    || typeof scenario !== "object"
    || !Object.isFrozen(scenario)
    || !definedScenarios.has(scenario)
  ) {
    fail("requires a scenario returned by defineScenario");
  }
  return scenario;
}

function normalizeThrownRejection(error, vectorId) {
  const code = error && typeof error === "object" ? error.code : undefined;
  if (typeof code !== "string" || !ERROR_CODE.test(code)) {
    throw new Error(
      `scenario test vector ${vectorId} threw without a lowercase kebab-case error code`,
      { cause: error },
    );
  }
  return Object.freeze({ ok: false, code });
}

async function executeTestVector(vector) {
  let actual;
  let returned;
  try {
    returned = await vector.run(vector.input);
  } catch (error) {
    actual = normalizeThrownRejection(error, vector.id);
  }
  if (!actual) {
    actual = Object.freeze({
      ok: true,
      value: boundedJsonValue(
        returned,
        SCENARIO_CONTRACT_LIMITS.testVectorResultBytes,
        `test vector ${vector.id} result`,
      ),
    });
  }

  if (!isDeepStrictEqual(actual, vector.expected)) {
    throw new Error(
      `scenario test vector ${vector.id} failed: expected ${canonicalJsonStringify(vector.expected)} but received ${canonicalJsonStringify(actual)}`,
    );
  }
  return Object.freeze({ id: vector.id, kind: vector.kind, passed: true, actual });
}

/** Runs deterministic business vectors sequentially and fails on the first mismatch. */
export async function runScenarioTestVectors(scenario) {
  assertDefinedScenario(scenario);
  if (!Array.isArray(scenario.testVectors) || !Object.isFrozen(scenario.testVectors)) {
    fail("scenario testVectors are not frozen");
  }
  const results = [];
  for (const vector of scenario.testVectors) results.push(await executeTestVector(vector));
  return Object.freeze(results);
}

/** Bounds and deeply freezes JSON returned by scenario hooks before persistence. */
export function toBoundedScenarioOutput(
  value,
  label = "scenario hook output",
  maximumBytes = SCENARIO_CONTRACT_LIMITS.hookOutputBytes,
) {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    fail("maximum output bytes must be a positive safe integer");
  }
  return boundedJsonObject(value, maximumBytes, label);
}

/** Bounds and freezes one deliveryEvidence hook result before persistence. */
export function toBoundedDeliveryEvidence(value) {
  return boundedJsonObject(
    value,
    SCENARIO_HOOK_OUTPUT_LIMITS.deliveryEvidenceBytes,
    "scenario delivery evidence",
  );
}

/** Bounds and freezes one runNegativePath hook result before persistence. */
export function toBoundedNegativePathEvidence(value) {
  return boundedJsonObject(
    value,
    SCENARIO_HOOK_OUTPUT_LIMITS.negativePathEvidenceBytes,
    "scenario negative path evidence",
  );
}

/** Bounds and freezes one final outputEvidence hook result before persistence. */
export function toBoundedFinalOutputEvidence(value) {
  return boundedJsonObject(
    value,
    SCENARIO_HOOK_OUTPUT_LIMITS.finalOutputEvidenceBytes,
    "scenario final output evidence",
  );
}
