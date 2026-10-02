"use client";
import { ClubCampaign } from "@/types/api/nadeo";
import { IconArrowRight } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { parseTmTags } from "tmtags";

export const createColumns = (
  _: () => void,
  serverId: string,
): ColumnDef<ClubCampaign>[] => [
  {
    accessorKey: "campaign.name",
    header: () => <span>Name</span>,
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.original.campaign.name),
        }}
      />
    ),
  },
  {
    accessorKey: "clubName",
    header: () => <span>Club</span>,
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{ __html: parseTmTags(row.original.clubName) }}
      />
    ),
  },
  {
    accessorKey: "campaign.publicationTimestamp",
    header: () => <span>Published At</span>,
    cell: ({ row }) => {
      const date = new Date(row.original.campaign.publicationTimestamp * 1000);
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
        <Link
          href={`/server/${serverId}/nadeo?campaign=${row.original.campaign.id}&club=${row.original.clubId}`}
        >
          <IconArrowRight />
        </Link>
      </div>
    ),
  },
];
