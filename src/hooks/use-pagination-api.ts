import { logger } from "@/lib/logger";
import { PaginationResponse, ServerResponse } from "@/types/responses";
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
      const {
        data: { data: fetchedData, totalCount: fetchedTotalCount },
        error,
      } = await fetchData(pagination, sorting, filter, fetchArgs);

      if (error) {
        throw new Error(error);
      }

      setData(fetchedData);
      setTotalCount(fetchedTotalCount);
    } catch (error) {
      logger.error(error, "Error fetching data");
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
