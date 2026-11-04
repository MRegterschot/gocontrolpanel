"use client";

import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Registration } from "@/hooks/tournaments/competitions/registrations/use-registrations";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<Registration>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Name"} />
    ),
  },
  {
    accessorKey: "registeredAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Registered At"} />
    ),
    cell: ({ row }) => (
      <span>
        {row.original.registeredAt.toDate().toLocaleDateString()}{" "}
        {row.original.registeredAt.toDate().toLocaleTimeString()}
      </span>
    ),
  },
];
