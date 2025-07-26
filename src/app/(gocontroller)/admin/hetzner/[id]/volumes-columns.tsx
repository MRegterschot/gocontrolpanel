"use client";

import { deleteHetznerVolume } from "@/actions/hetzner/volumes";
import ConfirmModal from "@/components/modals/confirm-modal";
import HetznerVolumeDetailsModal from "@/components/modals/hetzner-volume-details";
import Modal from "@/components/modals/modal";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { getErrorMessage, hasPermissionSync } from "@/lib/utils";
import { routePermissions } from "@/routes";
import { HetznerVolume } from "@/types/api/hetzner/volumes";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export const createVolumesColumns = (
  refetch: () => void,
  data: {
    projectId: string;
  },
): ColumnDef<HetznerVolume>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Volume Name"} />
    ),
  },
  {
    accessorKey: "status",
    header: () => <span>Status</span>,
  },
  {
    accessorKey: "server",
    header: () => <span>Server</span>,
  },
  {
    accessorKey: "location",
    header: () => <span>Location</span>,
    cell: ({ row }) => (
      <span>{row.original.location.name}</span>
    )
  },
  {
    accessorKey: "size",
    header: () => <span>Size</span>,
  },
  {
    accessorKey: "created",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Created At"} />
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.created);
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
      const volume = row.original;
      const { data: session } = useSession();
      const [_, startTransition] = useTransition();
      const [isDeleteOpen, setIsDeleteOpen] = useState(false);
      const [isViewOpen, setIsViewOpen] = useState(false);

      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.hetzner.servers.delete,
        data.projectId,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete this volume.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteHetznerVolume(
              data.projectId,
              volume.id,
            );
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("Volume successfully deleted");
          } catch (error) {
            toast.error("Error deleting volume", {
              description: getErrorMessage(error),
            });
          }
        });
      };

      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={"ghost"} className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsViewOpen(true)}>
                View Details
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <Separator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    Delete Volume
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canDelete && (
            <ConfirmModal
              isOpen={isDeleteOpen}
              onClose={() => setIsDeleteOpen(false)}
              onConfirm={handleDelete}
              title="Delete volume"
              description={`Are you sure you want to delete ${volume.name}?`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          <Modal isOpen={isViewOpen} setIsOpen={setIsViewOpen}>
            <HetznerVolumeDetailsModal data={volume} />
          </Modal>
        </div>
      );
    },
  },
];
