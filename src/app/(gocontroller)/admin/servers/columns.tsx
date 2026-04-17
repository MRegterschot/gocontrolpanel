/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { deleteServer, ServersWithUsers } from "@/actions/database/servers";
import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import EditServerModal from "@/components/modals/servers/edit-server";
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

export const createColumns = (
  refetch: () => void,
): ColumnDef<ServersWithUsers>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
  },
  {
    accessorKey: "host",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Host" />
    ),
  },
  {
    accessorKey: "port",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Port" />
    ),
  },
  {
    accessorKey: "filemanagerUrl",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="File Manager Url" />
    ),
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
      const server = row.original;
      const { data: session } = useSession();
      const [_, startTransition] = useTransition();
      const [isOpen, setIsOpen] = useState(false);
      const [editIsOpen, setEditIsOpen] = useState(false);

      const canEdit = hasPermissionSync(
        session,
        routePermissions.admin.servers.edit,
        server.id,
      );
      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.servers.delete,
        server.id,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete this server.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteServer(server.id);
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("Server successfully deleted");
          } catch (error) {
            toast.error("Error deleting server", {
              description: getErrorMessage(error),
            });
          }
        });
      };

      if (!canEdit && !canDelete) {
        return null;
      }

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
              {canEdit && (
                <DropdownMenuItem onClick={() => setEditIsOpen(true)}>
                  Edit server
                </DropdownMenuItem>
              )}
              {canEdit && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsOpen(true)}
                >
                  Delete server
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canDelete && (
            <ConfirmModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onConfirm={handleDelete}
              title="Delete server"
              description="Are you sure you want to delete this server?"
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          {canEdit && (
            <Modal isOpen={editIsOpen} setIsOpen={setEditIsOpen} closeOnBackdropClick={false}>
              <EditServerModal data={server} onSubmit={refetch} />
            </Modal>
          )}
        </div>
      );
    },
  },
];
