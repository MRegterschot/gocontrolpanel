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
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Input } from "../ui/input";

interface PaginationTableProps<TData, TValue, TArgs, TActionArgs> {
  createColumns: (
    refetch: () => void,
    data: TArgs,
  ) => ColumnDef<TData, TValue>[];
  // The GET route that serves the pages, e.g. /api/roles
  endpoint: string;
  args?: TArgs;
  pageSize?: number;
  filter?: boolean;
  sortingField?: string;
  actions?: (refetch: () => void, args?: TActionArgs) => React.ReactNode;
  actionsAllowed?: boolean;
  actionsArgs?: TActionArgs;
}

export function PaginationTable<TData, TValue, TArgs, TActionArgs>({
  createColumns,
  endpoint,
  args = {} as TArgs,
  pageSize = 10,
  filter = false,
  sortingField = "createdAt",
  actions,
  actionsAllowed = true,
  actionsArgs,
}: PaginationTableProps<TData, TValue, TArgs, TActionArgs>) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageSize,
    pageIndex: 0,
  });
  const { sorting, setSorting, field, order } = useSorting(sortingField);

  const [searchInput, setSearchInput] = useState("");
  const [globalFilter, setGlobalFilter] = useState("");

  const { data, totalCount, loading, refetch } = usePaginationAPI<TData>(
    endpoint,
    pagination,
    { field, order },
    globalFilter,
  );

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

      <Card className="flex-1 overflow-hidden">
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
      </Card>

      <div>
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}
