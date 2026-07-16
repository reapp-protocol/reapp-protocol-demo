import { createHash, randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  createSettlementReceiptId,
  decodePaymentProof,
  encodePaymentProof,
} from "@reapp-sdk/core";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const queues = new Map();

function exactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length
    && actual.every((key, index) => key === wanted[index]);
}

async function serialized(path, operation) {
  const previous = queues.get(path) ?? Promise.resolve();
  const current = previous.then(operation, operation);
  const tail = current.then(() => undefined, () => undefined);
  queues.set(path, tail);
  try {
    return await current;
  } finally {
    if (queues.get(path) === tail) queues.delete(path);
  }
}

async function readJson(path, fallback) {
  try {
    const info = await stat(path);
    if (!info.isFile() || info.size > MAX_FILE_BYTES) {
      throw new Error(`${path} is not a safe REAPP state file`);
    }
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return structuredClone(fallback);
    throw error;
  }
}

async function writeJson(path, value) {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporary, path);
    await chmod(path, 0o600);
    const directoryHandle = await open(directory, "r");
    try {
      await directoryHandle.sync();
    } finally {
      await directoryHandle.close();
    }
  } finally {
    await handle?.close().catch(() => undefined);
    await rm(temporary, { force: true }).catch(() => undefined);
  }
}

function validateReceipt(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("pending receipt is not an object");
  }
  const expectedKeys = [
    "amount",
    "mandateId",
    "method",
    "proof",
    "proofVersion",
    "receiptId",
    "submittedAt",
    "txHash",
    "url",
    "validUntil",
  ];
  if (
    !exactKeys(value, expectedKeys)
    || !/^[0-9a-f]{64}$/.test(value.receiptId)
    || !/^[0-9a-f]{64}$/.test(value.txHash)
    || !/^[0-9a-f]{64}$/.test(value.mandateId)
    || (value.proofVersion !== 1 && value.proofVersion !== 2)
    || typeof value.url !== "string"
    || typeof value.method !== "string"
    || typeof value.amount !== "string"
    || !Number.isSafeInteger(value.submittedAt)
    || !Number.isSafeInteger(value.validUntil)
    || value.submittedAt <= 0
    || value.validUntil <= value.submittedAt
  ) {
    throw new Error("pending receipt envelope is invalid");
  }
  const proof = decodePaymentProof(encodePaymentProof(value.proof));
  if (proof.txHash !== value.txHash || proof.mandateId !== value.mandateId) {
    throw new Error("pending receipt proof does not match its envelope");
  }
  const expectedId = createSettlementReceiptId({
    proofVersion: value.proofVersion,
    url: value.url,
    method: value.method,
    txHash: value.txHash,
    mandateId: value.mandateId,
    amount: value.amount,
    submittedAt: value.submittedAt,
    validUntil: value.validUntil,
    proof,
  });
  if (expectedId !== value.receiptId) {
    throw new Error("pending receipt integrity id is invalid");
  }
  return Object.freeze({ ...value, proof: Object.freeze(proof) });
}

export class FileSettlementReceiptStore {
  constructor(filePath) {
    this.filePath = resolve(filePath);
  }

  async savePending(receipt) {
    return serialized(this.filePath, async () => {
      const file = await this.#load();
      const checked = validateReceipt(receipt);
      file.pending[checked.receiptId] = checked;
      await writeJson(this.filePath, file);
    });
  }

  async clearPending(receiptId) {
    return serialized(this.filePath, async () => {
      const file = await this.#load();
      delete file.pending[receiptId];
      await writeJson(this.filePath, file);
    });
  }

  async listPending() {
    return serialized(this.filePath, async () =>
      Object.values((await this.#load()).pending).map(validateReceipt));
  }

  async #load() {
    const file = await readJson(this.filePath, { version: 1, pending: {} });
    if (
      !exactKeys(file, ["version", "pending"])
      || file.version !== 1
      || !file.pending
      || typeof file.pending !== "object"
      || Array.isArray(file.pending)
    ) {
      throw new Error("pending receipt file schema is invalid");
    }
    for (const [id, receipt] of Object.entries(file.pending)) {
      if (validateReceipt(receipt).receiptId !== id) {
        throw new Error("pending receipt key does not match its integrity id");
      }
    }
    return { version: 1, pending: { ...file.pending } };
  }
}

export class FileRunResultStore {
  constructor(filePath) {
    this.filePath = resolve(filePath);
  }

  async begin(publicConfig) {
    const runId = randomUUID();
    await serialized(this.filePath, async () => {
      const file = await this.#load();
      file.runs.push({
        runId,
        status: "running",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        config: publicConfig,
        events: [],
      });
      if (file.runs.length > 20) file.runs.splice(0, file.runs.length - 20);
      await writeJson(this.filePath, file);
    });
    return runId;
  }

  async append(runId, event) {
    return serialized(this.filePath, async () => {
      const file = await this.#load();
      const run = file.runs.find((candidate) => candidate.runId === runId);
      if (!run || run.status !== "running") {
        throw new Error("cannot append to a missing or finished REAPP run");
      }
      run.events.push(Object.freeze({ at: new Date().toISOString(), ...event }));
      await writeJson(this.filePath, file);
    });
  }

  async finish(runId, status, summary) {
    if (status !== "complete" && status !== "failed") {
      throw new Error("result status must be complete or failed");
    }
    return serialized(this.filePath, async () => {
      const file = await this.#load();
      const run = file.runs.find((candidate) => candidate.runId === runId);
      if (!run || run.status !== "running") {
        throw new Error("cannot finish a missing or finished REAPP run");
      }
      run.status = status;
      run.finishedAt = new Date().toISOString();
      run.summary = summary;
      await writeJson(this.filePath, file);
    });
  }

  async acceptedReceipts() {
    return serialized(this.filePath, async () => {
      const file = await this.#load();
      return file.runs.flatMap((run) => run.events)
        .filter((event) => event.type === "delivery_accepted")
        .map((event) => ({ receiptId: event.receiptId, txHash: event.txHash }));
    });
  }

  async #load() {
    const file = await readJson(this.filePath, { version: 1, runs: [] });
    if (
      !exactKeys(file, ["version", "runs"])
      || file.version !== 1
      || !Array.isArray(file.runs)
    ) {
      throw new Error("result file schema is invalid");
    }
    return { version: 1, runs: [...file.runs] };
  }
}

function validateStoredResponse(value) {
  if (
    !value
    || typeof value !== "object"
    || !Number.isInteger(value.status)
    || value.status < 200
    || value.status > 299
    || value.contentType !== "application/json; charset=utf-8"
    || typeof value.bodyBase64 !== "string"
    || typeof value.bodySha256 !== "string"
    || !/^[0-9a-f]{64}$/.test(value.bodySha256)
  ) {
    throw new Error("stored fulfillment response is invalid");
  }
  const body = Buffer.from(value.bodyBase64, "base64");
  if (
    body.toString("base64") !== value.bodyBase64
    || createHash("sha256").update(body).digest("hex") !== value.bodySha256
  ) {
    throw new Error("stored fulfillment response failed its integrity check");
  }
  return Object.freeze({ ...value });
}

function serializeDelivery(record) {
  return {
    ...record,
    payment: {
      ...record.payment,
      amountStroops: record.payment.amountStroops.toString(),
    },
  };
}

function deserializeDelivery(value) {
  if (
    !value
    || typeof value !== "object"
    || typeof value.key !== "string"
    || !/^[0-9a-f]{64}$/.test(value.proofDigest)
    || typeof value.executionId !== "string"
    || !Number.isSafeInteger(value.startedAt)
    || value.startedAt <= 0
    || (value.state !== "executing" && value.state !== "completed")
    || !value.payment
    || typeof value.payment.amountStroops !== "string"
    || !/^[1-9]\d*$/.test(value.payment.amountStroops)
    || !/^[0-9a-f]{64}$/.test(value.payment.txHash)
    || !/^[0-9a-f]{64}$/.test(value.payment.mandateId)
  ) {
    throw new Error("fulfillment redemption record is invalid");
  }
  const common = {
    key: value.key,
    proofDigest: value.proofDigest,
    payment: Object.freeze({
      ...value.payment,
      amountStroops: BigInt(value.payment.amountStroops),
    }),
    executionId: value.executionId,
    startedAt: value.startedAt,
  };
  if (value.state === "executing") {
    if (value.response !== undefined) {
      throw new Error("executing redemption cannot contain a response");
    }
    return Object.freeze({ ...common, state: "executing" });
  }
  return Object.freeze({
    ...common,
    state: "completed",
    response: validateStoredResponse(value.response),
  });
}

function responsesEqual(left, right) {
  return left.status === right.status
    && left.contentType === right.contentType
    && left.bodyBase64 === right.bodyBase64
    && left.bodySha256 === right.bodySha256;
}

export class FileBoundRedemptionStore {
  constructor(filePath) {
    this.filePath = resolve(filePath);
  }

  async lookup(key, proofDigest) {
    return serialized(this.filePath, async () => {
      const value = (await this.#load()).records[key];
      if (!value) return { kind: "missing" };
      const record = deserializeDelivery(value);
      if (record.proofDigest !== proofDigest) return { kind: "conflict" };
      return { kind: record.state, record };
    });
  }

  async claim(record, executionId, startedAt) {
    return serialized(this.filePath, async () => {
      const file = await this.#load();
      const existing = file.records[record.key];
      if (existing) {
        const restored = deserializeDelivery(existing);
        if (restored.proofDigest !== record.proofDigest) return { kind: "conflict" };
        return { kind: restored.state, record: restored };
      }
      const checked = deserializeDelivery({
        key: record.key,
        proofDigest: record.proofDigest,
        payment: {
          ...record.payment,
          amountStroops: record.payment.amountStroops.toString(),
        },
        executionId,
        startedAt,
        state: "executing",
      });
      file.records[record.key] = serializeDelivery(checked);
      await writeJson(this.filePath, file);
      return { kind: "claimed", record: checked };
    });
  }

  async complete(completion) {
    return serialized(this.filePath, async () => {
      const file = await this.#load();
      const value = file.records[completion.key];
      if (!value) return { kind: "conflict" };
      const existing = deserializeDelivery(value);
      if (
        existing.proofDigest !== completion.proofDigest
        || existing.executionId !== completion.executionId
      ) {
        return { kind: "conflict" };
      }
      const response = validateStoredResponse(completion.response);
      if (existing.state === "completed") {
        return responsesEqual(existing.response, response)
          ? { kind: "completed", record: existing }
          : { kind: "conflict" };
      }
      const completed = Object.freeze({ ...existing, state: "completed", response });
      file.records[completion.key] = serializeDelivery(completed);
      await writeJson(this.filePath, file);
      return { kind: "completed", record: completed };
    });
  }

  async listExecuting() {
    return serialized(this.filePath, async () =>
      Object.values((await this.#load()).records)
        .map(deserializeDelivery)
        .filter((record) => record.state === "executing"));
  }

  async #load() {
    const file = await readJson(this.filePath, { version: 1, records: {} });
    if (
      !exactKeys(file, ["version", "records"])
      || file.version !== 1
      || !file.records
      || typeof file.records !== "object"
      || Array.isArray(file.records)
    ) {
      throw new Error("fulfillment redemption file schema is invalid");
    }
    for (const [key, value] of Object.entries(file.records)) {
      if (deserializeDelivery(value).key !== key) {
        throw new Error("fulfillment redemption key does not match its record");
      }
    }
    return { version: 1, records: { ...file.records } };
  }
}
