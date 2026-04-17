/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { deleteRole } from "@/actions/database/roles";
import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import EditRoleModal from "@/components/modals/roles/edit-role";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Roles } from "@/lib/prisma/generated";
import { getErrorMessage, hasPermissionSync } from "@/lib/utils";
import { routePermissions } from "@/routes";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export const createColumns = (refetch: () => void): ColumnDef<Roles>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Name"} />
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Description"} />
    ),
  },
  {
    accessorKey: "permissions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Permissions"} />
    ),
    cell: ({ row }) => {
      const permissions = row.getValue("permissions") as string[];

      return (
        <span className="truncate">
          {permissions.map((perm: string, index: number) => (
            <span key={index} className="mr-1">
              {perm}
              {index < permissions.length - 1 ? ", " : ""}
            </span>
          ))}
        </span>
      );
    },
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
      const role = row.original;
      const { data: session } = useSession();
      const [_, startTransition] = useTransition();
      const [isOpen, setIsOpen] = useState(false);
      const [isEditOpen, setIsEditOpen] = useState(false);

      const canEdit = hasPermissionSync(
        session,
        routePermissions.admin.roles.edit,
      );
      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.roles.delete,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete roles.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteRole(role.id);
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("Role successfully deleted");
          } catch (error) {
            toast.error("Error deleting role", {
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
                  Edit role
                </DropdownMenuItem>
              )}
              {canEdit && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsOpen(true)}
                >
                  Delete role
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canDelete && (
            <ConfirmModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onConfirm={handleDelete}
              title="Delete role"
              description={`Are you sure you want to delete ${role.name}?`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          {canEdit && (
            <Modal isOpen={isEditOpen} setIsOpen={setIsEditOpen} closeOnBackdropClick={false}>
              <EditRoleModal onSubmit={refetch} data={role} />
            </Modal>
          )}
        </div>
      );
    },
  },
];
