#!/usr/bin/env node

import { synchronizeGeneratedMetadata } from "./catalog.mjs";
import { synchronizeStarterPackages } from "./materialize.mjs";

if (process.argv.length !== 2) {
  console.error("Usage: node scripts/starters/verify.mjs");
  process.exitCode = 2;
} else {
  try {
    const [metadata, packages] = await Promise.all([
      synchronizeGeneratedMetadata({ check: true }),
      synchronizeStarterPackages({ check: true }),
    ]);
    console.log(`Starter catalog verified: ${metadata.kitCount} kits, ${packages.kitCount} self-contained deterministic archives`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
