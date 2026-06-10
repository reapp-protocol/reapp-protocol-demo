/**
 * Server-side glue around the PUBLISHED @reapp-sdk/core. Runs only in API
 * routes (Node). Ephemeral testnet keys — this is a demo, never mainnet.
 */
import { Keypair } from "@stellar/stellar-sdk";
import { reapp, type CreateIntentMandateInput } from "@reapp-sdk/core";
import { TESTNET, token } from "@reapp-sdk/stellar";

export const EXPLORER = "https://testnet.stellarchain.io";
export const UNLOCK_PRICE = "1.00"; // XLM per content unlock
export const BUDGET = "3.00"; // mandate cap — 3 unlocks, then the contract blocks the 4th

async function friendbot(pub: string): Promise<void> {
  await fetch(`https://friendbot.stellar.org/?addr=${pub}`).catch(() => undefined);
}

const xlm = (stroops: bigint) => Number(stroops) / 1e7;

/** Create + fund the three demo actors on testnet. */
export async function init() {
  const user = Keypair.random();
  const agent = Keypair.random();
  const merchant = Keypair.random();
  await Promise.all([
    friendbot(user.publicKey()),
    friendbot(agent.publicKey()),
    friendbot(merchant.publicKey()),
  ]);
  // brief settle
  await new Promise((r) => setTimeout(r, 3000));
  return {
    userSecret: user.secret(),
    userPublic: user.publicKey(),
    agentSecret: agent.secret(),
    agentPublic: agent.publicKey(),
    merchantSecret: merchant.secret(),
    merchantPublic: merchant.publicKey(),
    contractId: TESTNET.mandateRegistryId,
    explorer: EXPLORER,
  };
}

/** The mandate inputs the client round-trips so the server can rebuild the
 *  exact same mandate (same nonce → same id) on every action. */
export type MandateInputs = CreateIntentMandateInput;

/** Register the mandate + grant the SEP-41 allowance (user-signed). */
export async function setup(args: {
  userSecret: string;
  agentPublic: string;
  merchantPublic: string;
}) {
  const inputs: MandateInputs = {
    user: Keypair.fromSecret(args.userSecret).publicKey(),
    agent: args.agentPublic,
    merchant: args.merchantPublic,
    asset: reapp.testnet.nativeSac,
    maxAmount: BUDGET,
    expiry: Math.floor(Date.now() / 1000) + 3600,
    nonce: `${Date.now()}:${Math.random().toString(36).slice(2)}`,
  };
  const mandate = reapp.createIntentMandate(inputs);
  const registerTx = await reapp.registerMandate(mandate, { signer: args.userSecret });
  const approveTx = await reapp.approveBudget(mandate, { signer: args.userSecret });
  return { inputs, mandateId: mandate.id, registerTx, approveTx };
}

/** Agent pays the unlock price. Returns the tx hash, or throws if the contract
 *  rejects it (overspend / revoked / etc.) — which is the whole point. */
export async function pay(args: { inputs: MandateInputs; agentSecret: string; amount?: string }) {
  const mandate = reapp.createIntentMandate(args.inputs); // same nonce → same id
  const hash = await reapp.agent({ mandate, signer: args.agentSecret }).pay(args.amount ?? UNLOCK_PRICE);
  return { hash };
}

/** User revokes the mandate. */
export async function revoke(args: { inputs: MandateInputs; userSecret: string }) {
  const mandate = reapp.createIntentMandate(args.inputs);
  const hash = await reapp.revokeMandate(mandate, { signer: args.userSecret });
  return { hash };
}

/** Read XLM balances for the demo actors. */
export async function balances(args: { userPublic: string; merchantPublic: string }) {
  const asset = reapp.testnet.nativeSac;
  const [user, merchant] = await Promise.all([
    token.balance(TESTNET, asset, args.userPublic).catch(() => 0n),
    token.balance(TESTNET, asset, args.merchantPublic).catch(() => 0n),
  ]);
  return { user: xlm(user), merchant: xlm(merchant) };
}
