"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const createServerRequestColumns = (
  _refetch: () => void,
  args: { showServer?: boolean } = {},
): ColumnDef<CodriverRequestRow>[] => [
  ...(args.showServer ? [{ accessorKey: "serverName", header: "Server" }] : []),
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
  { accessorKey: "model", header: "Model" },
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
  {
    id: "export",
    header: "Evaluation",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => exportDraft(row.original)}
      >
        Export draft
      </Button>
    ),
  },
];

function exportDraft(row: CodriverRequestRow) {
  const draft = {
    id: `history-${row.id}`,
    text: row.text,
    role: null,
    state: null,
    expected: { kind: "calls", calls: row.toolCalls ?? [] },
    review:
      "Fill in the original caller role and server state, correct the expected outcome, and remove private names or text before adding this case to the evaluation dataset.",
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `codriver-eval-${row.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
