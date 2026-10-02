"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import clsx from "clsx";
import { useState } from "react";
import { Input } from "../ui/input";
import { DataTablePagination } from "./data-table-pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  filter?: boolean;
  pagination?: boolean;
  actions?: React.ReactNode;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  filter = false,
  pagination = false,
  actions,
  globalFilter: globalFilterProp,
  onGlobalFilterChange,
  className,
}: DataTableProps<TData, TValue>) {
  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");

  const isControlled =
    globalFilterProp !== undefined && onGlobalFilterChange !== undefined;

  const globalFilter = isControlled ? globalFilterProp : internalGlobalFilter;
  const setGlobalFilter = isControlled
    ? onGlobalFilterChange
    : setInternalGlobalFilter;

  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(pagination && { getPaginationRowModel: getPaginationRowModel() }),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: "includesString",
    state: {
      sorting,
      globalFilter,
    },
    defaultColumn: {
      size: 100,
    },
  });

  return (
    <div className="flex flex-col gap-4 overflow-x-auto">
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
              value={globalFilter || ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="flex-1 sm:max-w-1/3"
            />
          )}
          {actions}
        </div>
      )}

      <div className={clsx("rounded-md border flex-1", className)}>
        <Table>
          <TableHeader className="table-fixed border-b">
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
            {(pagination
              ? table.getRowModel().rows
              : table.getPrePaginationRowModel().rows
            )?.length ? (
              (pagination
                ? table.getRowModel().rows
                : table.getPrePaginationRowModel().rows
              ).map((row) => (
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
            ) : isLoading ? (
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

      {pagination && <DataTablePagination table={table} />}
    </div>
  );
}
