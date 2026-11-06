import { fetchPaginated } from "@/lib/api-client/http";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { logger } from "@/lib/logger";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { PaginationState } from "@tanstack/react-table";
import { useCallback, useEffect } from "react";

interface PaginationAPIHook<TData> {
  data: TData[];
  totalCount: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const usePaginationAPI = <TData>(
  endpoint: string,
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" } = {
    field: "createdAt",
    order: "desc",
  },
  filter: string = "",
  queryFilters: Record<string, string> = {},
): PaginationAPIHook<TData> => {
  const query = useQuery({
    queryKey: queryKeys.paginated(
      endpoint,
      pagination,
      sorting,
      filter,
      queryFilters,
    ),
    // The signal cancels the request when the page, sort or filter changes under it
    queryFn: ({ signal }) =>
      unwrap(
        fetchPaginated<TData>(
          endpoint,
          pagination,
          sorting,
          filter,
          signal,
          queryFilters,
        ),
        "FetchDataFromAPIError",
      ),
    // Keep showing the old page while the next one loads, instead of an empty table
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!query.error) return;
    const meta = {
      type: "hook",
      module: "usePaginationAPI",
      function: "queryFn",
    };
    logger.error({ meta, error: query.error }, "Error fetching data");
  }, [query.error]);

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query.refetch]);

  return {
    data: query.data?.data ?? [],
    totalCount: query.data?.totalCount ?? 0,
    loading: query.isFetching,
    error: query.error,
    refetch,
  };
};
