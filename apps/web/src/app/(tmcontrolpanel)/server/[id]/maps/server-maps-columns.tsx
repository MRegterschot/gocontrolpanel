/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Maps } from "@tmcp/db";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useTransition } from "react";
import { parseTmTags } from "tmtags";

export const createColumns = (
  onAddMap: (map: Maps) => void,
): ColumnDef<Maps>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Map Name"} />
    ),
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{ __html: parseTmTags(row.getValue("name")) }}
      />
    ),
  },
  {
    accessorKey: "authorNickname",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Author"} />
    ),
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.getValue("authorNickname")),
        }}
      />
    ),
  },
  {
    accessorKey: "uid",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"UID"} />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const map = row.original;
      const [_, startTransition] = useTransition();

      const handleAddMap = () => {
        startTransition(() => {
          onAddMap(map);
        });
      };

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleAddMap}>
                Add map to jukebox
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
