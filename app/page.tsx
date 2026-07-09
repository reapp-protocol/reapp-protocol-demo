"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Package, Play, Terminal } from "lucide-react";

const INSTALL = `npm install @reapp-sdk/core @stellar/stellar-sdk`;

const QUICKSTART = `import { reapp } from "@reapp-sdk/core";
import { Keypair } from "@stellar/stellar-sdk";

const user = Keypair.fromSecret(USER_SECRET);   // owns funds, signs the mandate
const agent = Keypair.fromSecret(AGENT_SECRET);  // the autonomous spender

const m = reapp.createIntentMandate({
  user: user.publicKey(),
  agent: agent.publicKey(),
  merchant: MERCHANT,
  asset: reapp.testnet.nativeSac,
  maxAmount: "5.00",
  expiry: Math.floor(Date.now() / 1000) + 3600,
});

await reapp.registerMandate(m, { signer: user }); // authorize on-chain
await reapp.approveBudget(m,  { signer: user });   // SEP-41 allowance -> contract
await reapp.agent({ mandate: m, signer: agent }).pay("1.00"); // agent-signed`;

const FETCH = `// 0.2.0: the x402 client. Fetch a 402-gated URL; the SDK pays
// on-chain and retries with the settlement proof, all under the mandate.
const agent = reapp.agent({ mandate: m, signer });
const res = await agent.fetch("https://merchant.example/report");
const data = await res.json(); // served only after the payment verifies`;

const API: [string, string][] = [
  ["reapp.createIntentMandate(input)", "Build a mandate + its on-chain id (no chain call)"],
  ["reapp.registerMandate(m, { signer })", "Store it on-chain, user-signed"],
  ["reapp.approveBudget(m, { signer })", "Approve the contract for SEP-41 spending, user-signed"],
  ["reapp.agent({ mandate, signer }).pay(amt)", "Execute a mandate-validated payment, agent-signed"],
  ["reapp.agent({ mandate, signer }).fetch(url)", "x402: GET a 402-gated URL, pay on-chain, return the response"],
  ["reapp.revokeMandate(m, { signer })", "Withdraw consent, user-signed"],
  ["Errors", "Typed contract errors for branching (Errors[6] = BudgetExceeded)"],
];

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: d, ease: "easeOut" as const },
});

export default function Docs() {
  return (
    <main className="relative mx-auto w-full max-w-3xl px-4 py-12 sm:px-5">
      <div className="glow" aria-hidden />

      <motion.div {...fade()}>
        <div className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-emerald-300/90">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          @reapp-sdk/core 0.2.0 · DOCS
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
          Agent payments in{" "}
          <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(52,211,153,0.25)]">5 lines</span>.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-emerald-100/70 sm:text-base">
          A user signs a budget-capped mandate; an AI agent pays under it; a Soroban contract enforces every limit
          on-chain, so even a buggy or malicious SDK can't exceed the mandate.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/cli" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#06241a] shadow-[0_0_28px_rgba(52,211,153,0.35)] transition hover:bg-emerald-300">
            <Play className="h-4 w-4" aria-hidden />
            Run the CLI live
          </Link>
          <a href="https://www.npmjs.com/package/reapp-protocol-cli" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-emerald-100/80 transition hover:border-emerald-400/40 hover:text-emerald-100">
            <Package className="h-4 w-4" aria-hidden />
            reapp-protocol-cli
          </a>
        </div>
      </motion.div>

      <motion.section {...fade(0.06)} className="mt-10 rounded-2xl border border-emerald-300/15 bg-black/30 p-5 shadow-[0_0_48px_rgba(16,185,129,0.12)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-emerald-400 text-[#06241a]">
              <Terminal className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-emerald-100">Live terminal on reapp.live</h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-100/65">
                Run <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-emerald-100">reapp demo research-agent</code>
                {" "}against testnet without leaving the browser.
              </p>
            </div>
          </div>
          <Link href="/cli" className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10">
            Open CLI
          </Link>
        </div>
      </motion.section>

      <motion.section {...fade(0.08)} className="mt-9">
        <H>Install</H>
        <Code>{INSTALL}</Code>
      </motion.section>

      <motion.section {...fade(0.14)} className="mt-8">
        <H>Quick start (testnet)</H>
        <Code>{QUICKSTART}</Code>
        <p className="mt-3 text-sm text-emerald-100/60">
          That&apos;s the whole flow. <code>pay()</code> routes through{" "}
          <code>MandateRegistry.execute_payment</code>, which re-validates everything and moves funds atomically. Overspend,
          wrong merchant, replay, or pay-after-revoke → the contract rejects and <code>pay()</code> throws.
        </p>
      </motion.section>

      <motion.section {...fade(0.17)} className="mt-8">
        <H>Pay for a resource (x402)</H>
        <Code>{FETCH}</Code>
        <p className="mt-3 text-sm text-emerald-100/60">
          <code>fetch()</code> never treats the 402 as authorization. It settles through the same{" "}
          <code>execute_payment</code> path, so a revoked, expired, over-budget, or out-of-scope request is rejected
          on-chain and <code>fetch()</code> throws.
        </p>
      </motion.section>

      <motion.section {...fade(0.2)} className="mt-8">
        <H>API</H>
        <div className="overflow-hidden rounded-xl border border-white/10">
          {API.map(([sig, desc], i) => (
            <div key={sig} className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${i % 2 ? "bg-white/[0.02]" : ""}`}>
              <code className="text-xs text-emerald-300">{sig}</code>
              <span className="text-xs text-emerald-100/60 sm:max-w-[55%] sm:text-right">{desc}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section {...fade(0.26)} className="mt-8">
        <H>Why it&apos;s safe</H>
        <ul className="space-y-2 text-sm text-emerald-100/70">
          {[
            "The allowance is approved for the CONTRACT, never the agent — funds stay in the user's wallet until the contract pulls them.",
            "execute_payment re-checks scope, budget, expiry, and replay against on-chain state on every spend.",
            "State is written before the transfer (checks-effects-interactions) — no reentrancy window.",
            "Adversarial gatecheck passed (BulletproofBar, 0 confirmed defects) + 19 contract tests.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-0.5 text-emerald-400">✓</span> {t}
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.div {...fade(0.32)} className="mt-10 flex flex-wrap gap-3">
        <a href="https://www.npmjs.com/package/@reapp-sdk/core" target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#06241a] hover:bg-emerald-300">View on npm ↗</a>
        <a href="https://github.com/reapp-protocol/reapp-protocol" target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-emerald-100/80 hover:border-emerald-400/40">Contract + protocol ↗</a>
        <Link href="/cli" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-emerald-100/80 hover:border-emerald-400/40">Run CLI live →</Link>
      </motion.div>
    </main>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-lg font-semibold text-emerald-100">{children}</h2>;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl glass bg-black/25 p-4 text-xs leading-relaxed text-emerald-100/90">
      <code>{children}</code>
    </pre>
  );
}
