import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import { Keypair } from "@stellar/stellar-sdk";
import { canonicalPaymentOrigin, reapp } from "@reapp-sdk/core";
import {
  createBoundReappPaidJsonRoute,
  createStellarPaymentVerifier,
} from "@reapp-sdk/express-middleware";
import { FileBoundRedemptionStore } from "./storage.mjs";

const RESOURCES = Object.freeze({
  market: Object.freeze({
    label: "Market Data API",
    data: "Verified market prices, liquidity depth, and thirty-day volatility.",
  }),
  academic: Object.freeze({
    label: "Academic Papers",
    data: "Verified peer-reviewed evidence, methodology, and sample-size notes.",
  }),
  news: Object.freeze({
    label: "News Archive",
    data: "Verified official announcements and recent market context.",
  }),
  patents: Object.freeze({
    label: "Patent Database",
    data: "Verified worldwide filings, assignees, and technology trends.",
  }),
});

function printHelp() {
  console.log(`REAPP fulfillment server

Usage:
  npm run fulfillment -- --merchant="G..." --origin="http://127.0.0.1:4021" --secret="32+ bytes"

Environment fallbacks:
  REAPP_MERCHANT, REAPP_PUBLIC_ORIGIN, REAPP_CHALLENGE_SECRET, PORT

The merchant must be a funded Stellar testnet public address. Keep the challenge
secret stable and private. This reference uses a durable single-process store.`);
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
  const names = new Set(["merchant", "origin", "secret", "port"]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      parsed.help = true;
      continue;
    }
    const equals = argument.match(/^--([a-z]+)=(.*)$/s);
    if (equals && names.has(equals[1])) {
      parsed[equals[1]] = equals[2];
      continue;
    }
    const name = argument.startsWith("--") ? argument.slice(2) : "";
    if (names.has(name)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} needs a value`);
      parsed[name] = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown option: ${argument}`);
  }
  return parsed;
}

function validateMerchant(value) {
  if (!value) throw new Error("REAPP_MERCHANT is required");
  try {
    if (Keypair.fromPublicKey(value).publicKey() !== value) throw new Error("non-canonical key");
  } catch {
    throw new Error("REAPP_MERCHANT must be a valid Stellar public G-address");
  }
  return value;
}

function validateSecret(value) {
  if (
    !value
    || value.startsWith("replace-")
    || new TextEncoder().encode(value).byteLength < 32
  ) {
    throw new Error("REAPP_CHALLENGE_SECRET must be a private value of at least 32 bytes");
  }
  return value;
}

function validatePort(value) {
  const port = Number(value ?? 4021);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer from 1 through 65535");
  }
  return port;
}

export function createFulfillmentApp({ merchant, publicOrigin, challengeSecret }) {
  const app = express();
  app.disable("x-powered-by");

  const redemptionStore = new FileBoundRedemptionStore(
    resolve(".reapp", "fulfillment-redemptions.json"),
  );
  const verifier = createStellarPaymentVerifier({
    networkConfig: reapp.testnet,
    sourceAccount: merchant,
    pollAttempts: 20,
    pollIntervalMs: 1_000,
  });
  const paidSource = createBoundReappPaidJsonRoute({
    merchant,
    sourceAccount: merchant,
    audience: publicOrigin,
    challengeSecret,
    redemptionStore,
    amount: "1.00",
    resource: (request) => request.originalUrl,
    networkConfig: reapp.testnet,
    verifier,
  }, ({ request, payment }) => {
    const id = request.params.id;
    const resource = RESOURCES[id];
    if (!resource) throw new Error("validated resource disappeared before fulfillment");
    return {
      body: {
        ok: true,
        resource: id,
        label: resource.label,
        data: resource.data,
        settledTx: payment.txHash,
      },
    };
  });

  app.get("/health", (_request, response) => {
    response.status(200).json({ ok: true, network: "stellar-testnet" });
  });
  app.get("/source/:id", (request, response, next) => {
    if (!Object.hasOwn(RESOURCES, request.params.id)) {
      response.status(404).json({ error: "resource not found" });
      return;
    }
    next();
  }, paidSource);
  app.use((_request, response) => {
    response.status(404).json({ error: "not found" });
  });
  app.use((_error, _request, response, _next) => {
    response.status(500).json({ error: "fulfillment failed closed" });
  });
  return app;
}

export async function startFulfillmentServer(options) {
  const app = createFulfillmentApp(options);
  const server = app.listen(options.port, "127.0.0.1");
  await new Promise((resolvePromise, reject) => {
    server.once("listening", resolvePromise);
    server.once("error", reject);
  });
  return server;
}

async function main() {
  await loadEnvFile(resolve(".env"));
  await loadEnvFile(resolve(".env.local"));
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return;
  }
  const merchant = validateMerchant(flags.merchant ?? process.env.REAPP_MERCHANT);
  const port = validatePort(flags.port ?? process.env.PORT);
  const publicOrigin = canonicalPaymentOrigin(
    flags.origin ?? process.env.REAPP_PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`,
    "REAPP_PUBLIC_ORIGIN",
  );
  const challengeSecret = validateSecret(
    flags.secret ?? process.env.REAPP_CHALLENGE_SECRET,
  );
  const server = await startFulfillmentServer({
    merchant,
    port,
    publicOrigin,
    challengeSecret,
  });
  console.log(`REAPP fulfillment listening at ${publicOrigin}`);
  console.log(`GET ${publicOrigin}/source/market returns 402 until contract settlement is verified.`);

  const stop = () => server.close(() => process.exit(0));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`REAPP fulfillment stopped safely: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
