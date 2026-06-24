/**
 * Next.js instrumentation: runs once on server boot. Prints a clean one-line
 * brand header + a verbose, single-line boot diagnostics feed. Single lines are
 * line-reorder-proof in Railway's log viewer. Node runtime only.
 */
import { banner } from "./lib/banner";
import { log } from "./lib/log";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  let contract = "…";
  let rpc = "…";
  let explorer = "…";
  let price = "1.00";
  let budget = "3.00";
  try {
    const s = await import("@reapp-sdk/stellar");
    contract = s.TESTNET.mandateRegistryId;
    rpc = s.TESTNET.rpcUrl;
  } catch {
    /* SDK unavailable at boot */
  }
  try {
    explorer = (await import("./lib/explorer")).EXPLORER_BASE;
  } catch {
    /* ignore */
  }
  try {
    const r = await import("./lib/reapp-server");
    price = r.UNLOCK_PRICE;
    budget = r.BUDGET;
  } catch {
    /* ignore */
  }

  const short = (v: string) => (v.length > 14 ? `${v.slice(0, 6)}…${v.slice(-4)}` : v);
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN ?? `localhost:${process.env.PORT ?? 3000}`;
  const ai = process.env.ANTHROPIC_API_KEY ? "enabled" : "disabled (no LLM API key)";

  // Deferred so the boot feed lands in a quiet window after Next's own logs.
  setTimeout(() => {
    process.stdout.write("\n" + banner() + "\n\n");
    log.info("boot", { env: process.env.NODE_ENV ?? "production", node: process.version, domain });
    log.info("network", { chain: "stellar-testnet", rpc: rpc.replace(/^https?:\/\//, "") });
    log.chain("registry", { contract: short(contract), explorer: explorer.replace(/^https?:\/\//, "") });
    log.info("pricing", { unlock: `${price} XLM`, budget: `${budget} XLM` });
    log.info("research", { agent: ai });
    log.ok("online, serving requests");
  }, 900);
}
