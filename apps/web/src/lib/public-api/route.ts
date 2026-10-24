import type { Actor } from "@/lib/actor";
import {
  type ApiKeyPrincipal,
  authenticateApiKey,
  hasApiKeyScope,
} from "@/lib/api-keys/authenticate";
import { runWithApiKey } from "@/lib/api-keys/context";
import { STATUS_BY_CODE } from "@/lib/api-route";
import { logger } from "@/lib/logger";
import { takeRateLimitToken } from "@/lib/ratelimiter";
import { reportException } from "@/lib/sentry/report";
import { ServerError, type ServerResponse } from "@/types/responses";
import type {
  ApiEndpoint,
  ApiErrorBody,
  EndpointBody,
  EndpointParams,
  EndpointQuery,
  EndpointResult,
} from "@gcp/shared/public-api";
import { NextRequest, NextResponse } from "next/server";
import "server-only";
import type { z } from "zod/v4";

const MAX_BODY_BYTES = 64 * 1024;
const RATE_PER_MINUTE = 120;
const RATE_BURST = 30;

const HEADERS = { "Cache-Control": "private, no-store" };

const STATUS: Record<string, number> = {
  ...STATUS_BY_CODE,
  InvalidApiKey: 401,
  MissingScope: 403,
  NotFound: 404,
  RateLimited: 429,
  // From the GBX service
  BadRequest: 400,
  PlayerNotFound: 404,
  RemoveLastMapError: 409,
  // The dedicated server refused the call; the message carries its reason
  GbxCallFailed: 422,
  // Plugin installs and settings
  PluginNotFound: 404,
  CapabilitiesNotAccepted: 400,
  PluginNotFromMarketplace: 400,
  PluginHasNoConfig: 400,
  PluginYanked: 409,
  PluginNameTaken: 409,
  PluginIncompatible: 409,
};

type Issue = { path: string; message: string };

class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues?: Issue[],
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export interface PublicApiContext<E extends ApiEndpoint> {
  req: NextRequest;
  principal: ApiKeyPrincipal;
  actor: Actor;
  params: EndpointParams<E>;
  query: EndpointQuery<E>;
  body: EndpointBody<E>;
}

// Throws the failure of a ServerResponse, so handlers can reuse the doActionAs-style reads
export function orThrow<T>(res: ServerResponse<T>): T {
  if (res.error) throw new ServerError(res.error, res.code ?? "Error");
  return res.data;
}

export function notFound(message = "Not found"): ServerError {
  return new ServerError(message, "NotFound");
}

function failure(error: ApiFailure): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.issues && { issues: error.issues }),
      },
    },
    { status: error.status, headers: { ...HEADERS, ...error.headers } },
  );
}

function validate<S extends z.ZodType>(
  schema: S,
  raw: unknown,
  where: string,
): z.output<S> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const issues = parsed.error.issues.map((issue) => ({
    path: [where, ...issue.path.map(String)].join("."),
    message: issue.message,
  }));
  throw new ApiFailure(
    400,
    "ValidationError",
    issues.map((i) => `${i.path}: ${i.message}`).join("; "),
    issues,
  );
}

function rawQuery(query: URLSearchParams): Record<string, string | string[]> {
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(query.keys())) {
    const values = query.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }
  return raw;
}

async function readBody(req: NextRequest): Promise<unknown> {
  const tooLarge = () =>
    new ApiFailure(413, "PayloadTooLarge", "Request body is too large");
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    throw tooLarge();
  }
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw tooLarge();
  }
  // A body whose fields all have defaults may be left out
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiFailure(400, "ValidationError", "Body is not valid JSON");
  }
}

async function rateLimit(keyId: string): Promise<void> {
  const { allowed, retryAfterMs } = await takeRateLimitToken({
    key: `api-key:${keyId}`,
    ratePerMinute: RATE_PER_MINUTE,
    burst: RATE_BURST,
  });
  if (!allowed) {
    throw new ApiFailure(429, "RateLimited", "Too many requests", undefined, {
      "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
    });
  }
}

// Turns anything a handler throws into a response; only deliberate errors show their message
function toFailure(error: unknown): ApiFailure {
  if (error instanceof ApiFailure) return error;
  if (error instanceof ServerError) {
    return new ApiFailure(STATUS[error.name] ?? 500, error.name, error.message);
  }
  return new ApiFailure(500, "Error", "Internal server error");
}

// Route handler for a contract endpoint: authenticates the key, checks its scope and server,
// validates the input and serialises the output through the contract's schemas
export function publicApiRoute<E extends ApiEndpoint>(
  endpoint: E,
  handler: (ctx: PublicApiContext<E>) => Promise<EndpointResult<E>>,
) {
  return async (
    req: NextRequest,
    routeCtx: { params: Promise<Record<string, string>> },
  ) => {
    let principal: ApiKeyPrincipal | undefined;
    try {
      // Bearer only: a panel session cookie never authenticates the public API
      principal = await authenticateApiKey(req.headers.get("authorization"));
      await rateLimit(principal.keyId);

      if (endpoint.scope && !hasApiKeyScope(principal, endpoint.scope)) {
        throw new ApiFailure(
          403,
          "MissingScope",
          `This key lacks the ${endpoint.scope} scope`,
        );
      }

      const rawParams = await routeCtx.params;
      const params = endpoint.params
        ? validate(endpoint.params, rawParams, "params")
        : undefined;
      // Checked again by the operations themselves; this answers early and the same way for
      // servers that do not exist and servers the key cannot reach
      const serverId = (params as { serverId?: string } | undefined)?.serverId;
      if (serverId && !principal.servers.some((s) => s.id === serverId)) {
        throw new ApiFailure(
          403,
          "Unauthorized",
          "This key cannot reach this server",
        );
      }

      const query = endpoint.query
        ? validate(endpoint.query, rawQuery(req.nextUrl.searchParams), "query")
        : undefined;
      const body = endpoint.body
        ? validate(endpoint.body, await readBody(req), "body")
        : undefined;

      const { keyId, actor } = principal;
      const result = await runWithApiKey(keyId, () =>
        handler({
          req,
          principal: principal!,
          actor,
          params: params as EndpointParams<E>,
          query: query as EndpointQuery<E>,
          body: body as EndpointBody<E>,
        }),
      );

      if (!endpoint.response) {
        return new NextResponse(null, {
          status: endpoint.status,
          headers: HEADERS,
        });
      }
      // Strips anything the contract does not declare; a mismatch is a bug, not a client error
      const output = endpoint.response.safeParse(result);
      if (!output.success) {
        throw new Error(
          `Response for ${endpoint.id} does not match the contract: ${output.error.message}`,
        );
      }
      return NextResponse.json(output.data, {
        status: endpoint.status,
        headers: HEADERS,
      });
    } catch (error) {
      const fail = toFailure(error);
      if (fail.status >= 500) {
        const meta = {
          type: "api",
          module: "public-api",
          function: endpoint.id,
        };
        logger.error(
          {
            meta,
            error,
            path: req.nextUrl.pathname,
            apiKeyId: principal?.keyId,
          },
          "Public API request failed",
        );
        reportException(error, meta);
      }
      return failure(fail);
    }
  };
}
