#!/usr/bin/env node

import { synchronizeGeneratedMetadata } from "./catalog.mjs";

const argumentsList = process.argv.slice(2);
const supported = argumentsList.length === 0 || (argumentsList.length === 1 && argumentsList[0] === "--check");

if (!supported) {
  console.error("Usage: node scripts/starters/generate.mjs [--check]");
  process.exitCode = 2;
} else {
  try {
    const result = await synchronizeGeneratedMetadata({ check: argumentsList[0] === "--check" });
    const action = result.checked ? "verified" : result.changed ? "generated" : "current";
    console.log(`Starter metadata ${action}: ${result.kitCount} kits`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
