import { createHash } from "node:crypto";

function cloneJsonValue(value, label, seen, path) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number at ${path}`);
    return value;
  }
  if (typeof value !== "object") throw new Error(`${label} contains a non-JSON value at ${path}`);
  if (seen.has(value)) throw new Error(`${label} contains a cycle at ${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const ownKeys = Reflect.ownKeys(value);
      for (const key of ownKeys) {
        if (key === "length") continue;
        const numeric = typeof key === "string" ? Number(key) : Number.NaN;
        if (!Number.isSafeInteger(numeric) || numeric < 0 || String(numeric) !== key) {
          throw new Error(`${label} contains a non-index array field at ${path}`);
        }
      }
      const result = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) throw new Error(`${label} contains a sparse array at ${path}`);
        result.push(cloneJsonValue(value[index], label, seen, `${path}[${index}]`));
      }
      return Object.freeze(result);
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${label} contains a non-plain object at ${path}`);
    }
    if (Reflect.ownKeys(value).some((key) => typeof key !== "string")) {
      throw new Error(`${label} contains a symbol field at ${path}`);
    }
    const entries = [];
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) {
        throw new Error(`${label} contains an accessor at ${path}.${key}`);
      }
      entries.push([key, cloneJsonValue(descriptor.value, label, seen, `${path}.${key}`)]);
    }
    return Object.freeze(Object.fromEntries(entries));
  } finally {
    seen.delete(value);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
}

export function toJsonSafeValue(value, label = "evidence") {
  return cloneJsonValue(value, label, new Set(), "$");
}

export function toJsonSafeObject(value, label = "evidence") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return toJsonSafeValue(value, label);
}

export function canonicalJsonStringify(value, label = "evidence") {
  return JSON.stringify(canonicalize(toJsonSafeValue(value, label)));
}

export function hashJsonEvidence(value, label = "evidence") {
  return createHash("sha256").update(canonicalJsonStringify(value, label), "utf8").digest("hex");
}

export function createJsonEvidenceEnvelope(kind, value) {
  if (typeof kind !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(kind)) {
    throw new Error("evidence kind must be a lowercase kebab-case identifier");
  }
  const checked = toJsonSafeObject(value, `${kind} evidence`);
  return Object.freeze({
    kind,
    sha256: hashJsonEvidence(checked, `${kind} evidence`),
    value: checked,
  });
}
