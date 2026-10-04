/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { addMap } from "@/actions/gbx/map";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/utils";
import { LocalMapInfo } from "@/types/map";
import { ServerError } from "@/types/responses";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";

export const createColumns = (
  serverId: string,
  refreshMapList: () => void,
): ColumnDef<LocalMapInfo>[] => [
  {
    accessorKey: "Path",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Folder"} />
    ),
  },
  {
    accessorKey: "FileName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"File Name"} />
    ),
    cell: ({ row }) => {
      const fileName = row.getValue("FileName") as string;
      return <span>{fileName?.split("/").pop()}</span>;
    },
  },
  {
    accessorKey: "Name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Map Name"} />
    ),
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{ __html: parseTmTags(row.getValue("Name")) }}
      ></span>
    ),
  },
  {
    accessorKey: "AuthorNickname",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Author"} />
    ),
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.getValue("AuthorNickname")),
        }}
      ></span>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const localMap = row.original;
      const [_, startTransition] = useTransition();

      const handleAddMap = () => {
        startTransition(async () => {
          try {
            const { error } = await addMap(serverId, localMap.FileName);
            if (error) {
              throw new ServerError(error, "AddMapError");
            }
            toast.success("Map successfully added");
            refreshMapList();
          } catch (error) {
            toast.error("Error adding map", {
              description: getErrorMessage(error),
            });
          }
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
                Add map
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
