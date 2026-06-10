"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Wallet = {
  userSecret: string; userPublic: string;
  agentSecret: string; agentPublic: string;
  merchantSecret: string; merchantPublic: string;
  contractId: string; explorer: string;
};
type Inputs = Record<string, unknown>;
type Video = { id: string; title: string; channel: string; ytId: string };

const FEED: Video[] = [
  { id: "a", title: "Pumped Up Kicks", channel: "Foster The People", ytId: "SDTZ7iX4vTQ" },
  { id: "b", title: "A New Error", channel: "Moderat", ytId: "JWnX41TBFF4" },
  { id: "c", title: "Smells Like Teen Spirit", channel: "Nirvana", ytId: "hTWKbfoikeg" },
  { id: "d", title: "California Love", channel: "2Pac ft. Dr. Dre", ytId: "omfz62qu_Bc" },
  { id: "e", title: "Big Poppa", channel: "The Notorious B.I.G.", ytId: "phaJXp_zMYM" },
];

const PRICE = 1;
const BUDGET = 3;

export default function Page() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [mandateId, setMandateId] = useState("");
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
    setBusy("Registering mandate + granting allowance…"); setErr("");
    try {
      const r = await api("setup", { userSecret: wallet.userSecret, agentPublic: wallet.agentPublic, merchantPublic: wallet.merchantPublic });
      if (r.error) throw new Error(r.error);
      setInputs(r.inputs); setMandateId(r.mandateId);
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }
  async function playVideo(v: Video) {
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
    setBusy("Revoking the mandate…"); setErr("");
    try {
      const r = await api("revoke", { inputs, userSecret: wallet.userSecret });
      if (r.error) throw new Error(r.error);
      setRevoked(true);
    } catch (e) { setErr(String(e)); } finally { setBusy(""); }
  }

  const pct = Math.min(100, (spent / BUDGET) * 100);
  const reason = (e: string) => (e.includes("#5") ? "mandate revoked" : e.includes("#6") ? "budget exceeded" : "rejected on-chain");

  return (
    <main className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-5">
      <div className="glow" aria-hidden />

      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="mb-8">
        <div className="text-[11px] font-semibold tracking-widest text-emerald-400/80">REAPP · STELLAR TESTNET · NO MOCKS</div>
        <h1 className="mt-3 text-3xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
          Premium video, paid by your{" "}
          <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">AI agent</span>
          {" "}— leashed on-chain.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-emerald-100/70 sm:text-base">
          Give an agent a <b>{BUDGET} XLM</b> budget and let it pay-per-play. Every unlock is a real Stellar payment;
          the <b>MandateRegistry</b> contract enforces the cap. After {BUDGET} videos it <b>blocks</b> the next payment —
          and you can <b>revoke</b> anytime. Built on{" "}
          <code className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300">@reapp-sdk/core</code>.
        </p>
      </motion.header>

      <AnimatePresence>
        {busy && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" /> {busy}
          </motion.div>
        )}
      </AnimatePresence>
      {err && <div className="mb-4 break-words rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{err}</div>}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {!wallet ? (
          <Btn onClick={createWallet} disabled={!!busy}>1 · Create + fund wallet</Btn>
        ) : !mandateId ? (
          <Btn onClick={authorize} disabled={!!busy}>2 · Authorize agent ({BUDGET} XLM)</Btn>
        ) : (
          <Btn onClick={revoke} disabled={revoked || !!busy} ghost>{revoked ? "Mandate revoked ✓" : "Revoke mandate"}</Btn>
        )}
        {wallet && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-emerald-100/70">
            <span>agent <code className="text-emerald-300/80">{short(wallet.agentPublic)}</code></span>
            <a className="text-emerald-400 underline-offset-2 hover:underline" href={`${wallet.explorer}/contracts/${wallet.contractId}`} target="_blank" rel="noreferrer">view contract ↗</a>
            {bal && <span>creator earned <b className="text-emerald-300">{Math.max(0, bal.merchant - 10000).toFixed(0)} XLM</b></span>}
          </div>
        )}
      </div>

      <AnimatePresence>
        {mandateId && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
            <div className="h-2.5 w-full max-w-md overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300" animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
            </div>
            <div className="mt-1.5 text-xs text-emerald-100/60">{spent} / {BUDGET} XLM spent · mandate <code>{short(mandateId)}</code></div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
      >
        {FEED.map((v) => {
          const hash = unlocked[v.id];
          const block = blocked[v.id];
          return (
            <motion.div
              key={v.id}
              variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-lg shadow-black/30 transition-colors hover:border-emerald-400/30"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                {hash ? (
                  <iframe
                    className="h-full w-full"
                    src={`https://www.youtube.com/embed/${v.ytId}?autoplay=1&rel=0&modestbranding=1`}
                    title={v.title}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${v.ytId}/hqdefault.jpg`}
                      alt=""
                      className="h-full w-full object-cover opacity-55 transition duration-500 group-hover:scale-105 group-hover:opacity-70"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                      {block ? (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
                          <div className="text-3xl">⛔</div>
                          <div className="mt-1 text-xs font-semibold text-red-300">blocked · {reason(block)}</div>
                        </motion.div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.04 }}
                          onClick={() => playVideo(v)} disabled={!mandateId || !!busy}
                          className="flex items-center gap-2 rounded-full bg-emerald-400/95 px-4 py-2 text-sm font-bold text-[#06241a] shadow-lg shadow-emerald-500/30 disabled:opacity-40"
                        >
                          ▶ Unlock · {PRICE} XLM
                        </motion.button>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="p-3.5">
                <div className="truncate font-semibold">{v.title}</div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-emerald-100/55">
                  <span>{v.channel}</span>
                  {hash && <a href={tx(hash)} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">paid ✓</a>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <footer className="mt-12 text-center text-xs leading-relaxed text-emerald-100/40">
        Real Stellar testnet · payments route through <code>MandateRegistry.execute_payment</code> · the SDK is untrusted, the contract is the source of truth.
      </footer>
    </main>
  );
}

function Btn({ children, onClick, disabled, ghost }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; ghost?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }} whileHover={disabled ? {} : { scale: 1.03 }}
      onClick={onClick} disabled={disabled}
      className={
        ghost
          ? "rounded-xl border border-red-400/40 px-4 py-2.5 text-sm font-semibold text-red-300 disabled:opacity-50"
          : "rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2.5 text-sm font-semibold text-[#06241a] shadow-lg shadow-emerald-500/25 disabled:opacity-40"
      }
    >
      {children}
    </motion.button>
  );
}
