/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import {
  deleteMatch,
  MatchesWithMapAndRecords,
} from "@/actions/database/matches";
import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import ExportMatchModal from "@/components/modals/records/export-match";
import MatchDetailsModal from "@/components/modals/records/match-details";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage, hasPermissionSync } from "@/lib/utils";
import { routePermissions } from "@/routes";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";

export const createMatchesColumns = (
  refetch: () => void,
  serverId: string,
): ColumnDef<MatchesWithMapAndRecords>[] => [
  {
    accessorKey: "map.name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Map"} />
    ),
    cell: ({ row }) => (
      <span
        className="truncate"
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.original.map.name),
        }}
      />
    ),
  },
  {
    accessorKey: "mode",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Mode"} />
    ),
  },
  {
    accessorKey: "_count.records",
    header: () => <span>Records</span>,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Created At"} />
    ),
    cell: ({ row }) => {
      const date = row.original.createdAt;
      return (
        <span>
          {date.toLocaleDateString()} {date.toLocaleTimeString()}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const match = row.original;
      const { data: session } = useSession();
      const [_, startTransition] = useTransition();
      const [isOpen, setIsOpen] = useState(false);
      const [isExportOpen, setIsExportOpen] = useState(false);
      const [isDeleteOpen, setIsDeleteOpen] = useState(false);

      const canActions = hasPermissionSync(
        session,
        routePermissions.servers.records.actions,
        match.serverId,
      );

      const handleDelete = () => {
        if (!canActions) {
          toast.error("You do not have permission to delete this match");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteMatch(match.serverId, match.id);
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("Match successfully deleted");
          } catch (error) {
            toast.error("Error deleting match", {
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
              <DropdownMenuItem onClick={() => setIsOpen(true)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsExportOpen(true)}>
                Export to CSV
              </DropdownMenuItem>
              {canActions && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    Delete match
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canActions && (
            <ConfirmModal
              isOpen={isDeleteOpen}
              onClose={() => setIsDeleteOpen(false)}
              title="Delete Match"
              description="Are you sure you want to delete this match?"
              onConfirm={handleDelete}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <MatchDetailsModal data={match} />
          </Modal>

          <Modal isOpen={isExportOpen} setIsOpen={setIsExportOpen}>
            <ExportMatchModal data={match} serverId={serverId} />
          </Modal>
        </div>
      );
    },
  },
];
