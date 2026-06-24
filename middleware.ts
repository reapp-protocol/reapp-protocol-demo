import { NextResponse, type NextRequest } from "next/server";

// This app intentionally uses NO Server Actions. Any inbound request carrying a
// `Next-Action` header is therefore illegitimate — almost always automated
// scanner traffic or a stale browser tab from a prior deployment. Left alone,
// Next.js tries to resolve the (nonexistent) action and logs a red
// "Failed to find Server Action" error. We short-circuit those here with a quiet
// 204 so the production logs stay clean.
export function middleware(request: NextRequest) {
  // Headers API lookups are case-insensitive, so this catches `Next-Action`,
  // `next-action`, etc. regardless of how the client cased it.
  if (request.headers.has("next-action")) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.next();
}

// Run on every route (Next internals and static assets excluded for speed) and
// do the header check in code rather than via a matcher `has` clause, so the
// short-circuit can't be silently skipped by matcher edge cases.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
