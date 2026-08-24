import { logger } from "@/lib/logger";
import {
  PaginationResponse,
  ServerError,
  ServerResponse,
} from "@/types/responses";
import { PaginationState } from "@tanstack/react-table";
import { useEffect, useState } from "react";

interface PaginationAPIHook<TData, TFetch> {
  data: TData[];
  totalCount: number;
  loading: boolean;
  refetch: () => Promise<void>;
  fetchArgs?: TFetch;
}

export const usePaginationAPI = <TData, TFetch>(
  fetchData: (
    pagination: PaginationState,
    sorting: { field: string; order: "asc" | "desc" },
    filter: string,
    fetchArgs?: TFetch,
  ) => Promise<ServerResponse<PaginationResponse<TData>>>,
  pagination: PaginationState,
  sorting: { field: string; order: "asc" | "desc" } = {
    field: "createdAt",
    order: "desc",
  },
  filter: string = "",
  fetchArgs?: TFetch,
): PaginationAPIHook<TData, TFetch> => {
  const [data, setData] = useState<TData[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDataFromAPI = async () => {
    setLoading(true);
    try {
      // The response has to be narrowed before the payload is unpacked. This
      // used to destructure `data: { data, totalCount }` up front, which threw a
      // TypeError on the failure path -- where there is no `data` at all --
      // instead of the ServerError below.
      const response = await fetchData(pagination, sorting, filter, fetchArgs);

      if (!response.ok) {
        throw new ServerError(response.error, "FetchDataFromAPIError");
      }

      setData(response.data.data);
      setTotalCount(response.data.totalCount);
    } catch (error) {
      const meta = {
        type: "hook",
        module: "usePaginationAPI",
        function: "fetchDataFromAPI",
      };
      logger.error({ meta, error }, "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataFromAPI();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sorting.field,
    sorting.order,
    filter,
  ]);

  return { data, totalCount, loading, refetch: fetchDataFromAPI };
};
