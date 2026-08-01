/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { removeGuest } from "@/actions/gbx/player";
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
import { ServerError } from "@/types/responses";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";

export const createColumns = (
  serverId: string,
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
      const [confirmRemoveGuest, setConfirmRemoveGuest] = useState(false);

      const handleRemoveGuest = async () => {
        try {
          const { error } = await removeGuest(serverId, player.login);
          if (error) {
            throw new ServerError(error, "RemoveGuestError");
          }

          refetch();
          toast.success("Player successfully removed from guest list");
        } catch (error) {
          toast.error("Error removing player from guest list", {
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
                onClick={() => setConfirmRemoveGuest(true)}
              >
                Remove from guest list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConfirmModal
            isOpen={confirmRemoveGuest}
            onClose={() => setConfirmRemoveGuest(false)}
            title="Remove from guest list"
            description={`Are you sure you want to remove ${player.nickName} from the guest list?`}
            onConfirm={handleRemoveGuest}
            confirmText="Remove"
            cancelText="Cancel"
          />
        </div>
      );
    },
  },
];
