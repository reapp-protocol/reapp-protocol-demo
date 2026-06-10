import { NextResponse } from "next/server";
import * as srv from "@/lib/reapp-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    switch (body.action) {
      case "init":
        return NextResponse.json(await srv.init());
      case "setup":
        return NextResponse.json(await srv.setup(body));
      case "pay":
        return NextResponse.json(await srv.pay(body));
      case "revoke":
        return NextResponse.json(await srv.revoke(body));
      case "balances":
        return NextResponse.json(await srv.balances(body));
      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (e) {
    // A contract rejection (overspend / revoked / expired) lands here — it is the
    // demo's whole point, so return it as data the UI can show, not an HTTP error.
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) });
  }
}
