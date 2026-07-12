import {
  isDemoResourceId,
  normalizeExpressDemoError,
  proxyExpressDemoResource,
  reportExpressDemoBudgetRejection,
  type ExpressDemoErrorResponse,
} from "@/lib/express-demo";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ sessionId: string; resource: string }>;
};

function errorResponse(body: ExpressDemoErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
}

function successResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store, no-transform",
      "x-content-type-options": "nosniff",
    },
  });
}

function validRoute(sessionId: string, resource: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)
    && isDemoResourceId(resource);
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { sessionId, resource } = await context.params;
  if (!validRoute(sessionId, resource)) {
    const message = "Demo workspace or resource not found.";
    return errorResponse(
      { ok: false, code: "not_found", error: message, events: [{ type: "error", message }] },
      404,
    );
  }

  try {
    // Deliberately no creator-IP check: the random workspace UUID is the
    // capability so a Node process running from VS Code can complete x402.
    return await proxyExpressDemoResource(sessionId, resource, request);
  } catch (error) {
    const normalized = normalizeExpressDemoError(error);
    const message = normalized.message;
    return errorResponse(
      {
        ok: false,
        code: normalized.code,
        error: message,
        events: [{ type: "error", message }],
      },
      normalized.status,
    );
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { sessionId, resource } = await context.params;
  if (!validRoute(sessionId, resource)) {
    const message = "Demo workspace or resource not found.";
    return errorResponse(
      { ok: false, code: "not_found", error: message, events: [{ type: "error", message }] },
      404,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 1_024) {
    const message = "The rejection report is too large.";
    return errorResponse(
      { ok: false, code: "invalid_request", error: message, events: [{ type: "error", message }] },
      413,
    );
  }
  const body = await request.json().catch(() => undefined) as unknown;
  if (
    typeof body !== "object"
    || body === null
    || Array.isArray(body)
    || (body as Record<string, unknown>).event !== "contract_rejected"
    || typeof (body as Record<string, unknown>).mandateId !== "string"
  ) {
    const message = "Use contract_rejected with the public mandate id.";
    return errorResponse(
      { ok: false, code: "invalid_request", error: message, events: [{ type: "error", message }] },
      400,
    );
  }

  try {
    return successResponse(await reportExpressDemoBudgetRejection(
      sessionId,
      resource,
      (body as Record<string, unknown>).mandateId as string,
      request.signal,
    ));
  } catch (error) {
    const normalized = normalizeExpressDemoError(error);
    const message = normalized.message;
    return errorResponse(
      { ok: false, code: normalized.code, error: message, events: [{ type: "error", message }] },
      normalized.status,
    );
  }
}
