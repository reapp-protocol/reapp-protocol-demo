import { createHash } from "node:crypto";

export const FIXTURE_POLICY = "deterministic-and-clearly-labeled";

export function codedRejection(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

export function sha256Json(value) {
  return sha256(canonicalJson(value));
}

export function requireRecord(records, id, code = "unknown-resource") {
  if (typeof id !== "string" || !Object.hasOwn(records, id)) codedRejection(code);
  return records[id];
}

export function requireInteger(value, { minimum = 0, maximum = Number.MAX_SAFE_INTEGER, code }) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) codedRejection(code);
  return value;
}

export function requireString(value, pattern, code) {
  if (typeof value !== "string" || !pattern.test(value)) codedRejection(code);
  return value;
}

export function stableSort(values, compare) {
  return values
    .map((value, index) => ({ index, value }))
    .sort((left, right) => compare(left.value, right.value) || left.index - right.index)
    .map(({ value }) => value);
}

export function makeDelivery({ scenarioId, resourceId, result, provenance }) {
  const checkedResult = canonicalize(result);
  const checkedProvenance = canonicalize(provenance);
  const integrityInput = {
    scenarioId,
    resourceId,
    result: checkedResult,
    provenance: checkedProvenance,
  };
  return {
    schemaVersion: 1,
    scenarioId,
    resourceId,
    result: checkedResult,
    provenance: checkedProvenance,
    integrity: { algorithm: "sha256", digest: sha256Json(integrityInput) },
  };
}

export function validateDelivery(body, { scenarioId, resourceId }) {
  if (
    !body
    || body.schemaVersion !== 1
    || body.scenarioId !== scenarioId
    || body.resourceId !== resourceId
    || !body.integrity
    || body.integrity.algorithm !== "sha256"
  ) codedRejection("delivery-envelope-mismatch");
  const expected = sha256Json({
    scenarioId: body.scenarioId,
    resourceId: body.resourceId,
    result: body.result,
    provenance: body.provenance,
  });
  if (body.integrity.digest !== expected) codedRejection("delivery-integrity-mismatch");
  return body.result;
}

export function deliveryEvidence({ value, receipt, step }) {
  return {
    stepId: step.id,
    resourceId: step.case.resourceId,
    txHash: receipt.txHash,
    resultDigest: sha256Json(value),
  };
}

export function outputEvidence({ deliveries, negativeEvidence }) {
  return {
    schemaVersion: 1,
    deliveryCount: deliveries.length,
    resources: deliveries.map(({ step, receipt, value }) => ({
      resourceId: step.case.resourceId,
      resultDigest: sha256Json(value),
      txHash: receipt.txHash,
    })),
    negativePath: {
      digest: negativeEvidence.sha256,
      verified: true,
    },
  };
}

export function registerManifestRoute(routes, manifest) {
  routes.get("/starter-manifest", () => ({ body: manifest }));
}

export function vector(id, kind, input, expected, run) {
  return { id, kind, input, expected, run };
}

export function ok(value) {
  return { ok: true, value };
}

export function rejected(code) {
  return { ok: false, code };
}

export function assertAction(actions, name) {
  if (!actions || typeof actions[name] !== "function") {
    throw new Error(`scenario runtime does not provide required ${name} action`);
  }
  return actions[name].bind(actions);
}

export async function captureRejection(run, expectedCode) {
  try {
    await run();
  } catch (error) {
    if (error && error.code === expectedCode) {
      return { code: expectedCode, rejected: true };
    }
    throw error;
  }
  throw new Error(`expected ${expectedCode} rejection`);
}

export function safeNegativeResult(id, details) {
  return { id, verified: true, details };
}
