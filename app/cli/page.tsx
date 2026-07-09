"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Package, Play, ShieldCheck, Terminal } from "lucide-react";
import "@xterm/xterm/css/xterm.css";

const PACKAGE = "reapp-protocol-cli";
const VERSION = "0.1.0";
const COMMAND = "reapp";
const CONTRACT = "CBALARHTO5D7JLWHZ5KST4QNIRC64JI5H3DQDHMIUBSRLLOVS6FCWOQX";

const INSTALL = `npx reapp-protocol-cli demo research-agent

npm install -g reapp-protocol-cli
reapp --help`;

const PROJECT_FLOW = `reapp init
reapp setup
reapp mandate create
reapp pay
reapp pay 10.00`;

const QUICK = [
  { label: "demo research-agent", cmd: "demo research-agent" },
  { label: "init", cmd: "init" },
  { label: "setup", cmd: "setup" },
  { label: "mandate create", cmd: "mandate create" },
  { label: "pay", cmd: "pay" },
];

const COMMANDS = [
  { name: "init", desc: "Writes a committable reapp.config.json with the live testnet contract id.", Icon: Package },
  { name: "setup", desc: "Creates user, agent, and merchant testnet accounts, then funds them.", Icon: CheckCircle2 },
  { name: "mandate create", desc: "Registers an AP2 mandate and approves the allowance to the contract.", Icon: ShieldCheck },
  { name: "pay", desc: "Makes an agent-signed payment through MandateRegistry.execute_payment.", Icon: Terminal },
  { name: "demo research-agent", desc: "Runs the complete budget-capped research-agent flow from a cold start.", Icon: Play },
];

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: d, ease: "easeOut" as const },
});

export default function CliPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const termRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fitRef = useRef<any>(null);
  const sessionRef = useRef<string>("");
  const [cmd, setCmd] = useState("demo research-agent");
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    sessionRef.current = (globalThis.crypto?.randomUUID?.() ?? `s${Date.now()}`).replace(/[^A-Za-z0-9-]/g, "");
    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
      if (disposed || !hostRef.current) return;
      const term = new Terminal({
        convertEol: true,
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        theme: { background: "#000000", foreground: "#d1fae5", cursor: "#34d399", selectionBackground: "#065f46" },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(hostRef.current);
      fit.fit();
      termRef.current = term;
      fitRef.current = fit;
      term.writeln(`\x1b[2m${PACKAGE}@${VERSION} · installed command: ${COMMAND} · pick a command below or type one, then Run.\x1b[0m`);
      term.writeln("\x1b[2mState (config, keys, mandate) persists across commands in this browser session.\x1b[0m\r\n");
      setReady(true);
      const onResize = () => fit.fit();
      window.addEventListener("resize", onResize);
      (term as unknown as { _onResize?: () => void })._onResize = onResize;
    })();
    return () => {
      disposed = true;
      const t = termRef.current;
      if (t?._onResize) window.removeEventListener("resize", t._onResize);
      t?.dispose?.();
    };
  }, []);

  async function run(command: string) {
    const term = termRef.current;
    if (!term || running) return;
    const args = command.trim().split(/\s+/).filter(Boolean);
    if (args.length === 0) return;
    setRunning(true);
    term.write(`\r\n\x1b[32m$\x1b[0m \x1b[1m${COMMAND} ${args.join(" ")}\x1b[0m\r\n`);
    try {
      const res = await fetch("/api/cli", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ args, sessionId: sessionRef.current }),
      });
      if (res.status === 400) {
        term.write("\x1b[31munknown command — try: demo research-agent · init · setup · mandate create · pay\x1b[0m\r\n");
        return;
      }
      if (!res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        term.write(dec.decode(value));
      }
    } catch (e) {
      term.write(`\r\n\x1b[31m[error ${String(e)}]\x1b[0m\r\n`);
    } finally {
      setRunning(false);
      fitRef.current?.fit?.();
    }
  }

  return (
    <main className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-5">
      <div className="glow" aria-hidden />

      <motion.header {...fade()} className="pt-5">
        <div className="inline-flex items-center gap-2 rounded-full glass px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-emerald-300/90">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          {PACKAGE}@{VERSION}
        </div>
        <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">
          Run the REAPP protocol from a terminal.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed text-emerald-100/70 sm:text-lg">
          The package is <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-sm text-emerald-100">{PACKAGE}</code>.
          The installed command is <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-sm text-emerald-100">{COMMAND}</code>.
          It scaffolds config, creates testnet actors, authorizes mandates, and makes agent-signed payments that the
          MandateRegistry contract enforces on-chain.
        </p>
      </motion.header>

      <motion.section {...fade(0.08)} className="mt-9 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <H>Install</H>
          <Code>{INSTALL}</Code>
        </div>
        <div>
          <H>Project Flow</H>
          <Code>{PROJECT_FLOW}</Code>
        </div>
      </motion.section>

      <motion.section {...fade(0.14)} className="mt-8">
          <H>Commands</H>
        <div className="grid gap-3 sm:grid-cols-2">
          {COMMANDS.map(({ name, desc, Icon }) => (
            <div key={name} className="rounded-xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-emerald-300" aria-hidden />
                <code className="text-sm text-emerald-300">reapp {name}</code>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-emerald-100/65">{desc}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section {...fade(0.2)} className="mt-9">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <H>Live Terminal</H>
            <p className="text-sm leading-relaxed text-emerald-100/60">
              This server runs the same bundled CLI against Stellar testnet. State persists per browser session, so
              <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-emerald-100">init</code>,
              <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-emerald-100">setup</code>,
              <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-emerald-100">mandate create</code>,
              and <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-emerald-100">pay</code> work as a sequence.
            </p>
          </div>
          <Link href="/t2/demo" className="text-sm text-emerald-400 underline underline-offset-2 hover:text-emerald-300">
            Focused terminal view
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.cmd}
              onClick={() => {
                setCmd(q.cmd);
                run(q.cmd);
              }}
              disabled={running || !ready}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 font-mono text-[12px] text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Terminal className="h-3.5 w-3.5" aria-hidden />
              {q.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(cmd);
          }}
          className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-black/50 px-3 py-2 font-mono text-sm"
        >
          <span className="text-emerald-400">{COMMAND}</span>
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            spellCheck={false}
            disabled={running}
            className="min-w-0 flex-1 bg-transparent text-emerald-50 placeholder:text-emerald-50/30 focus:outline-none"
            placeholder="demo research-agent"
          />
          <button
            type="submit"
            disabled={running || !ready}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-1.5 font-semibold text-black shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden />
            {running ? "Running..." : "Run"}
          </button>
        </form>

        <div className="mt-4 overflow-hidden rounded-xl border border-emerald-400/20 bg-black shadow-[0_0_44px_rgba(16,185,129,0.14)]">
          <div className="flex items-center gap-2 border-b border-emerald-400/10 px-4 py-2 font-mono text-[12px] text-emerald-300/70">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
            <span className="ml-2">reapp · testnet</span>
          </div>
          <div ref={hostRef} className="h-[460px] w-full px-3 py-2" />
        </div>

        <p className="mt-3 text-xs text-emerald-50/50">
          Enforced on-chain by the composite MandateRegistry contract{" "}
          <a className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300" href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT}`} target="_blank" rel="noreferrer">
            {CONTRACT.slice(0, 6)}...{CONTRACT.slice(-4)}
          </a>
          . A demo run takes roughly 30-60 seconds.
        </p>
      </motion.section>
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
