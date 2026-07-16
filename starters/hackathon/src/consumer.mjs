import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
import {
  BOUND_PAYMENT_CAPABILITY,
  DeliveryPendingError,
  REAPP_PAYMENT_CAPABILITIES_HEADER,
  getSettlementReceipt,
  parse402,
  reapp,
} from "@reapp-sdk/core";
import {
  FileRunResultStore,
  FileSettlementReceiptStore,
} from "./storage.mjs";

const FRIEND_BOT = "https://friendbot.stellar.org/";
const HORIZON = "https://horizon-testnet.stellar.org";
const EXPLORER_TX = "https://stellar.expert/explorer/testnet/tx/";
const STATE_ROOT = resolve(".reapp");
const RESOURCES = ["market", "academic", "news", "patents"];

function printHelp() {
  console.log(`REAPP hackathon consumer

Usage:
  npm run demo -- --endpoint="https://reapp.live/api/express/WORKSPACE/source" --merchant="G..."

The REAPP_ENDPOINT and REAPP_MERCHANT environment variables are equivalent.
The command creates disposable testnet keys. It never needs a wallet secret.`);
}

async function loadEnvFile(path) {
  let contents;
  try {
    contents = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error(`${path} contains an invalid environment line`);
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
      throw new Error(`${path} contains an invalid environment name`);
    }
    if (
      value.length >= 2
      && ((value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[name] === undefined) process.env[name] = value;
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      parsed.help = true;
      continue;
    }
    const match = argument.match(/^--(endpoint|merchant)=(.*)$/s);
    if (match) {
      parsed[match[1]] = match[2];
      continue;
    }
    if (argument === "--endpoint" || argument === "--merchant") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} needs a value`);
      parsed[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${argument}`);
  }
  return parsed;
}

function normalizeEndpoint(value) {
  if (!value) throw new Error("REAPP endpoint is missing; copy the command from /hackathon");
  const endpoint = new URL(value);
  const loopback = endpoint.hostname === "127.0.0.1" || endpoint.hostname === "localhost";
  if (
    endpoint.username
    || endpoint.password
    || endpoint.search
    || endpoint.hash
    || (endpoint.protocol !== "https:" && !(loopback && endpoint.protocol === "http:"))
  ) {
    throw new Error("REAPP endpoint must be an exact HTTPS URL (HTTP is allowed only on loopback)");
  }
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, "");
  if (!endpoint.pathname.endsWith("/source")) {
    throw new Error("REAPP endpoint must end with /source");
  }
  return endpoint.toString().replace(/\/$/, "");
}

function validateMerchant(value) {
  if (!value) throw new Error("REAPP merchant is missing; copy the command from /hackathon");
  try {
    if (Keypair.fromPublicKey(value).publicKey() !== value) throw new Error("non-canonical key");
  } catch {
    throw new Error("REAPP merchant must be a valid Stellar public G-address");
  }
  return value;
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("request timed out")), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForAccount(publicKey) {
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    const response = await fetchWithTimeout(
      `${HORIZON}/accounts/${encodeURIComponent(publicKey)}`,
      { headers: { accept: "application/json" } },
      15_000,
    ).catch(() => undefined);
    if (response?.ok) return;
    if (response && response.status !== 404 && response.status !== 429 && response.status < 500) {
      throw new Error(`Horizon could not read funded account ${publicKey}`);
    }
    await sleep(Math.min(500 * attempt, 2_000));
  }
  throw new Error(`testnet funding for ${publicKey} was not visible before timeout`);
}

async function fund(publicKey) {
  let lastFailure = "Friendbot did not respond";
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const url = new URL(FRIEND_BOT);
      url.searchParams.set("addr", publicKey);
      const response = await fetchWithTimeout(
        url,
        { headers: { accept: "application/json" } },
        30_000,
      );
      if (response.ok || response.status === 400) {
        await waitForAccount(publicKey);
        return;
      }
      lastFailure = `Friendbot returned HTTP ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
    await sleep(Math.min(1_000 * (2 ** (attempt - 1)), 8_000));
  }
  throw new Error(`could not fund ${publicKey}: ${lastFailure}`);
}

function deliveryFromBody(value, resource, receipt) {
  if (
    !value
    || typeof value !== "object"
    || value.ok !== true
    || value.resource !== resource
    || typeof value.label !== "string"
    || typeof value.data !== "string"
    || value.settledTx?.toLowerCase() !== receipt.txHash
  ) {
    throw new DeliveryPendingError(
      receipt,
      new Error("the paid response did not contain the exact expected delivery evidence"),
    );
  }
  return value;
}

function isBudgetRejection(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /Error\(Contract,\s*#6\)|BudgetExceeded|budget exceeded/i.test(message);
}

async function reportBudgetRejection(url, mandateId) {
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ event: "contract_rejected", mandateId }),
  }, 60_000);
  const body = await response.json().catch(() => undefined);
  if (!response.ok || body?.ok !== true || body?.verified !== true) {
    throw new Error(`the hosted rejection report was not verified (HTTP ${response.status})`);
  }
}

function usesHostedCompanion(endpoint) {
  const pathname = new URL(endpoint).pathname.replace(/\/+$/, "");
  return /^\/api\/express\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/source$/i.test(pathname);
}

async function main() {
  await loadEnvFile(resolve(".env"));
  await loadEnvFile(resolve(".env.local"));
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }

  const endpoint = normalizeEndpoint(flags.endpoint ?? process.env.REAPP_ENDPOINT);
  const merchant = validateMerchant(flags.merchant ?? process.env.REAPP_MERCHANT);
  const receiptStore = new FileSettlementReceiptStore(resolve(STATE_ROOT, "pending-receipts.json"));
  const resultStore = new FileRunResultStore(resolve(STATE_ROOT, "results.json"));
  const existingReceipts = await receiptStore.listPending();
  if (existingReceipts.length > 0) {
    const hashes = existingReceipts.map((receipt) => receipt.txHash).join(", ");
    throw new Error(
      `unresolved payment evidence exists (${hashes}); no new payment was attempted. Review .reapp and run npm run reset only after resolution.`,
    );
  }

  const user = Keypair.random();
  const agentKey = Keypair.random();
  const runId = await resultStore.begin({
    endpoint,
    merchant,
    network: "stellar-testnet",
    budgetXlm: "3.00",
    priceXlm: "1.00",
  });

  console.log("\nREAPP hackathon demo · Stellar testnet");
  console.log(`contract  ${reapp.testnet.mandateRegistryId}`);
  console.log(`user      ${user.publicKey()}`);
  console.log(`agent     ${agentKey.publicKey()}`);
  console.log(`merchant  ${merchant}`);

  try {
    console.log("\n1. Funding disposable user and agent accounts...");
    await Promise.all([fund(user.publicKey()), fund(agentKey.publicKey())]);
    await resultStore.append(runId, {
      type: "accounts_funded",
      user: user.publicKey(),
      agent: agentKey.publicKey(),
    });

    console.log("2. Registering a 3 XLM mandate and approving its exact allowance...");
    const mandate = reapp.createIntentMandate({
      user: user.publicKey(),
      agent: agentKey.publicKey(),
      merchant,
      asset: reapp.testnet.nativeSac,
      maxAmount: "3.00",
      expiry: Math.floor(Date.now() / 1_000) + 3_600,
      nonce: randomUUID(),
    });
    const registerTx = await reapp.registerMandate(mandate, { signer: user });
    const approveTx = await reapp.approveBudget(mandate, { signer: user });
    await resultStore.append(runId, {
      type: "mandate_ready",
      mandateId: mandate.id,
      registerTx,
      approveTx,
    });
    console.log(`   register  ${EXPLORER_TX}${registerTx}`);
    console.log(`   approve   ${EXPLORER_TX}${approveTx}`);

    const firstUrl = `${endpoint}/market`;
    console.log("3. Verifying the first unpaid request returns a bound 402...");
    const challengeResponse = await fetchWithTimeout(firstUrl, {
      headers: {
        accept: "application/json",
        [REAPP_PAYMENT_CAPABILITIES_HEADER]: BOUND_PAYMENT_CAPABILITY,
      },
      redirect: "error",
    });
    if (challengeResponse.status !== 402) {
      throw new Error(`unpaid request returned HTTP ${challengeResponse.status}; expected 402`);
    }
    const requirement = await parse402(challengeResponse);
    if (
      requirement.proofVersion !== 2
      || requirement.payTo !== merchant
      || requirement.asset !== reapp.testnet.nativeSac
      || requirement.amount !== "1.00"
      || requirement.contract !== reapp.testnet.mandateRegistryId
      || requirement.challenge?.audience !== new URL(endpoint).origin
    ) {
      throw new Error("the 402 challenge did not match the selected merchant, asset, price, contract, and origin");
    }
    await resultStore.append(runId, {
      type: "challenge_402_verified",
      resource: "market",
      status: 402,
      priceXlm: "1.00",
    });
    console.log("   402 verified: merchant, asset, amount, contract, and audience match");

    const consumer = reapp.agent({
      mandate,
      signer: agentKey,
      proofPolicy: "bound-v2-only",
      receiptStore,
    });
    const transactions = [];
    console.log("4. Calling agent.fetch() four times (budget covers three)...");

    for (const resource of RESOURCES) {
      const url = `${endpoint}/${resource}`;
      console.log(`   GET /${resource}`);
      await resultStore.append(runId, { type: "purchase_started", resource });
      try {
        const response = await consumer.fetch(url, { redirect: "error" });
        if (resource === "patents") {
          throw new Error("the fourth payment unexpectedly passed the 3 XLM contract budget");
        }
        if (response.status !== 200) {
          throw new Error(`paid request returned HTTP ${response.status}; expected 200`);
        }
        const receipt = getSettlementReceipt(response);
        if (!receipt || receipt.proofVersion !== 2 || receipt.mandateId !== mandate.id) {
          throw new Error("paid response omitted its exact bound settlement receipt");
        }
        const body = deliveryFromBody(await response.json(), resource, receipt);
        await resultStore.append(runId, {
          type: "delivery_accepted",
          resource,
          status: 200,
          receiptId: receipt.receiptId,
          txHash: receipt.txHash,
          label: body.label,
          data: body.data,
        });
        await consumer.acknowledgeDelivery(receipt);
        transactions.push(receipt.txHash);
        console.log(`   402 → contract payment → 200  ${EXPLORER_TX}${receipt.txHash}`);
      } catch (error) {
        if (resource !== "patents" || !isBudgetRejection(error)) throw error;
        await resultStore.append(runId, {
          type: "contract_rejected",
          resource,
          reason: "budget exceeded",
          mandateId: mandate.id,
        });
        if (usesHostedCompanion(endpoint)) {
          await reportBudgetRejection(url, mandate.id);
          await resultStore.append(runId, {
            type: "hosted_rejection_verified",
            resource,
            mandateId: mandate.id,
          });
          console.log("   blocked on-chain: 3 XLM budget exhausted (hosted page verified)");
        } else {
          console.log("   blocked on-chain: 3 XLM budget exhausted");
        }
      }
    }

    const pending = await receiptStore.listPending();
    if (transactions.length !== 3 || pending.length !== 0) {
      throw new Error("final gate check expected three deliveries and no unresolved receipt");
    }
    await resultStore.finish(runId, "complete", {
      mandateId: mandate.id,
      served: 3,
      blocked: 1,
      transactions,
    });
    console.log("\nComplete: three deliveries verified; fourth payment rejected by the contract.");
    console.log("Evidence: .reapp/results.json\n");
  } catch (error) {
    const summary = error instanceof DeliveryPendingError
      ? {
          reason: "delivery pending",
          txHash: error.receipt.txHash,
          receiptId: error.receipt.receiptId,
        }
      : { reason: error instanceof Error ? error.message : String(error) };
    await resultStore.finish(runId, "failed", summary).catch(() => undefined);
    if (error instanceof DeliveryPendingError) {
      throw new Error(
        `payment ${error.receipt.txHash} may have settled; its receipt is durable in .reapp. Do not run the demo again until it is reconciled.`,
        { cause: error },
      );
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(`\nREAPP demo stopped safely: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
