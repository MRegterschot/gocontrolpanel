"use client";

import { deleteUserById } from "@/actions/database/users";
import ConfirmModal from "@/components/modals/confirm-modal";
import EditUserModal from "@/components/modals/edit-user";
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
import { Users } from "@/lib/prisma/generated";
import { getErrorMessage } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
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
    accessorKey: "roles",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Roles"} />
    ),
    cell: ({ row }) => {
      const roles = row.getValue("roles") as string[];
      // Capitalize the first letter of each role
      const formattedRoles = roles
        .map((role) => role.charAt(0).toUpperCase() + role.slice(1))
        .join(", ");
      return <span>{formattedRoles}</span>;
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Joined"} />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      const [_, startTransition] = useTransition();
      const [isOpen, setIsOpen] = useState(false);
      const [isEditOpen, setIsEditOpen] = useState(false);

      const handleDelete = () => {
        startTransition(async () => {
          try {
            const { error } = await deleteUserById(user.id);
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("Player successfully deleted");
          } catch (error) {
            toast.error("Error deleting user", {
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
              <DropdownMenuItem>View user</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                Edit user
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setIsOpen(true)}
              >
                Delete user
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ConfirmModal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onConfirm={handleDelete}
            title="Delete user"
            description={`Are you sure you want to delete ${user.nickName}?`}
            confirmText="Delete"
            cancelText="Cancel"
          />

          <Modal
            isOpen={isEditOpen}
            setIsOpen={setIsEditOpen}
            onClose={() => refetch()}
          >
            <EditUserModal data={user} />
          </Modal>
        </div>
      );
    },
  },
];
