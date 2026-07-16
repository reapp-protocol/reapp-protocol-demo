import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runLocalTestnetDemo } from "../shared/local-demo.mjs";
import { createScenario } from "../scenario/scenario.mjs";
import { EXPECTED_SCENARIO_METADATA } from "../scenario/metadata.mjs";

export const scenario = createScenario(EXPECTED_SCENARIO_METADATA);

function printHelp() {
  console.log(`REAPP ${scenario.id} starter

Usage:
  npm run check  # deterministic offline business vectors
  npm run demo   # disposable consumer + fulfillment on Stellar testnet

The live command creates disposable testnet keys and writes recovery evidence
under .reapp/. It never requests a wallet or mainnet secret.`);
}

export async function runDemo({ stateRoot = resolve(".reapp"), onEvent } = {}) {
  return runLocalTestnetDemo({ scenario, stateRoot, onEvent });
}

async function main() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length === 1 && ["--help", "-h"].includes(argumentsList[0])) {
    printHelp();
    return;
  }
  if (argumentsList.length !== 0) throw new Error("demo accepts only --help");
  const result = await runDemo({
    onEvent(event) {
      const detail = event.txHash ? ` · ${event.txHash}` : "";
      console.log(`[${event.type}]${detail}`);
    },
  });
  console.log(`Complete: ${result.delivered} paid deliver${result.delivered === 1 ? "y" : "ies"}; ${result.negativePathId} verified.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`REAPP demo stopped safely: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
