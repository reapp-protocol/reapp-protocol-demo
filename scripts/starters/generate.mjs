#!/usr/bin/env node

import { synchronizeGeneratedMetadata } from "./catalog.mjs";
import { synchronizeStarterPackages } from "./materialize.mjs";

const argumentsList = process.argv.slice(2);
const supported = argumentsList.length === 0 || (argumentsList.length === 1 && argumentsList[0] === "--check");

if (!supported) {
  console.error("Usage: node scripts/starters/generate.mjs [--check]");
  process.exitCode = 2;
} else {
  try {
    const check = argumentsList[0] === "--check";
    const [metadata, packages] = await Promise.all([
      synchronizeGeneratedMetadata({ check }),
      synchronizeStarterPackages({ check }),
    ]);
    const action = check ? "verified" : "generated";
    console.log(`Starter catalog and packages ${action}: ${metadata.kitCount} kits, ${packages.kitCount} deterministic archives`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
