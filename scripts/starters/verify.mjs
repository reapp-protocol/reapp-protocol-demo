#!/usr/bin/env node

import { synchronizeGeneratedMetadata } from "./catalog.mjs";

if (process.argv.length !== 2) {
  console.error("Usage: node scripts/starters/verify.mjs");
  process.exitCode = 2;
} else {
  try {
    const result = await synchronizeGeneratedMetadata({ check: true });
    console.log(`Starter catalog verified: ${result.kitCount} kits with current generated metadata`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
