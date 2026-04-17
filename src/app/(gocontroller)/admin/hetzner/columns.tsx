/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import {
  deleteHetznerProject,
  HetznerProjectsWithUsers,
} from "@/actions/database/hetzner-projects";
import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import EditProjectModal from "@/components/modals/projects/edit-project";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage, getList, hasPermissionSync } from "@/lib/utils";
import { routePermissions } from "@/routes";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export const createColumns = (
  refetch: () => void,
): ColumnDef<HetznerProjectsWithUsers>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Project Name" />
    ),
  },
  {
    accessorKey: "apiTokens",
    header: "API Tokens",
    cell: ({ row }) => {
      const tokens = getList(row.original.apiTokens);
      return <span>{tokens.length}</span>;
    },
  },
  {
    accessorKey: "_count.hetznerProjectUsers",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Users" />
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
      const project = row.original;
      const { data: session } = useSession();
      const router = useRouter();
      const [_, startTransition] = useTransition();
      const [isOpen, setIsOpen] = useState(false);
      const [isEditOpen, setIsEditOpen] = useState(false);

      const canView = hasPermissionSync(
        session,
        routePermissions.admin.hetzner.servers.view,
        project.id,
      );
      const canEdit = hasPermissionSync(
        session,
        routePermissions.admin.hetzner.edit,
        project.id,
      );
      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.hetzner.delete,
        project.id,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete this project.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteHetznerProject(project.id);
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("Project successfully deleted");
          } catch (error) {
            toast.error("Error deleting project", {
              description: getErrorMessage(error),
            });
          }
        });
      };

      if (!canView && !canEdit && !canDelete) {
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
              {canView && (
                <DropdownMenuItem
                  disabled={getList(project.apiTokens).length === 0}
                  onClick={() => router.push(`/admin/hetzner/${project.id}`)}
                >
                  View project
                </DropdownMenuItem>
              )}

              {canEdit && (
                <>
                  {canView && <DropdownMenuSeparator />}
                  <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                    Edit project
                  </DropdownMenuItem>
                </>
              )}

              {canDelete && (
                <>
                  {(canView || canEdit) && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setIsOpen(true)}
                  >
                    Delete project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canDelete && (
            <ConfirmModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onConfirm={handleDelete}
              title="Delete project"
              description={`Are you sure you want to delete ${project.name}? Deleting a project does not delete the servers in it. You can manage those servers again when you create a new project with the same API Token.`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          {canEdit && (
            <Modal isOpen={isEditOpen} setIsOpen={setIsEditOpen} closeOnBackdropClick={false}>
              <EditProjectModal data={project} onSubmit={refetch} />
            </Modal>
          )}
        </div>
      );
    },
  },
];
