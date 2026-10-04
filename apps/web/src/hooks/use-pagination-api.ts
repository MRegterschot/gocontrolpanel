import { fetchPaginated } from "@/lib/api-client/http";
import { logger } from "@/lib/logger";
import { ServerError } from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { useCallback, useEffect, useRef, useState } from "react";

interface PaginationAPIHook<TData> {
  data: TData[];
  totalCount: number;
  loading: boolean;
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
): PaginationAPIHook<TData> => {
  const [data, setData] = useState<TData[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const inFlight = useRef<AbortController | null>(null);

  const fetchDataFromAPI = useCallback(async () => {
    // A slow answer for an older page must not overwrite a newer one
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;

    setLoading(true);
    try {
      const { data: page, error } = await fetchPaginated<TData>(
        endpoint,
        pagination,
        sorting,
        filter,
        controller.signal,
      );

      if (error) {
        throw new ServerError(error, "FetchDataFromAPIError");
      }

      setData(page.data);
      setTotalCount(page.totalCount);
    } catch (error) {
      if (controller.signal.aborted) return;

      const meta = {
        type: "hook",
        module: "usePaginationAPI",
        function: "fetchDataFromAPI",
      };
      logger.error({ meta, error }, "Error fetching data");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [
    endpoint,
    pagination.pageIndex,
    pagination.pageSize,
    sorting.field,
    sorting.order,
    filter,
  ]);

  useEffect(() => {
    fetchDataFromAPI();
    return () => inFlight.current?.abort();
  }, [fetchDataFromAPI]);

  return { data, totalCount, loading, refetch: fetchDataFromAPI };
};
