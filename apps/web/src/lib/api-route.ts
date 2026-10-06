import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { reportException } from "@/lib/sentry/report";
import { getErrorMessage } from "@/lib/utils";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { z, ZodType } from "zod";

// A bad request, as opposed to a failure while serving a good one
export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const STATUS_BY_CODE: Record<string, number> = {
  Unauthorized: 403,
  ValidationError: 400,
  // From the GBX service: the server is unknown to it, or known but not connected right now
  ServerNotFound: 404,
  ServerNotConnected: 503,
  GbxServiceUnavailable: 503,
};

// The payloads depend on who is asking, so a shared cache must never store them
const HEADERS = { "Cache-Control": "private, no-store" };

function respond<T>(body: ServerResponse<T>, status: number) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

function failure(error: string, code: string, status: number) {
  return respond({ data: undefined, error, code }, status);
}

interface ApiContext<P> {
  req: NextRequest;
  params: P;
  query: URLSearchParams;
}

// Wraps a read in a route handler. The service behind it checks its own permissions
// (the same way it did as a Server Action); this adds the transport: 401 without a
// session, a status that matches the failure, and the { data, error } envelope the
// client already knows.
export function apiRoute<
  P extends Record<string, string> = Record<never, never>,
>(handler: (ctx: ApiContext<P>) => Promise<ServerResponse<unknown>>) {
  return async (req: NextRequest, routeCtx: { params: Promise<P> }) => {
    const session = await auth();
    if (!session) {
      return failure("Unauthorized", "Unauthorized", 401);
    }

    try {
      const params = await routeCtx.params;
      const res = await handler({
        req,
        params,
        query: req.nextUrl.searchParams,
      });
      if (!res.error) {
        return respond(res, 200);
      }
      return respond(res, STATUS_BY_CODE[res.code ?? ""] ?? 500);
    } catch (error) {
      if (error instanceof ApiValidationError) {
        return failure(error.message, error.name, 400);
      }

      const meta = { type: "api", module: "api-route", function: "apiRoute" };
      logger.error(
        { meta, error, path: req.nextUrl.pathname },
        "API route failed",
      );
      reportException(error, meta, session);
      return failure(getErrorMessage(error), "Error", 500);
    }
  };
}

// Validates untrusted input (query string, path params) and fails the request with a 400
export function parse<S extends ZodType>(schema: S, raw: unknown): z.output<S> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiValidationError(
      parsed.error.issues
        .map((i) => `${i.path.join(".") || "request"}: ${i.message}`)
        .join("; "),
    );
  }
  return parsed.data;
}

// Reads the query string through a zod schema. Repeated keys arrive as arrays.
export function parseQuery<S extends ZodType>(
  query: URLSearchParams,
  schema: S,
): z.output<S> {
  const raw: Record<string, string | string[]> = {};
  for (const key of new Set(query.keys())) {
    const values = query.getAll(key);
    raw[key] = values.length > 1 ? values : values[0];
  }
  return parse(schema, raw);
}

export const intParam = z.coerce.number().int();

// A single value or a list, always a list
export const stringList = z
  .union([z.string(), z.array(z.string())])
  .transform((v) => (Array.isArray(v) ? v : [v]));

export const MAX_PAGE_SIZE = 100;

// Shared by every paginated table. The sort field ends up in a Prisma orderBy, so it
// is restricted to a plain column name.
export const paginationQuery = z.object({
  pageIndex: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
  sortField: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  filter: z.string().max(200).default(""),
});

// Route for a paginated table: parses the shared pagination query and hands it to the service.
// fetchArgs maps the path params to the extra argument some of the services take.
export function paginatedRoute<
  P extends Record<string, string> = Record<never, never>,
  F = undefined,
>(
  service: (
    pagination: PaginationState,
    sorting: { field: string; order: "asc" | "desc" },
    filter: string,
    fetchArgs?: F,
  ) => Promise<ServerResponse<PaginationResponse<unknown>>>,
  fetchArgs?: (params: P) => F,
) {
  return apiRoute<P>(({ params, query }) => {
    const q = parseQuery(query, paginationQuery);
    return service(
      { pageIndex: q.pageIndex, pageSize: q.pageSize },
      { field: q.sortField, order: q.sortOrder },
      q.filter,
      fetchArgs?.(params),
    );
  });
}
