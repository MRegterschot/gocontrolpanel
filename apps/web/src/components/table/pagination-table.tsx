"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";

import { DataTablePagination } from "@/components/table/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePaginationAPI } from "@/hooks/use-pagination-api";
import { useSorting } from "@/hooks/use-sorting";
import { PaginationResponse, ServerResponse } from "@/types/responses";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Input } from "../ui/input";

interface PaginationTableProps<TData, TValue, TArgs, TFetch, TActionArgs> {
  createColumns: (
    refetch: () => void,
    data: TArgs,
  ) => ColumnDef<TData, TValue>[];
  fetchData: (
    pagination: PaginationState,
    sorting: {
      field: string;
      order: "asc" | "desc";
    },
    filter: string,
    fetchArgs?: TFetch,
  ) => Promise<ServerResponse<PaginationResponse<TData>>>;
  args?: TArgs;
  pageSize?: number;
  filter?: boolean;
  sortingField?: string;
  fetchArgs?: TFetch;
  actions?: (refetch: () => void, args?: TActionArgs) => React.ReactNode;
  actionsAllowed?: boolean;
  actionsArgs?: TActionArgs;
}

export function PaginationTable<TData, TValue, TArgs, TFetch, TActionArgs>({
  createColumns,
  fetchData,
  args = {} as TArgs,
  pageSize = 10,
  filter = false,
  sortingField = "createdAt",
  fetchArgs = {} as TFetch,
  actions,
  actionsAllowed = true,
  actionsArgs,
}: PaginationTableProps<TData, TValue, TArgs, TFetch, TActionArgs>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageSize,
    pageIndex: 0,
  });
  const { sorting, setSorting, field, order } = useSorting(sortingField);

  const [searchInput, setSearchInput] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");

  const { data, totalCount, loading, refetch } = usePaginationAPI<
    TData,
    TFetch
  >(fetchData, pagination, { field, order }, globalFilter, fetchArgs);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, [globalFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setGlobalFilter(searchInput);
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const columns = createColumns(refetch, args);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onPaginationChange: (newPagination) => setPagination(newPagination),
    onSortingChange: setSorting,
    manualPagination: true,
    manualSorting: true,
    rowCount: totalCount,
    state: {
      pagination,
      sorting,
    },
    defaultColumn: {
      size: 100,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {(filter || actions) && (
        <div
          className={clsx(
            "flex justify-between items-center gap-2 max-w-full",
            !filter && "justify-end",
          )}
        >
          {filter && (
            <Input
              placeholder="Search..."
              value={searchInput || ""}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 sm:max-w-1/3"
            />
          )}

          {actionsAllowed && actions && actions(refetch, actionsArgs)}
        </div>
      )}

      <div className="rounded-md border flex-1 overflow-x-auto">
        <Table>
          <TableHeader className="table-fixed">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="px-4 max-w-64"
                    style={{ minWidth: header.column.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="table-fixed h-12"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-4 overflow-hidden overflow-ellipsis max-w-64"
                      style={{ minWidth: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : loading ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24"
                >
                  <p className="text-muted-foreground">Loading...</p>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div>
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
