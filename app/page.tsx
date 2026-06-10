"use client";

import { useState } from "react";

type Wallet = {
  userSecret: string;
  userPublic: string;
  agentSecret: string;
  agentPublic: string;
  merchantSecret: string;
  merchantPublic: string;
  contractId: string;
  explorer: string;
};
type Inputs = Record<string, unknown>;
type Item = { id: string; title: string; teaser: string; body: string };

const FEED: Item[] = [
  { id: "a", title: "The Agent Economy, Decoded", teaser: "Why autonomous payments rewrite commerce…", body: "Agents that pay on their own only work if spending is constrained below the agent. REAPP puts that constraint on-chain." },
  { id: "b", title: "Stellar × x402: A Field Guide", teaser: "402 challenges, signed auth entries, settlement…", body: "x402 is the wire; the mandate is the meaning. Decouple them and the protocol survives spec churn." },
  { id: "c", title: "Mandates as Cryptographic Leashes", teaser: "Scope, budget, expiry, replay — enforced…", body: "A mandate is a signed, scoped, time-bound grant. The contract is the leash the agent cannot slip." },
  { id: "d", title: "Designing Bypass-Proof SDKs", teaser: "Treat the SDK as untrusted infrastructure…", body: "If the SDK can be the reason a payment is authorized, you've already lost. The contract re-checks everything." },
  { id: "e", title: "Replay, Reentrancy, and Other Ghosts", teaser: "Why seq + checks-effects-interactions matter…", body: "A malicious token that reenters can't double-spend when state advances before the transfer." },
];

const PRICE = 1; // XLM per unlock
const BUDGET = 3; // mandate cap (XLM)

export default function Page() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [mandateId, setMandateId] = useState<string>("");
  const [unlocked, setUnlocked] = useState<Record<string, string>>({}); // id -> tx hash
  const [blocked, setBlocked] = useState<Record<string, string>>({}); // id -> reason
  const [spent, setSpent] = useState(0);
  const [bal, setBal] = useState<{ user: number; merchant: number } | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const api = async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/reapp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    return res.json();
  };
  const short = (s: string) => (s ? `${s.slice(0, 5)}…${s.slice(-4)}` : "");
  const tx = (h: string) => `${wallet?.explorer ?? "https://testnet.stellarchain.io"}/tx/${h}`;

  async function createWallet() {
    setBusy("Creating + funding testnet accounts…");
    setErr("");
    try {
      const w: Wallet = await api("init");
      if ((w as { error?: string }).error) throw new Error((w as { error?: string }).error);
      setWallet(w);
      const b = await api("balances", { userPublic: w.userPublic, merchantPublic: w.merchantPublic });
      setBal(b);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy("");
    }
  }

  async function authorize() {
    if (!wallet) return;
    setBusy("Registering mandate + granting allowance (you sign)…");
    setErr("");
    try {
      const r = await api("setup", {
        userSecret: wallet.userSecret,
        agentPublic: wallet.agentPublic,
        merchantPublic: wallet.merchantPublic,
      });
      if (r.error) throw new Error(r.error);
      setInputs(r.inputs);
      setMandateId(r.mandateId);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy("");
    }
  }

  async function unlock(item: Item) {
    if (!wallet || !inputs) return;
    setBusy(`Agent paying ${PRICE} XLM to unlock “${item.title}”…`);
    setErr("");
    try {
      const r = await api("pay", { inputs, agentSecret: wallet.agentSecret });
      if (r.error) {
        setBlocked((b) => ({ ...b, [item.id]: r.error }));
      } else {
        setUnlocked((u) => ({ ...u, [item.id]: r.hash }));
        setSpent((s) => s + PRICE);
        const b = await api("balances", { userPublic: wallet.userPublic, merchantPublic: wallet.merchantPublic });
        setBal(b);
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy("");
    }
  }

  async function revoke() {
    if (!wallet || !inputs) return;
    setBusy("Revoking the mandate (you sign)…");
    setErr("");
    try {
      const r = await api("revoke", { inputs, userSecret: wallet.userSecret });
      if (r.error) throw new Error(r.error);
      setRevoked(true);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy("");
    }
  }

  const pct = Math.min(100, (spent / BUDGET) * 100);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <div className="text-xs font-semibold tracking-widest text-emerald-400/80">REAPP · STELLAR TESTNET · NO MOCKS</div>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">An AI agent that pays — but only within the leash.</h1>
        <p className="mt-3 text-sm leading-relaxed text-emerald-100/70">
          Your agent unlocks premium content by paying per item. You set a <b>{BUDGET} XLM</b> budget; the{" "}
          <b>MandateRegistry</b> Soroban contract enforces it on-chain. Watch real payments move — then watch the
          contract <b>block</b> the agent when it overspends or after you revoke. Powered by{" "}
          <code className="rounded bg-black/30 px-1">@reapp-sdk/core</code>.
        </p>
      </header>

      {busy && (
        <div className="mb-4 animate-pulse rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {busy}
        </div>
      )}
      {err && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{err}</div>
      )}

      {/* Step 1 — wallet */}
      <Card n={1} title="Create a demo wallet">
        {!wallet ? (
          <button onClick={createWallet} disabled={!!busy} className="btn">Create + fund testnet wallet</button>
        ) : (
          <div className="space-y-1 text-sm">
            <Row label="You (funds)" value={short(wallet.userPublic)} extra={bal ? `${bal.user.toFixed(2)} XLM` : ""} />
            <Row label="Agent (spender)" value={short(wallet.agentPublic)} />
            <Row label="Creator (paid)" value={short(wallet.merchantPublic)} extra={bal ? `${bal.merchant.toFixed(2)} XLM` : ""} />
            <Row label="Contract" value={short(wallet.contractId)} link={`${wallet.explorer}/contracts/${wallet.contractId}`} />
          </div>
        )}
      </Card>

      {/* Step 2 — authorize */}
      <Card n={2} title={`Authorize the agent — ${BUDGET} XLM budget`} dim={!wallet}>
        {!mandateId ? (
          <button onClick={authorize} disabled={!wallet || !!busy} className="btn">Sign mandate + grant allowance</button>
        ) : (
          <div className="text-sm">
            <div className="mb-2 text-emerald-200/80">Mandate <code className="text-xs">{short(mandateId)}</code> active — agent may spend ≤ {BUDGET} XLM at the creator.</div>
            <div className="h-2 w-full overflow-hidden rounded bg-black/40">
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 text-xs text-emerald-100/60">{spent} / {BUDGET} XLM spent</div>
          </div>
        )}
      </Card>

      {/* Step 3 — feed */}
      <Card n={3} title="Premium feed — agent pays per unlock" dim={!mandateId}>
        <div className="space-y-3">
          {FEED.map((item) => {
            const tx0 = unlocked[item.id];
            const block = blocked[item.id];
            return (
              <div key={item.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{item.title}</div>
                  {tx0 ? (
                    <a href={tx(tx0)} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 underline">paid ✓ {short(tx0)}</a>
                  ) : block ? (
                    <span className="text-xs font-semibold text-red-400">✖ blocked on-chain</span>
                  ) : (
                    <button onClick={() => unlock(item)} disabled={!mandateId || !!busy} className="btn-sm">Unlock · {PRICE} XLM</button>
                  )}
                </div>
                <div className="mt-1 text-sm text-emerald-100/70">{tx0 ? item.body : item.teaser}</div>
                {block && <div className="mt-1 text-xs text-red-300/80">Contract refused: {block.includes("#5") ? "mandate revoked" : block.includes("#6") ? "budget exceeded" : block}</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Step 4 — revoke */}
      <Card n={4} title="Pull the leash" dim={!mandateId}>
        <p className="mb-3 text-sm text-emerald-100/70">Change your mind? Revoke the mandate. The agent's next payment is rejected by the contract — instantly, on-chain.</p>
        <button onClick={revoke} disabled={!mandateId || revoked || !!busy} className="btn">
          {revoked ? "Mandate revoked ✓" : "Revoke mandate"}
        </button>
      </Card>

      <footer className="mt-10 text-center text-xs text-emerald-100/40">
        Real Stellar testnet · funds move through <code>MandateRegistry.execute_payment</code> · the SDK is untrusted, the contract is the source of truth.
      </footer>

      <style>{`
        .btn { background:#34d399; color:#06241a; font-weight:600; padding:.55rem 1rem; border-radius:.6rem; font-size:.875rem; }
        .btn:disabled { opacity:.4; cursor:not-allowed; }
        .btn-sm { background:#34d399; color:#06241a; font-weight:600; padding:.3rem .7rem; border-radius:.5rem; font-size:.8rem; white-space:nowrap; }
        .btn-sm:disabled { opacity:.4; cursor:not-allowed; }
      `}</style>
    </main>
  );
}

function Card({ n, title, children, dim }: { n: number; title: string; children: React.ReactNode; dim?: boolean }) {
  return (
    <section className={`mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-5 ${dim ? "opacity-50" : ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-[#06241a]">{n}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, extra, link }: { label: string; value: string; extra?: string; link?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-1 last:border-0">
      <span className="text-emerald-100/60">{label}</span>
      <span className="flex items-center gap-2 font-mono text-xs">
        {link ? <a href={link} target="_blank" rel="noreferrer" className="text-emerald-400 underline">{value}</a> : value}
        {extra && <span className="rounded bg-black/30 px-1.5 py-0.5 text-emerald-300">{extra}</span>}
      </span>
    </div>
  );
}
