/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import {
  addGuest,
  banPlayer,
  blacklistPlayer,
  forceSpectator,
  kickPlayer,
  removeGuest,
} from "@/actions/gbx/player";
import BooleanDisplay from "@/components/boolean-display";
import ConfirmModal from "@/components/modals/confirm-modal";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/utils";
import { PlayerInfo } from "@/types/player";
import { ServerError } from "@/types/responses";
import { IconCamera, IconSteeringWheelFilled } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";

export const createColumns = (id: string): ColumnDef<PlayerInfo>[] => [
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
    accessorKey: "teamId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Team"} />
    ),
    cell: ({ row }) => {
      const teamId = row.getValue("teamId");
      return <span>{teamId === -1 ? "No Team" : `Team ${teamId}`}</span>;
    },
  },
  {
    accessorKey: "spectatorStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Spectator Status"} />
    ),
    cell: ({ row }) => {
      const status = row.getValue("spectatorStatus");
      return (
        <BooleanDisplay
          value={status !== 0}
          falseIcon={IconSteeringWheelFilled}
          trueIcon={IconCamera}
        />
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const player = row.original;
      const [confirmBan, setConfirmBan] = useState(false);
      const [confirmBlacklist, setConfirmBlacklist] = useState(false);
      const [confirmAddGuest, setConfirmAddGuest] = useState(false);
      const [confirmRemoveGuest, setConfirmRemoveGuest] = useState(false);
      const [confirmKick, setConfirmKick] = useState(false);
      const [confirmForceSpectator, setConfirmForceSpectator] = useState(false);

      const handleBan = async () => {
        try {
          const { error } = await banPlayer(
            id,
            player.login,
            "Banned by admin",
          );
          if (error) {
            throw new ServerError(error, "BanPlayerError");
          }

          toast.success("Player successfully banned", {
            description: `Player ${player.nickName} has been banned.`,
          });
        } catch (error) {
          toast.error("Error banning player", {
            description: getErrorMessage(error),
          });
        }
      };

      const handleBlacklist = async () => {
        try {
          const { error } = await blacklistPlayer(id, player.login);
          if (error) {
            throw new ServerError(error, "BlacklistPlayerError");
          }

          toast.success("Player successfully blacklisted", {
            description: `Player ${player.nickName} has been blacklisted.`,
          });
        } catch (error) {
          toast.error("Error blacklisting player", {
            description: getErrorMessage(error),
          });
        }
      };

      const handleAddGuest = async () => {
        try {
          const { error } = await addGuest(id, player.login);
          if (error) {
            throw new ServerError(error, "AddGuestError");
          }

          toast.success("Player successfully added as guest", {
            description: `Player ${player.nickName} has been added as a guest.`,
          });
        } catch (error) {
          toast.error("Error adding player as guest", {
            description: getErrorMessage(error),
          });
        }
      };

      const handleRemoveGuest = async () => {
        try {
          const { error } = await removeGuest(id, player.login);
          if (error) {
            throw new ServerError(error, "RemoveGuestError");
          }

          toast.success("Player successfully removed from guest list", {
            description: `Player ${player.nickName} has been removed from the guest list.`,
          });
        } catch (error) {
          toast.error("Error removing player from guest list", {
            description: getErrorMessage(error),
          });
        }
      };

      const handleKick = async () => {
        try {
          const { error } = await kickPlayer(
            id,
            player.login,
            "Kicked by admin",
          );
          if (error) {
            throw new ServerError(error, "KickPlayerError");
          }

          toast.success("Player successfully kicked", {
            description: `Player ${player.nickName} has been kicked.`,
          });
        } catch (error) {
          toast.error("Error kicking player", {
            description: getErrorMessage(error),
          });
        }
      };

      const handleForceSpectator = async () => {
        try {
          const { error } = await forceSpectator(id, player.login, 3);
          if (error) {
            throw new ServerError(error, "ForceSpectatorError");
          }

          toast.success("Player successfully forced to spectator", {
            description: `Player ${player.nickName} has been forced to spectator.`,
          });
        } catch (error) {
          toast.error("Error forcing player to spectator", {
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
              <DropdownMenuItem onClick={() => setConfirmAddGuest(true)}>
                Add to guestlist
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmForceSpectator(true)}>
                Force spectator
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmKick(true)}
              >
                Kick
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmBan(true)}
              >
                Ban
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmBlacklist(true)}
              >
                Blacklist
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmRemoveGuest(true)}
              >
                Remove from guestlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConfirmModal
            isOpen={confirmBan}
            onClose={() => setConfirmBan(false)}
            onConfirm={handleBan}
            title="Ban Player"
            description={`Are you sure you want to ban ${player.nickName}?`}
            confirmText="Ban"
            cancelText="Cancel"
          />

          <ConfirmModal
            isOpen={confirmBlacklist}
            onClose={() => setConfirmBlacklist(false)}
            onConfirm={handleBlacklist}
            title="Blacklist Player"
            description={`Are you sure you want to blacklist ${player.nickName}?`}
            confirmText="Blacklist"
            cancelText="Cancel"
          />

          <ConfirmModal
            isOpen={confirmAddGuest}
            onClose={() => setConfirmAddGuest(false)}
            onConfirm={handleAddGuest}
            title="Add Guest"
            description={`Are you sure you want to add ${player.nickName} as a guest?`}
            confirmText="Add Guest"
            cancelText="Cancel"
            variant="default"
          />

          <ConfirmModal
            isOpen={confirmRemoveGuest}
            onClose={() => setConfirmRemoveGuest(false)}
            onConfirm={handleRemoveGuest}
            title="Remove Guest"
            description={`Are you sure you want to remove ${player.nickName} from the guest list?`}
            confirmText="Remove Guest"
            cancelText="Cancel"
          />

          <ConfirmModal
            isOpen={confirmKick}
            onClose={() => setConfirmKick(false)}
            onConfirm={handleKick}
            title="Kick Player"
            description={`Are you sure you want to kick ${player.nickName}?`}
            confirmText="Kick"
            cancelText="Cancel"
          />

          <ConfirmModal
            isOpen={confirmForceSpectator}
            onClose={() => setConfirmForceSpectator(false)}
            onConfirm={handleForceSpectator}
            title="Force Spectator"
            description={`Are you sure you want to force ${player.nickName} to spectator?`}
            confirmText="Force Spectator"
            cancelText="Cancel"
            variant="default"
          />
        </div>
      );
    },
  },
];
