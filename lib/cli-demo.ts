/**
 * Server-side "research agent" demo, mirrored from the reapp CLI's
 * `reapp demo research-agent`. Spins up three ephemeral testnet accounts,
 * registers an on-chain mandate, and the agent buys research sources one by one —
 * each a real execute_payment — until the contract caps the budget. There is no
 * LLM here: the on-chain enforcement is the point. Streamed as an async generator.
 *
 * RELIABILITY: the PUBLISHED @reapp-sdk/core (0.2.0) has no settlement fix, so its
 * write calls can return before the tx settles on a slow testnet (NOT_FOUND,
 * BadSequence, or odd downstream simulation states). So every write here is
 * wrapped to RECONCILE against on-chain state: a write "succeeds" if the chain
 * reflects it, even when the client call threw. The contract is the source of
 * truth; budget/expiry/replay are always enforced on-chain.
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
const errCode = (msg: string) => (msg.match(/Error\(Contract,\s*#(\d+)\)/) ?? [])[1];

type Client = ReturnType<typeof registryClient>;

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

/** On-chain mandate state, or null if not found / unreadable yet. */
async function mandateState(client: Client, idBuffer: Buffer): Promise<{ seq: number; spent: bigint } | null> {
  try {
    const md = (await client.get_mandate({ mandate_id: idBuffer })).result.unwrap();
    return { seq: Number(md.seq), spent: BigInt(md.spent) };
  } catch {
    return null;
  }
}

/** Poll until `fn` returns a truthy value (write propagated), else null. */
async function pollFor<T>(fn: () => Promise<T | null>, tries = 25): Promise<T | null> {
  for (let i = 0; i < tries; i += 1) {
    const v = await fn();
    if (v) return v;
    await sleep(1000);
  }
  return null;
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
  const client = registryClient(TESTNET, keypairSigner(agent, TESTNET.networkPassphrase));

  yield { type: "status", text: "Registering the mandate and granting the SEP-41 allowance to the contract" };

  // Register — reconcile: the tx may land even if the client call throws NOT_FOUND.
  let registered = false;
  for (let attempt = 0; attempt < 4 && !registered; attempt += 1) {
    try {
      await reapp.registerMandate(mandate, { signer: user.secret() });
    } catch (e) {
      log.warn("demo: register call errored, checking chain", { reason: (e instanceof Error ? e.message : String(e)).split("\n")[0].slice(0, 60) });
    }
    if (await pollFor(() => mandateState(client, mandate.idBuffer), 20)) registered = true;
  }
  if (!registered) {
    yield { type: "error", message: "could not register the mandate on testnet (network was unreachable)" };
    return;
  }

  // Approve the SEP-41 allowance to the contract — idempotent, so just retry.
  let approved = false;
  for (let attempt = 0; attempt < 4 && !approved; attempt += 1) {
    try {
      await reapp.approveBudget(mandate, { signer: user.secret() });
      approved = true;
    } catch {
      await sleep(1500);
    }
  }
  yield { type: "mandate", id: mandate.id, budget: BUDGET };
  log.chain("demo: mandate registered", { id: mandate.id.slice(0, 10) });

  let purchased = 0;
  let seq = 0; // expected current mandate seq; advances on each landed payment

  outer: for (const s of SOURCES) {
    yield { type: "buy_attempt", source: s.name, icon: s.icon, price: SOURCE_PRICE };
    let resolved = false;
    for (let attempt = 0; attempt < 5 && !resolved; attempt += 1) {
      let hash: string | null = null;
      let code: string | undefined;
      try {
        hash = await reapp.agent({ mandate, signer: agent.secret() }).pay(SOURCE_PRICE);
      } catch (e) {
        code = errCode(e instanceof Error ? e.message : String(e));
      }

      if (code === "6") {
        // BudgetExceeded — the contract cap. This is the aha, not an error.
        yield { type: "buy_blocked", source: s.name, reason: `budget cap of ${BUDGET} XLM reached` };
        log.warn(`demo: contract blocked ${s.name} — budget exhausted`);
        yield { type: "result", purchased, budget: BUDGET };
        return;
      }

      // Reconcile: did the payment actually land? (seq advanced, or client returned a hash)
      const st = await mandateState(client, mandate.idBuffer);
      if (hash || (st && st.seq > seq)) {
        purchased += 1;
        seq = st ? st.seq : seq + 1;
        yield { type: "buy_ok", source: s.name, hash: hash ?? "", url: hash ? txUrl(hash) : "" };
        log.chain(`demo: bought ${s.name}`, { tx: (hash ?? "confirmed").slice(0, 10) });
        await pollFor(async () => {
          const cur = await mandateState(client, mandate.idBuffer);
          return cur && cur.seq >= seq ? cur : null;
        }, 15);
        resolved = true;
        break;
      }
      // transient (NOT_FOUND / BadSequence / simulation hiccup) — wait and retry
      await sleep(1500);
    }
    if (!resolved) {
      yield { type: "error", message: `purchase of ${s.name} did not settle after several retries` };
      return;
    }
  }

  yield { type: "result", purchased, budget: BUDGET };
}
