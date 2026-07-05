import Link from "next/link";

export const metadata = { title: "Toolkit preview · REAPP" };

export default function T2Page() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <h1 className="text-2xl font-semibold text-white">Developer toolkit · preview</h1>
      <p className="mt-2 leading-relaxed text-emerald-50/80">
        Work in progress, kept separate from the main demos while it stabilizes. Everything new is collected here, on
        the live testnet contracts.
      </p>

      <div className="mt-6 grid gap-4">
        <Link
          href="/t2/demo"
          className="rounded-xl border border-emerald-400/15 bg-black/30 p-5 transition hover:border-emerald-400/40"
        >
          <div className="text-lg font-semibold text-emerald-100">CLI demo · research agent</div>
          <p className="mt-1 text-sm text-emerald-50/70">
            Run the reapp CLI&apos;s research-agent flow live on testnet: the agent buys sources on-chain until the
            contract caps the budget. No LLM key required.
          </p>
        </Link>
        <Link
          href="/composites"
          className="rounded-xl border border-emerald-400/15 bg-black/30 p-5 transition hover:border-emerald-400/40"
        >
          <div className="text-lg font-semibold text-emerald-100">Composite mandates · clearing pools</div>
          <p className="mt-1 text-sm text-emerald-50/70">
            Three buyer agents pool one group buy; the contract clears everyone at one uniform price in a single
            atomic transaction. Runs on the T2 composite build of MandateRegistry, a separate testnet deployment.
          </p>
        </Link>
      </div>
    </main>
  );
}
