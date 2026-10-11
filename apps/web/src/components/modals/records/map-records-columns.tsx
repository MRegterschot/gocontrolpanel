"use client";

import TimeDisplay from "@/components/time-display";
import { parseTmTags } from "@/lib/tmtags";
import type { RecordsWithUser } from "@/services/database/matches";
import { ColumnDef } from "@tanstack/react-table";

export const createColumns = (): ColumnDef<RecordsWithUser>[] => [
  {
    accessorKey: "rank",
    header: () => <span>Rank</span>,
    cell: ({ row }) => <span>{row.index + 1}</span>,
  },
  {
    accessorKey: "user.nickName",
    header: () => <span>Name</span>,
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.original.user?.nickName || "-"),
        }}
      />
    ),
  },
  {
    accessorKey: "time",
    header: () => <span>Time</span>,
    cell: ({ row }) => <TimeDisplay time={row.original.time} />,
  },
  {
    accessorKey: "createdAt",
    header: () => <span>Driven at</span>,
    cell: ({ row }) => (
      <span>
        {row.original.createdAt.toLocaleDateString()}{" "}
        {row.original.createdAt.toLocaleTimeString()}
      </span>
    ),
  },
];
