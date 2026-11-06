"use client";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { getCurrencySymbol } from "@/lib/utils";
import { HetznerServerType } from "@/types/api/hetzner/servers";
import { ColumnDef } from "@tanstack/react-table";

export const createColumns = (
  location: string,
  currency: string,
): ColumnDef<HetznerServerType>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Name"} />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Description"} />
    ),
  },
  {
    accessorKey: "cores",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Cores"} />
    ),
  },
  {
    accessorKey: "memory",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Memory"} />
    ),
    cell: ({ row }) => `${row.original.memory} GB`,
  },
  {
    accessorKey: "disk",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Disk"} />
    ),
    cell: ({ row }) => `${row.original.disk} GB`,
  },
  {
    accessorKey: "architecture",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Architecture"} />
    ),
  },
  {
    accessorKey: "prices.price_hourly",
    header: () => <span>Hourly Price</span>,
    cell: ({ row }) => {
      const price = row.original.prices.find(
        (price) => price.location === location,
      );
      return price
        ? `${getCurrencySymbol(currency)} ${parseFloat(price.price_hourly.gross)}`
        : "-";
    },
  },
  {
    accessorKey: "prices.price_monthly",
    header: () => <span>Monthly Price</span>,
    cell: ({ row }) => {
      const price = row.original.prices.find(
        (price) => price.location === location,
      );
      return price
        ? `${getCurrencySymbol(currency)} ${parseFloat(price.price_monthly.gross).toFixed(2)}`
        : "-";
    },
  },
];
