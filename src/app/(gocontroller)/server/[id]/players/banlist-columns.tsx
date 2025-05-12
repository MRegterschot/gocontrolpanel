"use client";

import { unbanPlayer } from "@/actions/gbx/player";
import ConfirmModal from "@/components/modals/confirm-modal";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/utils";
import { PlayerInfo } from "@/types/player";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";

export const createColumns = (
  serverId: number,
  refetch: () => void,
): ColumnDef<PlayerInfo>[] => [
  {
    accessorKey: "nickName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Nickname"} />
    ),
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.getValue("nickName")),
        }}
      />
    ),
  },
  {
    accessorKey: "login",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Login"} />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const player = row.original;
      const [confirmUnban, setConfirmUnban] = useState(false);

      const handleUnban = async () => {
        try {
          const { error } = await unbanPlayer(serverId, player.login);
          if (error) {
            throw new Error(error);
          }

          refetch();
          toast.success("Player successfully unbanned");
        } catch (error) {
          toast.error("Error unbanning player", {
            description: getErrorMessage(error),
          });
        }
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
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmUnban(true)}
              >
                Unban player
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConfirmModal
            isOpen={confirmUnban}
            onClose={() => setConfirmUnban(false)}
            title="Unban player"
            description={`Are you sure you want to unban ${player.nickName}?`}
            onConfirm={handleUnban}
            confirmText="Unban"
            cancelText="Cancel"
          />
        </div>
      );
    },
  },
];
