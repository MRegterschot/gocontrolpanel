/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { deleteUserById } from "@/actions/database/users";
import BooleanDisplay from "@/components/boolean-display";
import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import EditUserModal from "@/components/modals/users/edit-user";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users } from "@/lib/prisma/generated";
import { getErrorMessage, getList, hasPermissionSync } from "@/lib/utils";
import { routePermissions } from "@/routes";
import { IconCheck, IconX } from "@tabler/icons-react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";

export const createColumns = (refetch: () => void): ColumnDef<Users>[] => [
  {
    accessorKey: "nickName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Nickname"} />
    ),
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.original.nickName),
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
    accessorKey: "admin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Admin"} />
    ),
    cell: ({ row }) => (
      <BooleanDisplay
        value={row.original.admin}
        falseIcon={IconX}
        trueIcon={IconCheck}
      />
    ),
  },
  {
    accessorKey: "permissions",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Permissions"} />
    ),
    cell: ({ row }) => {
      const permissions = getList<string>(row.original.permissions)
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
      <DataTableColumnHeader column={column} title={"Joined"} />
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
      const user = row.original;
      const { data: session } = useSession();
      const [_, startTransition] = useTransition();
      const [isOpen, setIsOpen] = useState(false);
      const [isEditOpen, setIsEditOpen] = useState(false);

      const canEdit = hasPermissionSync(
        session,
        routePermissions.admin.users.edit,
      );
      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.users.delete,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete this user.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteUserById(user.id);
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("User successfully deleted");
          } catch (error) {
            toast.error("Error deleting user", {
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
                  Edit user
                </DropdownMenuItem>
              )}
              {canEdit && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsOpen(true)}
                >
                  Delete user
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canDelete && (
            <ConfirmModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onConfirm={handleDelete}
              title="Delete user"
              description={`Are you sure you want to delete ${user.nickName}?`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          {canEdit && (
            <Modal isOpen={isEditOpen} setIsOpen={setIsEditOpen} closeOnBackdropClick={false}>
              <EditUserModal data={user} onSubmit={refetch} />
            </Modal>
          )}
        </div>
      );
    },
  },
];
