"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Package, Play, Terminal } from "lucide-react";

const SETUP = `npm run agents:testnet`;

const CONSUMER = `import { reapp } from "@reapp-sdk/core";

const agent = reapp.agent({ mandate, signer: agentSecret });
const response = await agent.fetch(\`\${serverUrl}/source/\${id}\`);
const resource = await response.json();`;

const FULFILLMENT = `import {
  createReappPaymentMiddleware,
  getVerifiedPayment,
} from "@reapp-sdk/express-middleware";

const requirePayment = createReappPaymentMiddleware({
  merchant,
  sourceAccount: merchant,
  amount: "1.00",
  resource: (request) => request.originalUrl,
  redemptionStore,
});

app.get("/source/:id", requirePayment, (_request, response) => {
  const payment = getVerifiedPayment(response);
  response.json({ settledTx: payment?.txHash, data: "protected value" });
});`;

const FLOW: [string, string][] = [
  ["HTTP 402", "The fulfillment API returns an exact payment requirement"],
  ["agent.fetch(url)", "The consumer settles through MandateRegistry.execute_payment"],
  ["MandateRegistry", "The contract re-checks scope, budget, expiry, and sequence"],
  ["Express middleware", "The server verifies settlement and consumes the proof once"],
  ["HTTP 200", "Only verified payment reaches the protected route handler"],
];

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: d, ease: "easeOut" as const },
});

export default function ExpressPage() {
  return (
    <main className="relative mx-auto w-full max-w-3xl px-4 py-12 sm:px-5">
      <div className="glow" aria-hidden />

      <motion.div {...fade()}>
        <div className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-emerald-300/90">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          REAPP EXPRESS · STELLAR TESTNET
        </div>
        <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
          Consumer pays.{" "}
          <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(52,211,153,0.25)]">Fulfillment verifies</span>.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-emerald-100/70 sm:text-base">
          Two working reference agents demonstrate a complete 402 payment: the consumer buys data through
          <code> agent.fetch()</code>, while an Express API independently verifies the on-chain settlement before serving it.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="https://github.com/reapp-protocol/reapp-protocol/tree/main/apps" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-[#06241a] shadow-[0_0_28px_rgba(52,211,153,0.35)] transition hover:bg-emerald-300">
            <Play className="h-4 w-4" aria-hidden />
            Open the reference agents
          </a>
          <a href="https://www.npmjs.com/package/@reapp-sdk/express-middleware" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-emerald-100/80 transition hover:border-emerald-400/40 hover:text-emerald-100">
            <Package className="h-4 w-4" aria-hidden />
            Express middleware
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
              <h2 className="text-lg font-semibold text-emerald-100">One testnet run</h2>
              <p className="mt-1 text-sm leading-relaxed text-emerald-100/65">
                From the protocol repository, run <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-emerald-100">npm run agents:testnet</code>
                {" "}to create, fund, authorize, settle, verify, serve, and reject an over-budget purchase.
              </p>
            </div>
          </div>
          <Link href="/cli" className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/10">
            Open CLI
          </Link>
        </div>
      </motion.section>

      <motion.section {...fade(0.08)} className="mt-9">
        <H>Run both agents</H>
        <Code>{SETUP}</Code>
      </motion.section>

      <motion.section {...fade(0.14)} className="mt-8">
        <H>Consumer agent</H>
        <Code>{CONSUMER}</Code>
        <p className="mt-3 text-sm text-emerald-100/60">
          The agent does not transfer tokens directly and does not decide whether the payment is allowed. The contract
          remains the source of truth for every spend.
        </p>
      </motion.section>

      <motion.section {...fade(0.17)} className="mt-8">
        <H>Fulfillment agent</H>
        <Code>{FULFILLMENT}</Code>
        <p className="mt-3 text-sm text-emerald-100/60">
          The middleware verifies the configured network, successful transaction, MandateRegistry event, matching
          SEP-41 transfer, and one-time redemption before the route handler can serve the resource.
        </p>
      </motion.section>

      <motion.section {...fade(0.2)} className="mt-8">
        <H>Request lifecycle</H>
        <div className="overflow-hidden rounded-xl border border-white/10">
          {FLOW.map(([sig, desc], i) => (
            <div key={sig} className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${i % 2 ? "bg-white/[0.02]" : ""}`}>
              <code className="text-xs text-emerald-300">{sig}</code>
              <span className="text-xs text-emerald-100/60 sm:max-w-[55%] sm:text-right">{desc}</span>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section {...fade(0.26)} className="mt-8">
        <H>Hackathon setup</H>
        <ul className="space-y-2 text-sm text-emerald-100/70">
          {[
            "Start with the shipped consumer and fulfillment agents instead of rebuilding the payment boundary.",
            "Run the complete flow on Stellar testnet with npm run agents:testnet.",
            "Replace the sample catalog with your protected API, model, data source, or tool.",
            "Keep every payment on the agent.fetch() path and every delivery behind verified middleware.",
            "Show the transaction, remaining mandate budget, and contract rejection in the final demonstration.",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-0.5 text-emerald-400">✓</span> {t}
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.div {...fade(0.32)} className="mt-10 flex flex-wrap gap-3">
        <a href="https://github.com/reapp-protocol/reapp-protocol/tree/main/apps/consumer-agent" target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#06241a] hover:bg-emerald-300">Consumer agent ↗</a>
        <a href="https://github.com/reapp-protocol/reapp-protocol/tree/main/apps/fulfillment-agent" target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-emerald-100/80 hover:border-emerald-400/40">Fulfillment agent ↗</a>
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
