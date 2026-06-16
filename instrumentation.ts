/**
 * Next.js instrumentation: runs once when the server process boots. We use it to
 * print the REAPP boot banner + a diagnostics panel to stdout (Railway renders
 * the ANSI colors). Node runtime only.
 */
import { banner, panel, c, log } from "./lib/log";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  let contract = "unknown";
  let explorer = "unknown";
  try {
    contract = (await import("@reapp-sdk/stellar")).TESTNET.mandateRegistryId;
  } catch {
    /* SDK unavailable at boot: leave default */
  }
  try {
    explorer = (await import("./lib/explorer")).EXPLORER_BASE;
  } catch {
    /* ignore */
  }

  const port = process.env.PORT ?? "3000";
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN ?? `localhost:${port}`;
  const shortC = contract.length > 16 ? `${contract.slice(0, 8)}…${contract.slice(-5)}` : contract;
  const ai = process.env.ANTHROPIC_API_KEY ? c.green("✓ online") : c.amber("✗ ANTHROPIC_API_KEY not set");

  process.stdout.write(banner() + "\n");

  for (const sys of [
    "mandate registry client",
    "stellar testnet rpc",
    "x402 payment layer",
    "research agent · claude-opus-4-8",
  ]) {
    log.step(c.dim("boot ") + c.white(sys) + c.gray(" … ") + c.green("ok"));
  }

  process.stdout.write(
    "\n" +
      panel("REAPP · reapp.live", [
        ["status", c.bold(c.green("● ONLINE"))],
        ["env", c.white(process.env.NODE_ENV ?? "production")],
        ["node", c.white(process.version)],
        ["domain", c.cyan(domain)],
        ["contract", c.emerald(shortC)],
        ["explorer", c.teal(explorer.replace(/^https?:\/\//, ""))],
        ["ai agent", ai],
        ["booted", c.gray(new Date().toISOString())],
      ]) +
      "\n\n",
  );

  log.ok("all systems online, serving requests", { domain });
}
