/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { deleteHetznerNetwork } from "@/actions/hetzner/networks";
import ConfirmModal from "@/components/modals/confirm-modal";
import AddSubnetToNetworkModal from "@/components/modals/hetzner/add-subnet-to-network";
import HetznerNetworkDetailsModal from "@/components/modals/hetzner/hetzner-network-details";
import RemoveSubnetFromNetworkModal from "@/components/modals/hetzner/remove-subnet-from-network";
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
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export const createNetworksColumns = (
  refetch: () => void,
  data: {
    projectId: string;
  },
): ColumnDef<HetznerNetwork>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Network Name"} />
    ),
  },
  {
    accessorKey: "ip_range",
    header: () => <span>IP Range</span>,
  },
  {
    accessorKey: "subnets",
    header: () => <span>Subnets</span>,
    cell: ({ row }) => {
      const subnets = row.original.subnets
        .map((subnet) => subnet.ip_range)
        .join(", ");
      return <span>{subnets}</span>;
    },
  },
  {
    accessorKey: "servers",
    header: () => <span>Servers</span>,
    cell: ({ row }) => {
      const servers = row.original.servers.join(", ");
      return <span>{servers}</span>;
    },
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
      const network = row.original;
      const { data: session } = useSession();
      const [_, startTransition] = useTransition();
      const [isDeleteOpen, setIsDeleteOpen] = useState(false);
      const [isViewOpen, setIsViewOpen] = useState(false);
      const [isAddSubnetOpen, setIsAddSubnetOpen] = useState(false);
      const [isRemoveSubnetOpen, setIsRemoveSubnetOpen] = useState(false);

      const canCreate = hasPermissionSync(
        session,
        routePermissions.admin.hetzner.servers.create,
        data.projectId,
      );

      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.hetzner.servers.delete,
        data.projectId,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete this network.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteHetznerNetwork(
              data.projectId,
              network.id,
            );
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("Network successfully deleted");
          } catch (error) {
            toast.error("Error deleting network", {
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
              {canCreate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsAddSubnetOpen(true)}>
                    Add Subnet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsRemoveSubnetOpen(true)}>
                    Remove Subnet
                  </DropdownMenuItem>
                </>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    Delete Network
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
              title="Delete network"
              description={`Are you sure you want to delete ${network.name}?`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          <Modal isOpen={isViewOpen} setIsOpen={setIsViewOpen}>
            <HetznerNetworkDetailsModal data={network} />
          </Modal>

          {canCreate && (
            <>
              <Modal isOpen={isAddSubnetOpen} setIsOpen={setIsAddSubnetOpen} closeOnBackdropClick={false}>
                <AddSubnetToNetworkModal
                  onSubmit={refetch}
                  data={{
                    projectId: data.projectId,
                    network,
                  }}
                />
              </Modal>

              <Modal
                isOpen={isRemoveSubnetOpen}
                setIsOpen={setIsRemoveSubnetOpen}
                closeOnBackdropClick={false}
              >
                <RemoveSubnetFromNetworkModal
                  onSubmit={refetch}
                  data={{
                    projectId: data.projectId,
                    network,
                  }}
                />
              </Modal>
            </>
          )}
        </div>
      );
    },
  },
];
