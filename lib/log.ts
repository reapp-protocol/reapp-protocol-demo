/**
 * Server-side colored logger + boot banner. ANSI only (no deps); Railway's log
 * viewer renders the colors. Used by instrumentation.ts (boot) and the API
 * routes (per-action logs). Keep this server-only.
 */

const E = "\x1b[";
const wrap = (open: string, s: string, close = "39") => `${E}${open}m${s}${E}${close}m`;

export const c = {
  reset: `${E}0m`,
  bold: (s: string) => `${E}1m${s}${E}22m`,
  dim: (s: string) => `${E}2m${s}${E}22m`,
  // 256-color brand palette
  mint: (s: string) => wrap("38;5;121", s),
  emerald: (s: string) => wrap("38;5;48", s),
  green: (s: string) => wrap("38;5;42", s),
  teal: (s: string) => wrap("38;5;43", s),
  cyan: (s: string) => wrap("38;5;51", s),
  deep: (s: string) => wrap("38;5;30", s),
  gray: (s: string) => wrap("38;5;245", s),
  white: (s: string) => wrap("38;5;231", s),
  amber: (s: string) => wrap("38;5;215", s),
  red: (s: string) => wrap("38;5;203", s),
  // on-black emerald block (for the banner fill)
};

// "ANSI Shadow" REAPP, painted as a top-to-bottom emerald->teal gradient.
const ART = [
  "██████╗ ███████╗ █████╗ ██████╗ ██████╗ ",
  "██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔══██╗",
  "██████╔╝█████╗  ███████║██████╔╝██████╔╝",
  "██╔══██╗██╔══╝  ██╔══██║██╔═══╝ ██╔═══╝ ",
  "██║  ██║███████╗██║  ██║██║     ██║     ",
  "╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝     ",
];
const GRAD = [c.mint, c.emerald, c.green, c.teal, c.teal, c.deep];

export function banner(): string {
  const art = ART.map((line, i) => "  " + GRAD[i](line)).join("\n");
  const sub =
    "  " +
    c.dim("agent payments ") +
    c.emerald("·") +
    c.dim(" enforced on-chain ") +
    c.emerald("·") +
    c.dim(" stellar testnet");
  return "\n" + art + "\n" + sub + "\n";
}

const W = 60; // inner box width

function row(label: string, value: string): string {
  const pad = Math.max(1, W - 2 - label.length - stripLen(value));
  return c.deep("│ ") + c.gray(label) + " ".repeat(pad) + value + c.deep(" │");
}
// length of a string ignoring ANSI escapes (for padding math)
function stripLen(s: string): number {
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

/** A bordered diagnostics panel. rows = [label, coloredValue][]. */
export function panel(title: string, rows: [string, string][]): string {
  const top = c.deep("┌─ ") + c.bold(c.emerald(title)) + c.deep(" " + "─".repeat(Math.max(1, W - 3 - stripLen(title))) + "┐");
  const body = rows.map(([l, v]) => row(l, v)).join("\n");
  const bot = c.deep("└" + "─".repeat(W) + "┘");
  return top + "\n" + body + "\n" + bot;
}

const ts = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

type Tag = "INFO" | "OK" | "CHAIN" | "WARN" | "ERR" | "STEP";
const TAGS: Record<Tag, (s: string) => string> = {
  INFO: c.cyan,
  OK: c.green,
  CHAIN: c.emerald,
  WARN: c.amber,
  ERR: c.red,
  STEP: c.gray,
};

function line(tag: Tag, msg: string, extra?: Record<string, unknown>) {
  const tail = extra
    ? " " +
      Object.entries(extra)
        .map(([k, v]) => c.gray(k + "=") + c.white(String(v)))
        .join(" ")
    : "";
  // eslint-disable-next-line no-console
  console.log(`${c.dim(ts())} ${c.emerald("⬢")} ${c.bold(TAGS[tag](tag.padEnd(5)))} ${msg}${tail}`);
}

/** The verbose request/action logger used across the API routes. */
export const log = {
  info: (m: string, x?: Record<string, unknown>) => line("INFO", m, x),
  ok: (m: string, x?: Record<string, unknown>) => line("OK", m, x),
  chain: (m: string, x?: Record<string, unknown>) => line("CHAIN", m, x),
  warn: (m: string, x?: Record<string, unknown>) => line("WARN", m, x),
  err: (m: string, x?: Record<string, unknown>) => line("ERR", m, x),
  step: (m: string, x?: Record<string, unknown>) => line("STEP", m, x),
};
