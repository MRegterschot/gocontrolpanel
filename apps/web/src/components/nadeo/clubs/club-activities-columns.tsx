"use client";
import { capitalizeWords } from "@/lib/utils";
import { ClubActivity } from "@/types/api/nadeo";
import { IconArrowRight } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { parseTmTags } from "tmtags";

export const createColumns = (
  _: () => void,
  serverId: string,
): ColumnDef<ClubActivity>[] => [
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
    accessorKey: "activityType",
    header: () => <span>Type</span>,
    cell: ({ row }) => (
      <span>
        {capitalizeWords(
          row.original.activityType?.replaceAll("-", " ") || "Unknown",
        )}
      </span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex justify-end">
        {row.original.activityType === "campaign" && (
          <Link
            href={`/server/${serverId}/nadeo?club=${row.original.clubId}&campaign=${row.original.campaignId}`}
          >
            <IconArrowRight />
          </Link>
        )}
      </div>
    ),
  },
];
