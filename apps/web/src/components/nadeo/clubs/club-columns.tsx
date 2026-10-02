"use client";
import { Club } from "@/types/api/nadeo";
import { IconArrowRight } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { parseTmTags } from "tmtags";

export const createColumns = (
  _: () => void,
  serverId: string,
): ColumnDef<Club>[] => [
  {
    accessorKey: "name",
    header: () => <span>Name</span>,
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.original.name),
        }}
      />
    ),
  },
  {
    accessorKey: "description",
    header: () => <span>Description</span>,
    cell: ({ row }) => (
      <span
        className="truncate"
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.original.description),
        }}
      ></span>
    ),
  },
  {
    accessorKey: "creationTimestamp",
    header: () => <span>Created At</span>,
    cell: ({ row }) => {
      const date = new Date(row.original.creationTimestamp * 1000);
      return (
        <span>
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Link href={`/server/${serverId}/nadeo?club=${row.original.id}`}>
          <IconArrowRight />
        </Link>
      </div>
    ),
  },
];
