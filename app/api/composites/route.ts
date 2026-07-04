/**
 * Streams the composite-mandate group-buy demo as newline-delimited JSON.
 * The whole flow runs server-side against Stellar testnet with ephemeral
 * friendbot-funded keys; the run includes a live deadline auction, so the
 * stream stays open for roughly two minutes. A viewer disconnect tears the
 * generator down so an abandoned run stops consuming testnet transactions.
 */
import { humanizeError, runGroupBuy, type CompositeEvent } from "@/lib/composites-server";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  await req.json().catch(() => ({})); // body unused; keep the shared parse convention
  const t0 = Date.now();
  const enc = new TextEncoder();
  const it = runGroupBuy();
  // Stop the run when the viewer goes away: the current chain call settles,
  // but no new phase starts and nothing is enqueued on a dead stream.
  const teardown = () => void it.return(undefined).catch(() => {});
  req.signal.addEventListener("abort", teardown);

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const push = (ev: CompositeEvent) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
        } catch {
          closed = true; // stream canceled between events
        }
      };
      try {
        for await (const ev of it) {
          if (ev.type === "pool") log.chain("pool registered", { pool: ev.poolId.slice(0, 10) });
          else if (ev.type === "buyer_ready") log.step(`buyer ${ev.buyer + 1} committed`);
          else if (ev.type === "cleared") log.ok("pool cleared", { tx: ev.hash.slice(0, 10), xlm: ev.totalXlm });
          else if (ev.type === "error") log.err("composites error", { reason: ev.message.slice(0, 80) });
          else if (ev.type === "done") log.ok("group-buy run complete", { ms: Date.now() - t0 });
          push(ev);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        log.err("composites stream crashed", { reason: msg.slice(0, 80) });
        push({ type: "error", message: humanizeError(msg) });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      teardown();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}
