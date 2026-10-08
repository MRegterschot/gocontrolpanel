"use client";

import { Badge } from "@/components/ui/badge";
import type { CodriverRequestRow } from "@/types/codriver";
import { ColumnDef } from "@tanstack/react-table";

export function toolNames(toolCalls: unknown): string[] {
  if (!Array.isArray(toolCalls)) return [];
  return toolCalls
    .map((c) =>
      c && typeof c === "object" && "tool" in c ? String(c.tool) : "",
    )
    .filter(Boolean);
}

export const createServerRequestColumns =
  (): ColumnDef<CodriverRequestRow>[] => [
    {
      id: "createdAt",
      header: "Time",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: "player",
      header: "Player",
      cell: ({ row }) => row.original.userName ?? row.original.login,
    },
    { accessorKey: "source", header: "Source" },
    {
      accessorKey: "text",
      header: "Request",
      size: 240,
      cell: ({ row }) => (
        <span title={row.original.text} className="block truncate max-w-64">
          {row.original.text}
        </span>
      ),
    },
    {
      id: "tools",
      header: "Tools",
      cell: ({ row }) => toolNames(row.original.toolCalls).join(", ") || "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
    },
    { accessorKey: "keySource", header: "Key" },
    {
      id: "cost",
      header: "Cost",
      cell: ({ row }) => `$${(row.original.costMicros / 1_000_000).toFixed(4)}`,
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => `${row.original.latencyMs} ms`,
    },
  ];
