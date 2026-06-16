/**
 * Next.js instrumentation: runs once when the server boots. Prints the REAPP
 * banner + a single compact status line as ONE atomic stdout write, so it stays
 * contiguous in the log stream instead of interleaving with Next's boot output.
 * Node runtime only.
 */
import { banner } from "./lib/banner";
import { c } from "./lib/log";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  let contract = "…";
  let explorer = "…";
  try {
    contract = (await import("@reapp-sdk/stellar")).TESTNET.mandateRegistryId;
  } catch {
    /* SDK unavailable at boot */
  }
  try {
    explorer = (await import("./lib/explorer")).EXPLORER_BASE;
  } catch {
    /* ignore */
  }

  const shortC = contract.length > 14 ? `${contract.slice(0, 6)}…${contract.slice(-4)}` : contract;
  const dot = c.dim("  ·  ");
  const status =
    "  " +
    c.bold(c.green("● online")) +
    dot +
    c.gray("contract ") +
    c.emerald(shortC) +
    dot +
    c.teal(explorer.replace(/^https?:\/\//, "")) +
    dot +
    c.gray("ai ") +
    (process.env.ANTHROPIC_API_KEY ? c.green("✓") : c.amber("✗"));

  // Single write keeps the whole banner together in the log stream.
  process.stdout.write(banner() + status + "\n\n");
}
