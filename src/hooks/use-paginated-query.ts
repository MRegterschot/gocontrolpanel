"use client";

import { PaginationResponse } from "@/types/responses";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";

export type Sorting = { field: string; order: "asc" | "desc" };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(
  endpoint: string,
  pagination: PaginationState,
  sorting: Sorting,
  filter: string,
  params?: Record<string, string | undefined>,
) {
  const search = new URLSearchParams({
    page: String(pagination.pageIndex),
    pageSize: String(pagination.pageSize),
    sortField: sorting.field,
    sortOrder: sorting.order,
  });

  if (filter) search.set("filter", filter);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) search.set(key, value);
  }

  return `${endpoint}?${search.toString()}`;
}

/**
 * Reads a page of rows from a paginated API route.
 *
 * Replaces the previous hand-rolled `useEffect` + `setState` fetch, which had no
 * caching, no request deduplication, no retry, and no way to cancel a response
 * that arrived after the parameters had already changed.
 */
export function usePaginatedQuery<TData>(
  endpoint: string,
  pagination: PaginationState,
  sorting: Sorting,
  filter: string = "",
  params?: Record<string, string | undefined>,
) {
  const query = useQuery<PaginationResponse<TData>, ApiError>({
    queryKey: [endpoint, pagination, sorting, filter, params],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        buildUrl(endpoint, pagination, sorting, filter, params),
        { signal },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new ApiError(
          body.error ?? "Failed to fetch data",
          response.status,
          body.code,
        );
      }

      return response.json();
    },
    // Keeps the current page visible while the next one loads, instead of
    // flashing an empty table on every page change.
    placeholderData: keepPreviousData,
  });

  return {
    data: query.data?.data ?? [],
    totalCount: query.data?.totalCount ?? 0,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}
