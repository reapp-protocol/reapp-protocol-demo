import { access, mkdir, rename } from "node:fs/promises";
import { resolve } from "node:path";
import {
  FileBoundRedemptionStore,
  FileRunResultStore,
  FileSettlementReceiptStore,
} from "./storage.mjs";

const STATE_ROOT = resolve(".reapp");
const ARCHIVE_ROOT = resolve(".reapp-archive");

function printHelp() {
  console.log(`REAPP local-state reset

Usage:
  npm run reset

The command first clears only receipts whose delivery was already recorded
durably. It refuses to reset when unresolved payment evidence remains. Safe
state is moved into .reapp-archive instead of being deleted.`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  if (args.length > 0) throw new Error(`unknown option: ${args[0]}`);
  if (!(await exists(STATE_ROOT))) {
    console.log("No .reapp state exists; nothing changed.");
    return;
  }

  const receipts = new FileSettlementReceiptStore(
    resolve(STATE_ROOT, "pending-receipts.json"),
  );
  const results = new FileRunResultStore(resolve(STATE_ROOT, "results.json"));
  const redemptions = new FileBoundRedemptionStore(
    resolve(STATE_ROOT, "fulfillment-redemptions.json"),
  );
  const accepted = new Map(
    (await results.acceptedReceipts()).map((entry) => [entry.receiptId, entry.txHash]),
  );
  for (const receipt of await receipts.listPending()) {
    if (accepted.get(receipt.receiptId) === receipt.txHash) {
      await receipts.clearPending(receipt.receiptId);
    }
  }

  const unresolved = await receipts.listPending();
  if (unresolved.length > 0) {
    console.error("Reset refused: unresolved payment evidence remains.");
    for (const receipt of unresolved) {
      console.error(`  ${receipt.txHash}  https://stellar.expert/explorer/testnet/tx/${receipt.txHash}`);
    }
    console.error("Keep .reapp intact and reconcile these exact transactions before any new payment.");
    process.exitCode = 1;
    return;
  }

  const executing = await redemptions.listExecuting();
  if (executing.length > 0) {
    console.error("Reset refused: an accepted fulfillment proof has no durable terminal response.");
    for (const record of executing) console.error(`  ${record.payment.txHash}`);
    console.error("Resolve the exact stored claim without invoking fulfillment again.");
    process.exitCode = 1;
    return;
  }

  await mkdir(ARCHIVE_ROOT, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = resolve(ARCHIVE_ROOT, stamp);
  await rename(STATE_ROOT, destination);
  console.log(`Safe REAPP state archived at ${destination}`);
}

main().catch((error) => {
  console.error(`REAPP reset stopped safely: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
