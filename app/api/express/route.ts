import {
  activeExpressDemoSessions,
  challengeExpressDemoSession,
  createExpressDemoSession,
  normalizeExpressDemoError,
  purchaseExpressDemoSession,
  resetExpressDemoSession,
  statusExpressDemoSession,
  type ExpressDemoErrorCode,
  type ExpressDemoErrorResponse,
  type ExpressDemoSuccessResponse,
} from "@/lib/express-demo";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_CONCURRENT_CREATES = 2;
const MAX_ACTIVE_SESSIONS = 4;
const CREATE_COOLDOWN_MS = 60_000;
const recentCreates = new Map<string, number>();
let activeCreates = 0;

type ActionBody =
  | { action: "create" }
  | { action: "challenge" | "purchase" | "reset" | "status"; sessionId: string };

function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  return candidate.slice(0, 96);
}

function pruneCooldowns(now: number): void {
  for (const [ip, startedAt] of recentCreates) {
    if (now - startedAt > CREATE_COOLDOWN_MS * 2) recentCreates.delete(ip);
  }
}

function parseBody(value: unknown): ActionBody | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const body = value as Record<string, unknown>;
  if (body.action === "create") return { action: "create" };
  if (
    (body.action === "challenge"
      || body.action === "purchase"
      || body.action === "reset"
      || body.action === "status")
    && typeof body.sessionId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.sessionId)
  ) {
    return { action: body.action, sessionId: body.sessionId };
  }
  return undefined;
}

function json(
  body: ExpressDemoSuccessResponse | ExpressDemoErrorResponse,
  status = 200,
  retryAfter?: number,
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "private, no-store, no-transform",
    "x-content-type-options": "nosniff",
  });
  if (retryAfter !== undefined) headers.set("retry-after", String(retryAfter));
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(
  code: ExpressDemoErrorCode,
  status: number,
  message: string,
  retryAfter?: number,
): Response {
  return json(
    { ok: false, code, error: message, events: [{ type: "error", message }] },
    status,
    retryAfter,
  );
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.json().catch(() => undefined) as unknown;
  const body = parseBody(raw);
  if (!body) {
    return errorResponse(
      "invalid_request",
      400,
      "Use create, challenge, purchase, status, or reset with a valid sessionId where required.",
    );
  }

  const owner = requestIp(request);
  try {
    if (body.action === "create") {
      const now = Date.now();
      pruneCooldowns(now);
      const previous = recentCreates.get(owner);
      if (previous !== undefined && now - previous < CREATE_COOLDOWN_MS) {
        const retryAfter = Math.max(
          1,
          Math.ceil((CREATE_COOLDOWN_MS - (now - previous)) / 1_000),
        );
        return errorResponse(
          "rate_limited",
          429,
          "Please wait before creating another live testnet workspace.",
          retryAfter,
        );
      }
      if (
        activeCreates >= MAX_CONCURRENT_CREATES
        || activeExpressDemoSessions() + activeCreates >= MAX_ACTIVE_SESSIONS
      ) {
        return errorResponse(
          "capacity",
          429,
          "The live testnet demo is at capacity. Please retry shortly.",
          15,
        );
      }
      recentCreates.set(owner, now);
      activeCreates += 1;
      try {
        const requestUrl = new URL(request.url);
        if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:") {
          return errorResponse("invalid_request", 400, "The public demo URL is invalid.");
        }
        return json(await createExpressDemoSession(owner, request.signal, requestUrl.origin));
      } finally {
        activeCreates = Math.max(0, activeCreates - 1);
      }
    }

    if (body.action === "challenge") {
      return json(await challengeExpressDemoSession(body.sessionId, owner, request.signal));
    }
    if (body.action === "purchase") {
      return json(await purchaseExpressDemoSession(body.sessionId, owner, request.signal));
    }
    if (body.action === "status") {
      return json(await statusExpressDemoSession(body.sessionId, owner, request.signal));
    }
    return json(await resetExpressDemoSession(body.sessionId, owner, request.signal));
  } catch (error) {
    const normalized = normalizeExpressDemoError(error);
    return errorResponse(normalized.code, normalized.status, normalized.message);
  }
}
