"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { accountUrl, contractUrl } from "@/lib/explorer";

const CONTRACT = "CB4KOTLGMM5JEPFPU6QBJLADIBP3RSGUX44FOYTFRICNXKKFPYIW7ZOA";
const short = (s: string) => (s ? `${s.slice(0, 6)}…${s.slice(-4)}` : "");

type Line =
  | { kind: "status"; id: number; text: string }
  | { kind: "funded"; id: number; user: string; agent: string; merchant: string }
  | { kind: "mandate"; id: number; mandateId: string; budget: string }
  | {
      kind: "buy";
      id: number;
      source: string;
      icon: string;
      price: string;
      status: "pending" | "ok" | "blocked";
      hash?: string;
      url?: string;
      reason?: string;
    };

export default function T2DemoPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ purchased: number; budget: string } | null>(null);
  const [err, setErr] = useState("");
  const id = useRef(0);

  function patchLastBuy(source: string, patch: Partial<Line>) {
    setLines((xs) => {
      for (let i = xs.length - 1; i >= 0; i -= 1) {
        const l = xs[i];
        if (l.kind === "buy" && l.source === source) {
          const next = [...xs];
          next[i] = { ...l, ...patch } as Line;
          return next;
        }
      }
      return xs;
    });
  }

  async function run() {
    setLines([]);
    setDone(null);
    setErr("");
    setRunning(true);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const s = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (s) handle(JSON.parse(s));
        }
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setRunning(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handle(ev: any) {
    switch (ev.type) {
      case "status":
        setLines((xs) => [...xs, { kind: "status", id: id.current++, text: ev.text }]);
        break;
      case "funded":
        setLines((xs) => [...xs, { kind: "funded", id: id.current++, user: ev.user, agent: ev.agent, merchant: ev.merchant }]);
        break;
      case "mandate":
        setLines((xs) => [...xs, { kind: "mandate", id: id.current++, mandateId: ev.id, budget: ev.budget }]);
        break;
      case "buy_attempt":
        setLines((xs) => [...xs, { kind: "buy", id: id.current++, source: ev.source, icon: ev.icon, price: ev.price, status: "pending" }]);
        break;
      case "buy_ok":
        patchLastBuy(ev.source, { status: "ok", hash: ev.hash, url: ev.url });
        break;
      case "buy_blocked":
        patchLastBuy(ev.source, { status: "blocked", reason: ev.reason });
        break;
      case "result":
        setDone({ purchased: ev.purchased, budget: ev.budget });
        break;
      case "error":
        setErr(ev.message);
        break;
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/t2" className="text-sm text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
        ← Tranche 2
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-white">CLI demo · research agent</h1>
      <p className="mt-2 leading-relaxed text-emerald-50/80">
        The same flow as <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[13px] text-emerald-100">npx reapp-protocol-cli demo research-agent</code>, run live on
        Stellar testnet. Three ephemeral accounts are funded, a mandate with a{" "}
        <span className="text-emerald-200">3 XLM</span> budget is registered, and the agent buys research sources one at a
        time. Each purchase is a real on-chain <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[13px] text-emerald-100">execute_payment</code>; the contract
        caps spending at the budget and rejects the rest. No LLM key is required to run it.
      </p>
      <p className="mt-2 text-sm text-emerald-50/60">
        Enforced by the MandateRegistry contract{" "}
        <a className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300" href={contractUrl(CONTRACT)} target="_blank" rel="noreferrer">
          {short(CONTRACT)}
        </a>
        . A run takes roughly 30–60 seconds.
      </p>

      <button
        onClick={run}
        disabled={running}
        className="mt-6 rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {running ? "Running on testnet…" : "Run the demo"}
      </button>

      {(lines.length > 0 || err) && (
        <div className="mt-6 overflow-hidden rounded-xl border border-emerald-400/15 bg-black/40 font-mono text-[13px]">
          <div className="border-b border-emerald-400/10 px-4 py-2 text-emerald-300/70">reapp · testnet</div>
          <div className="space-y-1.5 px-4 py-3">
            {lines.map((l) => {
              if (l.kind === "status")
                return (
                  <div key={l.id} className="text-emerald-50/70">
                    <span className="text-emerald-400/70">›</span> {l.text}
                  </div>
                );
              if (l.kind === "funded")
                return (
                  <div key={l.id} className="text-emerald-200">
                    ✓ funded 3 accounts ·{" "}
                    <a className="underline underline-offset-2 hover:text-emerald-300" href={accountUrl(l.user)} target="_blank" rel="noreferrer">
                      user {short(l.user)}
                    </a>{" "}
                    ·{" "}
                    <a className="underline underline-offset-2 hover:text-emerald-300" href={accountUrl(l.agent)} target="_blank" rel="noreferrer">
                      agent {short(l.agent)}
                    </a>
                  </div>
                );
              if (l.kind === "mandate")
                return (
                  <div key={l.id} className="text-emerald-200">
                    ✓ mandate registered · budget {l.budget} XLM · id {short(l.mandateId)}
                  </div>
                );
              // buy
              return (
                <div key={l.id} className={l.status === "blocked" ? "text-amber-300" : l.status === "ok" ? "text-emerald-100" : "text-emerald-50/60"}>
                  {l.status === "pending" && <span className="text-emerald-400/70">…</span>}
                  {l.status === "ok" && <span className="text-emerald-400">✓</span>}
                  {l.status === "blocked" && <span className="text-amber-400">✗</span>}{" "}
                  {l.icon} agent buys {l.source} · {l.price} XLM
                  {l.status === "ok" && l.url && (
                    <>
                      {" "}
                      —{" "}
                      <a className="underline underline-offset-2 hover:text-emerald-300" href={l.url} target="_blank" rel="noreferrer">
                        tx {short(l.hash ?? "")}
                      </a>
                    </>
                  )}
                  {l.status === "blocked" && <> — blocked by contract ({l.reason})</>}
                </div>
              );
            })}
            {err && <div className="text-red-300">error: {err}</div>}
          </div>
          {done && (
            <div className="border-t border-emerald-400/10 px-4 py-3 text-emerald-100">
              Purchased <span className="font-semibold text-white">{done.purchased} sources</span> for{" "}
              <span className="font-semibold text-white">{done.purchased}.00 XLM</span>; the contract enforced the{" "}
              <span className="font-semibold text-white">{done.budget} XLM</span> cap. A compromised agent or SDK cannot exceed the mandate.
            </div>
          )}
        </div>
      )}
    </main>
  );
}
