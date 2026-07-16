import { resolve } from "node:path";
import {
  BOUND_PAYMENT_CAPABILITY,
  DeliveryPendingError,
  REAPP_PAYMENT_CAPABILITIES_HEADER,
  X_PAYMENT_HEADER,
  createBoundPaymentProof,
  encodePaymentProof,
  parse402,
  reapp,
} from "@reapp-sdk/core";
import {
  assertNoUnresolvedReceipts,
  assertMandateStateUnchanged,
  createBoundTestnetConsumer,
  createRunStores,
  expectVerifiedBudgetRejection,
  purchaseVerifiedBoundJson,
  readTestnetMandateState,
  setupTestnetMandate,
  verifyExactBound402,
} from "./contract.mjs";
import {
  validateExactOrigin,
  validatePositiveAmount,
  validateRequestPath,
} from "./config.mjs";
import {
  createJsonEvidenceEnvelope,
} from "./evidence.mjs";
import { startFulfillmentServer } from "./fulfillment.mjs";
import { fetchWithTimeout } from "./http.mjs";
import { loadOrCreateChallengeSecret } from "./private-secret.mjs";
import {
  createDisposableTestnetActors,
  explorerTransactionUrl,
  fundDisposableTestnetActors,
  publicActorAddresses,
} from "./testnet.mjs";
import {
  SCENARIO_HOOK_OUTPUT_LIMITS,
  assertDefinedScenario,
  toBoundedDeliveryEvidence,
  toBoundedFinalOutputEvidence,
  toBoundedNegativePathEvidence,
  toBoundedScenarioOutput,
} from "./scenario.mjs";

const MAX_NEGATIVE_EVENTS = 64;
const RESERVED_RUNTIME_EVENTS = new Set([
  "accounts_funded",
  "challenge_402_verified",
  "consumer_output_verified",
  "delivery_accepted",
  "fulfillment_started",
  "mandate_ready",
  "negative_path_verified",
  "purchase_started",
  "run_complete",
  "run_started",
]);

export function validateNegativePathEvidence(value) {
  return toBoundedNegativePathEvidence(value);
}

export function validateNegativePathEvent(event) {
  const checked = toBoundedScenarioOutput(event, "negative path event", 32 * 1024);
  if (RESERVED_RUNTIME_EVENTS.has(checked.type)) {
    throw new Error(`runNegativePath cannot record reserved event ${checked.type}`);
  }
  if (typeof checked.type !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(checked.type)) {
    throw new Error("negative path event type must be a lowercase kebab-case identifier");
  }
  return checked;
}

function jsonSafeDeliveryEvidence(value) {
  return toBoundedScenarioOutput(
    value,
    "delivery value",
    SCENARIO_HOOK_OUTPUT_LIMITS.negativePathEvidenceBytes,
  );
}

function publicReceiptEvidence(receipt) {
  return Object.freeze({
    receiptId: receipt.receiptId,
    proofVersion: receipt.proofVersion,
    method: receipt.method,
    url: receipt.url,
    txHash: receipt.txHash,
    mandateId: receipt.mandateId,
    amount: receipt.amount,
    submittedAt: receipt.submittedAt,
    validUntil: receipt.validUntil,
  });
}

function validateDeliveryIndex(value, deliveries) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= deliveries.length) {
    throw new Error("deliveryIndex must identify a completed paid delivery");
  }
  return value;
}

export function validateScenarioDefinition(scenario) {
  return assertDefinedScenario(scenario);
}

export async function expectBoundProofRejected({
  receipt,
  url,
  expectedStatus = 402,
  timeoutMs = 30_000,
}) {
  if (!receipt || receipt.proofVersion !== 2 || receipt.method !== "GET") {
    throw new Error("a bound-v2 GET settlement receipt is required");
  }
  if (!Number.isInteger(expectedStatus) || expectedStatus < 400 || expectedStatus > 499) {
    throw new Error("expectedStatus must be a 4xx HTTP status");
  }
  const target = new URL(url);
  if (target.username || target.password || target.hash || target.toString() === receipt.url) {
    throw new Error("negative proof target must be a different exact URL without credentials or fragment");
  }
  validateExactOrigin(target.origin, "negative proof target origin");
  const response = await fetchWithTimeout(target, {
    method: "GET",
    headers: {
      accept: "application/json",
      [REAPP_PAYMENT_CAPABILITIES_HEADER]: BOUND_PAYMENT_CAPABILITY,
      [X_PAYMENT_HEADER]: encodePaymentProof(receipt.proof),
    },
    redirect: "error",
  }, timeoutMs);
  await response.arrayBuffer();
  if (response.status !== expectedStatus) {
    throw new Error(`rebound proof returned HTTP ${response.status}; expected ${expectedStatus}`);
  }
  return Object.freeze({
    kind: "bound-proof-rejected",
    status: response.status,
    receiptId: receipt.receiptId,
    txHash: receipt.txHash,
    target: target.toString(),
  });
}

export const expectResourceRebindingRejected = expectBoundProofRejected;

export async function expectReboundTransactionConflict({
  receipt,
  url,
  agent,
  timeoutMs = 30_000,
}) {
  if (!receipt || receipt.proofVersion !== 2 || receipt.method !== "GET") {
    throw new Error("a bound-v2 GET settlement receipt is required");
  }
  const target = new URL(url);
  if (target.username || target.password || target.hash || target.toString() === receipt.url) {
    throw new Error("conflict target must be a different exact URL without credentials or fragment");
  }
  validateExactOrigin(target.origin, "conflict target origin");
  const challengeResponse = await fetchWithTimeout(target, {
    method: "GET",
    headers: {
      accept: "application/json",
      [REAPP_PAYMENT_CAPABILITIES_HEADER]: BOUND_PAYMENT_CAPABILITY,
    },
    redirect: "error",
  }, timeoutMs);
  if (challengeResponse.status !== 402) {
    throw new Error(`fresh target returned HTTP ${challengeResponse.status}; expected 402`);
  }
  const requirement = await parse402(challengeResponse);
  if (requirement.proofVersion !== 2 || !requirement.challenge) {
    throw new Error("fresh target did not return a bound-v2 challenge");
  }
  const reboundProof = createBoundPaymentProof({
    challenge: requirement.challenge,
    txHash: receipt.txHash,
    mandateId: receipt.mandateId,
    signer: agent,
  });
  const response = await fetchWithTimeout(target, {
    method: "GET",
    headers: {
      accept: "application/json",
      [REAPP_PAYMENT_CAPABILITIES_HEADER]: BOUND_PAYMENT_CAPABILITY,
      [X_PAYMENT_HEADER]: encodePaymentProof(reboundProof),
    },
    redirect: "error",
  }, timeoutMs);
  await response.arrayBuffer();
  if (response.status !== 409) {
    throw new Error(`rebound transaction returned HTTP ${response.status}; expected 409`);
  }
  return Object.freeze({
    kind: "rebound-transaction-conflict",
    status: response.status,
    receiptId: receipt.receiptId,
    txHash: receipt.txHash,
    target: target.toString(),
  });
}

export async function runLocalTestnetDemo({
  scenario: rawScenario,
  stateRoot = resolve(".reapp"),
  onEvent,
}) {
  const scenario = assertDefinedScenario(rawScenario);
  if (onEvent !== undefined && typeof onEvent !== "function") {
    throw new Error("onEvent must be a function when provided");
  }
  const stores = createRunStores(stateRoot);
  await assertNoUnresolvedReceipts(stores.receiptStore);
  const actors = createDisposableTestnetActors();
  const addresses = publicActorAddresses(actors);
  const runId = await stores.resultStore.begin({
    scenarioId: scenario.id,
    network: "stellar-testnet",
    contract: reapp.testnet.mandateRegistryId,
    budgetXlm: scenario.budgetXlm,
    proofPolicy: "bound-v2-only",
  });
  let serverHandle;
  let runError;

  const record = async (event) => {
    await stores.resultStore.append(runId, event);
    await onEvent?.(Object.freeze({ ...event }));
  };

  try {
    await onEvent?.(Object.freeze({ type: "run_started", runId, ...addresses }));
    await fundDisposableTestnetActors(actors);
    await record({ type: "accounts_funded", ...addresses });

    const mandateEvidence = await setupTestnetMandate({
      user: actors.user,
      agent: actors.agent,
      merchant: addresses.merchant,
      budgetXlm: scenario.budgetXlm,
    });
    await record({
      type: "mandate_ready",
      mandateId: mandateEvidence.mandate.id,
      registerTx: mandateEvidence.registerTx,
      approveTx: mandateEvidence.approveTx,
      registerExplorer: explorerTransactionUrl(mandateEvidence.registerTx),
      approveExplorer: explorerTransactionUrl(mandateEvidence.approveTx),
    });

    const challengeSecret = await loadOrCreateChallengeSecret(
      resolve(stores.stateRoot, "challenge-secret"),
    );
    serverHandle = await startFulfillmentServer({
      merchant: addresses.merchant,
      challengeSecret,
      routePattern: scenario.routePattern,
      amount: scenario.amount,
      preflight: scenario.preflight,
      fulfill: scenario.fulfill,
      configureFreeRoutes: scenario.configureFreeRoutes,
      redemptionStore: stores.redemptionStore,
      stateRoot: stores.stateRoot,
    });
    await record({ type: "fulfillment_started", origin: serverHandle.origin });

    const consumer = createBoundTestnetConsumer({
      mandate: mandateEvidence.mandate,
      agent: actors.agent,
      receiptStore: stores.receiptStore,
    });
    const transactions = [];
    const deliveries = [];

    for (const [index, step] of scenario.plan.entries()) {
      const url = serverHandle.endpoint(step.path);
      const quote = await verifyExactBound402({
        url,
        merchant: addresses.merchant,
        amount: step.price,
      });
      await record({
        type: "challenge_402_verified",
        path: step.path,
        priceXlm: step.price,
      });
      await record({ type: "purchase_started", step: index + 1, path: step.path });
      let committedEvidence;
      let committedBodyEvidence;
      const delivery = await purchaseVerifiedBoundJson({
        consumer,
        mandate: mandateEvidence.mandate,
        url,
        quote,
        validateDelivery: ({ body, receipt }) => scenario.validateDelivery({
          body,
          receipt: publicReceiptEvidence(receipt),
          step,
        }),
        commitDelivery: async ({ body, value, receipt }) => {
          const publicReceipt = publicReceiptEvidence(receipt);
          const evidence = toBoundedDeliveryEvidence(
            scenario.deliveryEvidence({ body, value, receipt: publicReceipt, step }),
          );
          const bodyEvidence = createJsonEvidenceEnvelope(
            "delivery-body",
            toBoundedScenarioOutput(body, "paid delivery body"),
          );
          committedEvidence = evidence;
          committedBodyEvidence = bodyEvidence;
          await stores.resultStore.commitDelivery(runId, {
            type: "delivery_accepted",
            step: index + 1,
            path: step.path,
            receiptId: receipt.receiptId,
            txHash: receipt.txHash,
            explorer: explorerTransactionUrl(receipt.txHash),
            bodySha256: bodyEvidence.sha256,
            evidence,
          });
        },
      });
      transactions.push(delivery.receipt.txHash);
      deliveries.push(Object.freeze({
        step,
        body: jsonSafeDeliveryEvidence(delivery.body),
        value: jsonSafeDeliveryEvidence(delivery.value),
        evidence: committedEvidence,
        bodyEvidence: committedBodyEvidence,
        receipt: publicReceiptEvidence(delivery.receipt),
        privateReceipt: delivery.receipt,
      }));
      await onEvent?.(Object.freeze({
        type: "delivery_accepted",
        step: index + 1,
        path: step.path,
        txHash: delivery.receipt.txHash,
        explorer: explorerTransactionUrl(delivery.receipt.txHash),
      }));
    }

    let negativeEventCount = 0;
    const negativeRecord = async (event) => {
      negativeEventCount += 1;
      if (negativeEventCount > MAX_NEGATIVE_EVENTS) {
        throw new Error(`runNegativePath cannot record more than ${MAX_NEGATIVE_EVENTS} events`);
      }
      const checked = validateNegativePathEvent(event);
      await record({ ...checked, phase: "negative_path" });
    };
    const publicDeliveries = Object.freeze(deliveries.map((delivery) => Object.freeze({
      step: delivery.step,
      body: delivery.body,
      value: delivery.value,
      evidence: delivery.evidence,
      bodyEvidence: delivery.bodyEvidence,
      receipt: delivery.receipt,
    })));
    const readMandateState = () => readTestnetMandateState({
      mandate: mandateEvidence.mandate,
      source: actors.user,
    });
    const negativeActions = Object.freeze({
      async expectBudgetRejection({ path, priceXlm }) {
        const checkedPath = validateRequestPath(path, "budget rejection path");
        validatePositiveAmount(priceXlm, 7, "budget rejection price");
        const url = serverHandle.endpoint(checkedPath);
        const before = await readMandateState();
        const quote = await verifyExactBound402({
          url,
          merchant: addresses.merchant,
          amount: priceXlm,
        });
        const rejection = await expectVerifiedBudgetRejection({
          consumer,
          mandate: mandateEvidence.mandate,
          url,
          quote,
        });
        const after = await readMandateState();
        return Object.freeze({
          rejection,
          unchanged: assertMandateStateUnchanged(before, after),
        });
      },
      async expectResourceRebinding({ deliveryIndex, targetPath }) {
        const index = validateDeliveryIndex(deliveryIndex, deliveries);
        const before = await readMandateState();
        const rejection = await expectBoundProofRejected({
          receipt: deliveries[index].privateReceipt,
          url: serverHandle.endpoint(validateRequestPath(targetPath, "rebinding target path")),
        });
        const after = await readMandateState();
        return Object.freeze({
          rejection,
          unchanged: assertMandateStateUnchanged(before, after),
        });
      },
      async expectTransactionConflict({ deliveryIndex, targetPath }) {
        const index = validateDeliveryIndex(deliveryIndex, deliveries);
        const before = await readMandateState();
        const rejection = await expectReboundTransactionConflict({
          receipt: deliveries[index].privateReceipt,
          url: serverHandle.endpoint(validateRequestPath(targetPath, "conflict target path")),
          agent: actors.agent,
        });
        const after = await readMandateState();
        return Object.freeze({
          rejection,
          unchanged: assertMandateStateUnchanged(before, after),
        });
      },
      readMandateState,
      assertMandateStateUnchanged,
      record: negativeRecord,
    });
    const negativeContext = Object.freeze({
      addresses,
      contract: reapp.testnet.mandateRegistryId,
      mandateId: mandateEvidence.mandate.id,
      network: "stellar-testnet",
      deliveries: publicDeliveries,
    });
    const negativeValue = validateNegativePathEvidence(await scenario.runNegativePath(
      Object.freeze({ context: negativeContext, actions: negativeActions }),
    ));
    const negativeEvidence = createJsonEvidenceEnvelope(
      scenario.negativePathId,
      negativeValue,
    );
    await record({
      type: "negative_path_verified",
      negativePathId: scenario.negativePathId,
      evidence: negativeEvidence,
    });

    const outputEvidence = createJsonEvidenceEnvelope(
      "consumer-output",
      toBoundedFinalOutputEvidence(await scenario.outputEvidence(Object.freeze({
        deliveries: publicDeliveries,
        negativeEvidence,
      }))),
    );
    await record({
      type: "consumer_output_verified",
      evidence: outputEvidence,
    });

    const pending = await stores.receiptStore.listPending();
    if (pending.length !== 0) {
      throw new Error("completed run still has unresolved settlement receipts");
    }
    await serverHandle.close();
    serverHandle = undefined;
    const summary = Object.freeze({
      scenarioId: scenario.id,
      mandateId: mandateEvidence.mandate.id,
      delivered: transactions.length,
      negativePathVerified: true,
      negativePathId: scenario.negativePathId,
      negativeEvidence,
      outputEvidence,
      transactions,
    });
    await stores.resultStore.finish(runId, "complete", summary);
    await onEvent?.(Object.freeze({ type: "run_complete", runId, ...summary }));
    return Object.freeze({ runId, ...summary });
  } catch (error) {
    runError = error;
    const summary = error instanceof DeliveryPendingError
      ? {
          reason: "delivery pending",
          txHash: error.receipt.txHash,
          receiptId: error.receipt.receiptId,
          explorer: explorerTransactionUrl(error.receipt.txHash),
        }
      : { reason: error instanceof Error ? error.message : String(error) };
    await stores.resultStore.finish(runId, "failed", summary).catch(() => undefined);
    throw error;
  } finally {
    try {
      await serverHandle?.close();
    } catch (closeError) {
      if (!runError) throw closeError;
    }
  }
}
