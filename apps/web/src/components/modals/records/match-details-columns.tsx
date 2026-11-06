"use client";

import TimeDisplay from "@/components/time-display";
import { parseTmTags } from "@/lib/tmtags";
import type { RecordsWithUser } from "@/services/database/matches";
import { ColumnDef } from "@tanstack/react-table";

export const createColumns = (
  rounds?: boolean,
  points?: boolean,
): ColumnDef<RecordsWithUser>[] => {
  const columns: ColumnDef<RecordsWithUser>[] = [
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
  ];

  if (rounds) {
    columns.push({
      accessorKey: "round",
      header: () => <span>Round</span>,
    });
  }

  if (points) {
    columns.push({
      accessorKey: "points",
      header: () => <span>Points</span>,
    });
  }

  return columns;
};
