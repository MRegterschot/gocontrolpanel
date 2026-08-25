import { PaginationResponse, ServerResponse } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Turns a paginated read into a GET route handler.
 *
 * Reads were previously fetched by calling the server action straight from the
 * client. Server Actions are always POST and React serialises them, so two tables
 * on one page could not load in parallel, and none of Next's caching applies to
 * them. As GET routes they are ordinary HTTP: cacheable, parallel, and
 * inspectable in the network tab.
 *
 * The action keeps doing the work -- including its own permission check -- so
 * authorization behaviour is unchanged.
 */

const QuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
  sortField: z.string().min(1).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  filter: z.string().default(""),
});

export type PaginatedAction<TData, TArgs> = (
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" },
  filter: string,
  args?: TArgs,
) => Promise<ServerResponse<PaginationResponse<TData>>>;

/** Maps an action's error code onto a sensible HTTP status. */
function statusFor(code: string): number {
  switch (code) {
    case "Unauthorized":
      return 403;
    case "ValidationError":
      return 400;
    default:
      return 500;
  }
}

export function paginatedRoute<TData, TArgs = undefined>(
  action: PaginatedAction<TData, TArgs>,
  /** Pulls any action-specific arguments out of the request (ids, scopes). */
  buildArgs?: (request: NextRequest, params: Record<string, string>) => TArgs,
) {
  return async function GET(
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ) {
    // `request.url` rather than `nextUrl`: it is the standard Request property,
    // present on NextRequest too, and it keeps this handler testable without
    // constructing a NextRequest.
    const raw = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = QuerySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid pagination parameters", code: "ValidationError" },
        { status: 400 },
      );
    }

    const { page, pageSize, sortField, sortOrder, filter } = parsed.data;
    const params = context?.params ? await context.params : {};

    const result = await action(
      { pageIndex: page, pageSize },
      { field: sortField, order: sortOrder },
      filter,
      buildArgs?.(request, params),
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: statusFor(result.code) },
      );
    }

    // Reads are per-user and permission-dependent; never let a shared cache hold
    // one user's rows and serve them to another.
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  };
}
