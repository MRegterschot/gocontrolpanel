"use client";

import { RecordsWithUser } from "@/actions/database/matches";
import TimeDisplay from "@/components/time-display";
import { ColumnDef } from "@tanstack/react-table";
import { parseTmTags } from "tmtags";

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
