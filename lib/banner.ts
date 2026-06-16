/**
 * REAPP boot banner: figlet "ANSI Shadow" (clean block hacker font), trimmed and
 * painted as an emerald to teal gradient. Isolated here so it is easy to swap.
 */
import { c } from "./log";

const ART: string[] = [
  "██████╗ ███████╗ █████╗ ██████╗ ██████╗",
  "██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔══██╗",
  "██████╔╝█████╗  ███████║██████╔╝██████╔╝",
  "██╔══██╗██╔══╝  ██╔══██║██╔═══╝ ██╔═══╝",
  "██║  ██║███████╗██║  ██║██║     ██║",
  "╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝",
];

const GRAD = [c.mint, c.mint, c.emerald, c.emerald, c.teal, c.deep];

export function banner(): string {
  const art = ART.map((line, i) => "  " + (GRAD[i] ?? c.teal)(line)).join("\n");
  const tag =
    "  " +
    c.dim("agent payments") + c.emerald(" · ") +
    c.dim("enforced on-chain") + c.emerald(" · ") +
    c.dim("stellar testnet");
  return art + "\n" + tag;
}
