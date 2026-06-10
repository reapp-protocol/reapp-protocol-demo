import { runResearch, type ResearchEvent, type RunArgs } from "@/lib/research-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Streams the research run as newline-delimited JSON (one ResearchEvent per line)
 *  so the UI can render each on-chain purchase as it happens. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<RunArgs>;

  const enc = new TextEncoder();
  const line = (ev: ResearchEvent) => enc.encode(JSON.stringify(ev) + "\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      line({ type: "error", message: "ANTHROPIC_API_KEY is not set on the server — add it to .env.local (and Vercel) to run the agent." }),
      { headers: { "content-type": "application/x-ndjson; charset=utf-8" } },
    );
  }
  if (!body.question || !body.inputs || !body.agentSecret) {
    return new Response(line({ type: "error", message: "Missing question, mandate inputs, or agent key." }), {
      status: 400,
      headers: { "content-type": "application/x-ndjson; charset=utf-8" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of runResearch(body as RunArgs)) controller.enqueue(line(ev));
      } catch (e) {
        controller.enqueue(line({ type: "error", message: e instanceof Error ? e.message : String(e) }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
    },
  });
}
