/**
 * Server-side "research agent" demo, mirrored from the reapp CLI's
 * `reapp demo research-agent`. Spins up three ephemeral testnet accounts,
 * registers an on-chain mandate, and the agent buys research sources one by one —
 * each a real execute_payment — until the contract caps the budget. There is no
 * LLM here: the on-chain enforcement is the point. Streamed as an async generator.
 *
 * Reliability: the PUBLISHED @reapp-sdk/core does not yet carry the tranche-2
 * settlement fix, so this flow funds via friendbot with an RPC-poll + retry and
 * polls the mandate seq between purchases to avoid the stale-read BadSequence
 * race. The contract is the source of truth throughout.
 */
import { reapp } from "@reapp-sdk/core";
import { TESTNET, registryClient, keypairSigner } from "@reapp-sdk/stellar";
import { Keypair, rpc } from "@stellar/stellar-sdk";
import { txUrl, accountUrl } from "./explorer";
import { log } from "./log";

export const SOURCE_PRICE = "1.00";
export const BUDGET = "3.00"; // three sources fit; the contract blocks the fourth

const SOURCES = [
  { name: "Market Data API", icon: "📈" },
  { name: "Academic Papers", icon: "📚" },
  { name: "News Archive", icon: "📰" },
  { name: "Patent Database", icon: "⚗️" },
  { name: "Analyst Reports", icon: "🏦" },
];

export type DemoEvent =
  | { type: "status"; text: string }
  | { type: "funded"; user: string; agent: string; merchant: string; userUrl: string; agentUrl: string }
  | { type: "mandate"; id: string; budget: string }
  | { type: "buy_attempt"; source: string; icon: string; price: string }
  | { type: "buy_ok"; source: string; hash: string; url: string }
  | { type: "buy_blocked"; source: string; reason: string }
  | { type: "result"; purchased: number; budget: string }
  | { type: "error"; message: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fund an account and confirm it on the soroban RPC (the source the contract
 *  calls use). Friendbot can rate-limit, so retry the hit and throw if it never
 *  lands rather than letting a later call fail with a confusing "not found". */
async function fund(pub: string): Promise<void> {
  const server = new rpc.Server(TESTNET.rpcUrl);
  for (let round = 0; round < 4; round += 1) {
    await fetch(`https://friendbot.stellar.org/?addr=${pub}`).catch(() => undefined);
    for (let i = 0; i < 8; i += 1) {
      try {
        await server.getAccount(pub);
        return;
      } catch {
        // not visible on the RPC yet — keep polling before re-friendbotting
      }
      await sleep(1000);
    }
  }
  throw new Error(`friendbot could not fund ${pub} after several attempts`);
}

/** Poll the contract until the mandate seq reaches `target` (write propagated),
 *  so the next purchase doesn't read a stale seq and trip the replay guard. */
async function waitForSeq(
  client: ReturnType<typeof registryClient>,
  idBuffer: Buffer,
  target: number,
  tries = 20,
): Promise<void> {
  for (let i = 0; i < tries; i += 1) {
    try {
      const md = (await client.get_mandate({ mandate_id: idBuffer })).result.unwrap();
      if (Number(md.seq) >= target) return;
    } catch {
      // transient read error — keep polling
    }
    await sleep(1000);
  }
}

export async function* runCliDemo(): AsyncGenerator<DemoEvent> {
  const user = Keypair.random();
  const agent = Keypair.random();
  const merchant = Keypair.random();

  yield { type: "status", text: "Funding 3 ephemeral testnet accounts via friendbot" };
  log.step("demo: funding 3 ephemeral accounts");
  await Promise.all([fund(user.publicKey()), fund(agent.publicKey()), fund(merchant.publicKey())]);
  yield {
    type: "funded",
    user: user.publicKey(),
    agent: agent.publicKey(),
    merchant: merchant.publicKey(),
    userUrl: accountUrl(user.publicKey()),
    agentUrl: accountUrl(agent.publicKey()),
  };
  log.chain("demo: accounts funded");

  const inputs = {
    user: user.publicKey(),
    agent: agent.publicKey(),
    merchant: merchant.publicKey(),
    asset: reapp.testnet.nativeSac,
    maxAmount: BUDGET,
    expiry: Math.floor(Date.now() / 1000) + 3600,
    nonce: `${Date.now()}:${Math.random().toString(36).slice(2)}`,
  };
  const mandate = reapp.createIntentMandate(inputs);
  yield { type: "status", text: "Registering the mandate and granting the SEP-41 allowance to the contract" };
  await reapp.registerMandate(mandate, { signer: user.secret() });
  await reapp.approveBudget(mandate, { signer: user.secret() });
  yield { type: "mandate", id: mandate.id, budget: BUDGET };
  log.chain("demo: mandate registered", { id: mandate.id.slice(0, 10) });

  const client = registryClient(TESTNET, keypairSigner(agent, TESTNET.networkPassphrase));
  let purchased = 0;
  let seq = 0;

  for (const s of SOURCES) {
    yield { type: "buy_attempt", source: s.name, icon: s.icon, price: SOURCE_PRICE };
    let settled = false;
    for (let attempt = 0; attempt < 4 && !settled; attempt += 1) {
      try {
        const hash = await reapp.agent({ mandate, signer: agent.secret() }).pay(SOURCE_PRICE);
        purchased += 1;
        seq += 1;
        settled = true;
        yield { type: "buy_ok", source: s.name, hash, url: txUrl(hash) };
        log.chain(`demo: bought ${s.name}`, { tx: hash.slice(0, 10) });
        await waitForSeq(client, mandate.idBuffer, seq);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const code = (msg.match(/Error\(Contract,\s*#(\d+)\)/) ?? [])[1];
        if (code === "6") {
          yield { type: "buy_blocked", source: s.name, reason: `budget cap of ${BUDGET} XLM reached` };
          log.warn(`demo: contract blocked ${s.name} — budget exhausted`);
          yield { type: "result", purchased, budget: BUDGET };
          return;
        }
        if (code === "8") {
          await waitForSeq(client, mandate.idBuffer, seq);
          continue;
        }
        yield { type: "error", message: (msg.split("\n")[0] ?? msg).slice(0, 120) };
        return;
      }
    }
  }
  yield { type: "result", purchased, budget: BUDGET };
}
