import { PaginationResponse, ServerResponse } from "@/types/responses";

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue | QueryValue[]>;

export interface GetOptions {
  signal?: AbortSignal;
  // Turn the ISO timestamps JSON flattened back into Dates. Only for payloads from the
  // database, where Prisma returns Date objects; other APIs send plain strings.
  dates?: boolean;
}

// What Prisma's Date serialises to. Requiring milliseconds and a Z keeps ordinary strings alone.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function reviveDates(_key: string, value: unknown) {
  return typeof value === "string" && ISO_DATE.test(value)
    ? new Date(value)
    : value;
}

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const v of Array.isArray(value) ? value : [value]) {
      if (v !== undefined && v !== null) params.append(key, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

// GET against our own API, returning the { data, error } shape the Server Actions had, so
// call sites only change their import. A failed request never throws.
export async function apiGet<T>(
  path: string,
  query?: Query,
  options: GetOptions = {},
): Promise<ServerResponse<T>> {
  const failed = (error: string): ServerResponse<T> => ({
    data: undefined as T,
    error,
  });

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    return failed("Could not reach the server");
  }

  let body: ServerResponse<T>;
  try {
    body = JSON.parse(
      await res.text(),
      options.dates ? reviveDates : undefined,
    );
  } catch {
    return failed(`Request failed (${res.status})`);
  }

  if (!res.ok && !body.error) {
    return failed(`Request failed (${res.status})`);
  }
  return body;
}

export interface Sorting {
  field: string;
  order: "asc" | "desc";
}

// One page of a paginated table; the routes behind it all take the same query
export function fetchPaginated<T>(
  endpoint: string,
  pagination: { pageIndex: number; pageSize: number },
  sorting: Sorting,
  filter: string,
  signal?: AbortSignal,
): Promise<ServerResponse<PaginationResponse<T>>> {
  return apiGet(
    endpoint,
    {
      pageIndex: pagination.pageIndex,
      pageSize: pagination.pageSize,
      sortField: sorting.field,
      sortOrder: sorting.order,
      filter: filter || undefined,
    },
    { signal, dates: true },
  );
}
