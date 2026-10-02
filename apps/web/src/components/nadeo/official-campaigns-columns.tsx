"use client";
import { Campaign } from "@/types/api/nadeo";
import { IconArrowRight } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export const createColumns = (serverId: string): ColumnDef<Campaign>[] => [
  {
    accessorKey: "name",
    header: () => <span>Name</span>,
  },
  {
    accessorKey: "startTimestamp",
    header: () => <span>Start</span>,
    cell: ({ row }) => (
      <span>
        {new Date(row.original.startTimestamp * 1000).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "long", day: "numeric" },
        )}
      </span>
    ),
  },
  {
    accessorKey: "endTimestamp",
    header: () => <span>End</span>,
    cell: ({ row }) => (
      <span>
        {new Date(row.original.endTimestamp * 1000).toLocaleDateString(
          "en-US",
          { year: "numeric", month: "long", day: "numeric" },
        )}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Link href={`/server/${serverId}/nadeo?campaign=${row.original.id}`}>
          <IconArrowRight />
        </Link>
      </div>
    ),
  },
];
