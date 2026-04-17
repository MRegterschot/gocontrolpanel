/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import {
  deleteGroup,
  GroupsWithUsersWithServers,
} from "@/actions/database/groups";
import BooleanDisplay from "@/components/boolean-display";
import ConfirmModal from "@/components/modals/confirm-modal";
import EditGroupModal from "@/components/modals/groups/edit-group";
import Modal from "@/components/modals/modal";
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
import { IconCheck, IconX } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export const createColumns = (
  refetch: () => void,
): ColumnDef<GroupsWithUsersWithServers>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Group Name"} />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Description"} />
    ),
  },
  {
    accessorKey: "_count.groupMembers",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Members"} />
    ),
  },
  {
    accessorKey: "public",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Public"} />
    ),
    cell: ({ row }) => (
      <BooleanDisplay
        value={row.getValue("public") as boolean}
        falseIcon={IconX}
        trueIcon={IconCheck}
      />
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
      const group = row.original;
      const { data: session, update } = useSession();
      const [_, startTransition] = useTransition();
      const [isOpen, setIsOpen] = useState(false);
      const [isEditOpen, setIsEditOpen] = useState(false);

      const canEdit = hasPermissionSync(
        session,
        routePermissions.admin.groups.edit,
        group.id,
      );
      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.groups.delete,
        group.id,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete this group.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteGroup(group.id);
            if (error) {
              throw new Error(error);
            }
            refetch();
            update();
            toast.success("Group successfully deleted");
          } catch (error) {
            toast.error("Error deleting group", {
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
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  Edit group
                </DropdownMenuItem>
              )}
              {canEdit && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsOpen(true)}
                >
                  Delete group
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canDelete && (
            <ConfirmModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onConfirm={handleDelete}
              title="Delete group"
              description={`Are you sure you want to delete ${group.name}?`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          {canEdit && (
            <Modal isOpen={isEditOpen} setIsOpen={setIsEditOpen} closeOnBackdropClick={false}>
              <EditGroupModal onSubmit={refetch} data={group} />
            </Modal>
          )}
        </div>
      );
    },
  },
];
