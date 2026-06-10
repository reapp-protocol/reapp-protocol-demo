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
type Video = { id: string; title: string; channel: string; src: string; poster: string };

const CDN = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";
const FEED: Video[] = [
  { id: "a", title: "Big Buck Bunny", channel: "Blender Foundation", src: `${CDN}/BigBuckBunny.mp4`, poster: `${CDN}/images/BigBuckBunny.jpg` },
  { id: "b", title: "Elephants Dream", channel: "Orange Open Movie", src: `${CDN}/ElephantsDream.mp4`, poster: `${CDN}/images/ElephantsDream.jpg` },
  { id: "c", title: "For Bigger Blazes", channel: "Google", src: `${CDN}/ForBiggerBlazes.mp4`, poster: `${CDN}/images/ForBiggerBlazes.jpg` },
  { id: "d", title: "Sintel", channel: "Durian Open Movie", src: `${CDN}/Sintel.mp4`, poster: `${CDN}/images/Sintel.jpg` },
  { id: "e", title: "Tears of Steel", channel: "Mango Open Movie", src: `${CDN}/TearsOfSteel.mp4`, poster: `${CDN}/images/TearsOfSteel.jpg` },
];

const PRICE = 1; // XLM per video
const BUDGET = 3; // mandate cap (XLM)

export default function Page() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [mandateId, setMandateId] = useState<string>("");
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [blocked, setBlocked] = useState<Record<string, string>>({});
  const [spent, setSpent] = useState(0);
  const [bal, setBal] = useState<{ user: number; merchant: number } | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const api = async (action: string, extra: Record<string, unknown> = {}) =>
    (await fetch("/api/reapp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...extra }) })).json();
  const short = (s: string) => (s ? `${s.slice(0, 5)}…${s.slice(-4)}` : "");
  const tx = (h: string) => `${wallet?.explorer ?? "https://testnet.stellarchain.io"}/tx/${h}`;

  async function createWallet() {
    setBusy("Creating + funding testnet accounts…"); setErr("");
    try {
      const w: Wallet = await api("init");
      if ((w as { error?: string }).error) throw new Error((w as { error?: string }).error);
      setWallet(w);
      setBal(await api("balances", { userPublic: w.userPublic, merchantPublic: w.merchantPublic }));
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  async function authorize() {
    if (!wallet) return;
    setBusy("Registering mandate + granting allowance (you sign)…"); setErr("");
    try {
      const r = await api("setup", { userSecret: wallet.userSecret, agentPublic: wallet.agentPublic, merchantPublic: wallet.merchantPublic });
      if (r.error) throw new Error(r.error);
      setInputs(r.inputs); setMandateId(r.mandateId);
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  async function play(v: Video) {
    if (!wallet || !inputs) return;
    setBusy(`Agent paying ${PRICE} XLM to unlock “${v.title}”…`); setErr("");
    try {
      const r = await api("pay", { inputs, agentSecret: wallet.agentSecret });
      if (r.error) setBlocked((b) => ({ ...b, [v.id]: r.error }));
      else {
        setUnlocked((u) => ({ ...u, [v.id]: r.hash }));
        setSpent((s) => s + PRICE);
        setBal(await api("balances", { userPublic: wallet.userPublic, merchantPublic: wallet.merchantPublic }));
      }
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  async function revoke() {
    if (!wallet || !inputs) return;
    setBusy("Revoking the mandate (you sign)…"); setErr("");
    try {
      const r = await api("revoke", { inputs, userSecret: wallet.userSecret });
      if (r.error) throw new Error(r.error);
      setRevoked(true);
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  const pct = Math.min(100, (spent / BUDGET) * 100);
  const reason = (e: string) => (e.includes("#5") ? "mandate revoked" : e.includes("#6") ? "budget exceeded" : "rejected on-chain");

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="mb-8">
        <div className="text-xs font-semibold tracking-widest text-emerald-400/80">REAPP · STELLAR TESTNET · NO MOCKS</div>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Premium video, paid by your agent — leashed on-chain.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-emerald-100/70">
          Give an AI agent a <b>{BUDGET} XLM</b> budget and let it pay-per-play. Each unlock is a real Stellar payment;
          the <b>MandateRegistry</b> contract enforces the cap. After {BUDGET} videos the contract <b>blocks</b> the next
          payment — and you can <b>revoke</b> anytime. Built on <code className="rounded bg-black/30 px-1">@reapp-sdk/core</code>.
        </p>
      </header>

      {busy && <div className="mb-4 animate-pulse rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{busy}</div>}
      {err && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{err}</div>}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {!wallet ? (
          <button onClick={createWallet} disabled={!!busy} className="btn">1 · Create + fund wallet</button>
        ) : !mandateId ? (
          <button onClick={authorize} disabled={!!busy} className="btn">2 · Authorize agent ({BUDGET} XLM)</button>
        ) : (
          <button onClick={revoke} disabled={revoked || !!busy} className="btn-ghost">{revoked ? "Mandate revoked ✓" : "Revoke mandate"}</button>
        )}
        {wallet && (
          <div className="flex items-center gap-4 text-xs text-emerald-100/70">
            <span>agent <code>{short(wallet.agentPublic)}</code></span>
            <a className="text-emerald-400 underline" href={`${wallet.explorer}/contracts/${wallet.contractId}`} target="_blank" rel="noreferrer">contract</a>
            {bal && <span>creator earned <b className="text-emerald-300">{(bal.merchant - 10000).toFixed(0)} XLM</b></span>}
          </div>
        )}
      </div>

      {mandateId && (
        <div className="mb-6">
          <div className="h-2 w-full max-w-md overflow-hidden rounded bg-black/40">
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-emerald-100/60">{spent} / {BUDGET} XLM spent · mandate <code>{short(mandateId)}</code></div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEED.map((v) => {
          const hash = unlocked[v.id];
          const block = blocked[v.id];
          const locked = !hash;
          return (
            <div key={v.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
              <div className="relative aspect-video bg-black">
                {hash ? (
                  <video className="h-full w-full" src={v.src} poster={v.poster} controls autoPlay muted />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.poster} alt={v.title} className="h-full w-full object-cover opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {block ? (
                        <div className="text-center">
                          <div className="text-2xl">⛔</div>
                          <div className="mt-1 text-xs font-semibold text-red-300">blocked: {reason(block)}</div>
                        </div>
                      ) : (
                        <button onClick={() => play(v)} disabled={!mandateId || !!busy} className="btn-sm">▶ Unlock · {PRICE} XLM</button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="p-3">
                <div className="font-semibold">{v.title}</div>
                <div className="text-xs text-emerald-100/60">{v.channel}</div>
                {hash && <a href={tx(hash)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-emerald-400 underline">paid ✓ {short(hash)}</a>}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="mt-10 text-center text-xs text-emerald-100/40">
        Real Stellar testnet · payments route through <code>MandateRegistry.execute_payment</code> · the SDK is untrusted, the contract is the source of truth.
      </footer>

      <style>{`
        .btn{background:#34d399;color:#06241a;font-weight:600;padding:.55rem 1rem;border-radius:.6rem;font-size:.875rem}
        .btn:disabled{opacity:.4;cursor:not-allowed}
        .btn-ghost{border:1px solid #ef444455;color:#fca5a5;font-weight:600;padding:.5rem 1rem;border-radius:.6rem;font-size:.875rem}
        .btn-ghost:disabled{opacity:.5;cursor:not-allowed}
        .btn-sm{background:#34d399;color:#06241a;font-weight:700;padding:.5rem .9rem;border-radius:.6rem;font-size:.8rem}
        .btn-sm:disabled{opacity:.4;cursor:not-allowed}
      `}</style>
    </main>
  );
}
