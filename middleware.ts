import { NextResponse, type NextRequest } from "next/server";

// This app intentionally uses NO Server Actions. Any inbound request carrying a
// `Next-Action` header is therefore illegitimate — almost always automated
// scanner traffic or a stale browser tab from a prior deployment. Left alone,
// Next.js tries to resolve the (nonexistent) action and logs a red
// "Failed to find Server Action" error. We short-circuit those here with a quiet
// 204 so the production logs stay clean.
export function middleware(request: NextRequest) {
  if (request.headers.has("next-action")) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.next();
}

// Run only on POST requests, the only method Server Action invocations use.
// Skip Next internals and static assets so normal traffic is untouched.
export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      has: [{ type: "header", key: "next-action" }],
    },
  ],
};
