import { runCliDemo, type DemoEvent } from "@/lib/cli-demo";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Streams the CLI research-agent demo as newline-delimited JSON (one DemoEvent
 *  per line) so the page can render each on-chain purchase as it happens. No LLM
 *  key required — the flow is pure on-chain budget enforcement. */
export async function POST() {
  const enc = new TextEncoder();
  const line = (ev: DemoEvent) => enc.encode(JSON.stringify(ev) + "\n");
  const t0 = Date.now();
  log.info("POST /api/demo — research-agent demo run");

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runCliDemo()) {
          if (ev.type === "buy_ok") log.chain(`demo paid 1 XLM · ${ev.source}`, { tx: ev.hash.slice(0, 10) });
          else if (ev.type === "buy_blocked") log.warn(`demo blocked · ${ev.source}`);
          controller.enqueue(line(ev));
        }
        log.ok("demo run complete", { ms: Date.now() - t0 });
      } catch (e) {
        controller.enqueue(line({ type: "error", message: e instanceof Error ? e.message : String(e) }));
        log.err("demo run failed", { reason: e instanceof Error ? e.message : String(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8" } });
}
