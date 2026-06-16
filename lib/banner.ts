/**
 * REAPP boot banner. Deliberately ONE clean line: a line-based log viewer
 * (Railway) cannot split or reorder a single line, so it always renders sharp.
 * Change the wordmark/tagline here. (The big dollar-sign figlet banner lives in
 * git history at commit fd3fd63 if you ever want it on a viewer that keeps
 * multi-line output intact.)
 */
import { c } from "./log";

export function banner(): string {
  return (
    "  " +
    c.bold(c.emerald("⬢ REAPP")) +
    c.dim("  ·  ") +
    c.gray("agent payments, enforced on-chain") +
    c.dim("  ·  ") +
    c.teal("Stellar testnet")
  );
}
