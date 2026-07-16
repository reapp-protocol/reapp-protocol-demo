import { Keypair } from "@stellar/stellar-sdk";
import { fetchWithTimeout, sleep } from "./http.mjs";

export const STELLAR_TESTNET = Object.freeze({
  friendbot: "https://friendbot.stellar.org/",
  horizon: "https://horizon-testnet.stellar.org",
  explorerTransaction: "https://stellar.expert/explorer/testnet/tx/",
});

export function createDisposableTestnetActors() {
  return Object.freeze({
    user: Keypair.random(),
    agent: Keypair.random(),
    merchant: Keypair.random(),
  });
}

export function publicActorAddresses(actors) {
  return Object.freeze({
    user: actors.user.publicKey(),
    agent: actors.agent.publicKey(),
    merchant: actors.merchant.publicKey(),
  });
}

export function explorerTransactionUrl(txHash) {
  if (typeof txHash !== "string" || !/^[0-9a-f]{64}$/i.test(txHash)) {
    throw new Error("transaction hash must contain exactly 64 hexadecimal characters");
  }
  return `${STELLAR_TESTNET.explorerTransaction}${txHash.toLowerCase()}`;
}

export async function waitForTestnetAccount(publicKey, {
  attempts = 15,
  horizon = STELLAR_TESTNET.horizon,
} = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchWithTimeout(
      `${horizon}/accounts/${encodeURIComponent(publicKey)}`,
      { headers: { accept: "application/json" }, redirect: "error" },
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

export async function fundTestnetAccount(publicKey, {
  attempts = 5,
  friendbot = STELLAR_TESTNET.friendbot,
  horizon = STELLAR_TESTNET.horizon,
} = {}) {
  Keypair.fromPublicKey(publicKey);
  let lastFailure = "Friendbot did not respond";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const url = new URL(friendbot);
      url.searchParams.set("addr", publicKey);
      const response = await fetchWithTimeout(
        url,
        { headers: { accept: "application/json" }, redirect: "error" },
        30_000,
      );
      if (response.ok || response.status === 400) {
        await waitForTestnetAccount(publicKey, { horizon });
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

export async function fundDisposableTestnetActors(actors, options) {
  const addresses = publicActorAddresses(actors);
  await Promise.all([
    fundTestnetAccount(addresses.user, options),
    fundTestnetAccount(addresses.agent, options),
    fundTestnetAccount(addresses.merchant, options),
  ]);
  return addresses;
}
