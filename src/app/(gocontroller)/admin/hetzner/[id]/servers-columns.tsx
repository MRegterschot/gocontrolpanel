/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { addSimpleServerSetup } from "@/actions/hetzner/server-setup";
import { deleteHetznerServer } from "@/actions/hetzner/servers";
import ConfirmModal from "@/components/modals/confirm-modal";
import AttachHetznerServerToNetworkModal from "@/components/modals/hetzner/attach-hetzner-server-to-network";
import DetachServerFromNetworkModal from "@/components/modals/hetzner/detach-server-from-network";
import HetznerDatabaseDetailsModal from "@/components/modals/hetzner/hetzner-database-details";
import HetznerServerDetailsModal from "@/components/modals/hetzner/hetzner-server-details";
import HetznerServerMetricsModal from "@/components/modals/hetzner/hetzner-server-metrics";
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
import { HetznerServer } from "@/types/api/hetzner/servers";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export const createServersColumns = (
  refetch: () => void,
  data: {
    projectId: string;
  },
): ColumnDef<HetznerServer>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Server Name"} />
    ),
  },
  {
    accessorKey: "labels",
    header: () => <span>Type</span>,
    cell: ({ row }) => {
      const labels = row.original.labels || {};
      const type = labels.type;
      switch (type) {
        case "dedi":
          const controllerType = labels["servercontroller.type"];
          if (controllerType) {
            return <span>Dedicated - Controller ({controllerType})</span>;
          }
          return <span>Dedicated</span>;
        case "database":
          return <span>Database ({labels["database.type"]})</span>;
        default:
          return <span>Unknown</span>;
      }
    },
  },
  {
    accessorKey: "tm_servers",
    header: () => <span>TM Servers</span>,
    cell: ({ row }) => {
      const labels = row.original.labels || {};

      // If there is a label that starts with authorization, return 1
      if (Object.keys(labels).some((key) => key.startsWith("authorization"))) {
        return <span>1</span>;
      }

      // Count all the labels that start with a number, only count unique numbers
      const serverCounts: Record<string, number> = {};
      Object.keys(labels).forEach((key) => {
        const match = key.match(/^(\d+)\./);
        if (match) {
          const serverNumber = match[1];
          serverCounts[serverNumber] = (serverCounts[serverNumber] || 0) + 1;
        }
      });
      const uniqueServerNumbers = Object.keys(serverCounts).length;

      return <span>{uniqueServerNumbers}</span>;
    },
  },
  {
    accessorKey: "status",
    header: () => <span>Status</span>,
  },
  {
    accessorKey: "public_net.ipv4.ip",
    header: () => <span>Public IP</span>,
  },
  {
    accessorKey: "private_net",
    header: () => <span>Private IPs</span>,
    cell: ({ row }) => {
      const privateNet = row.original.private_net || [];
      return (
        <span>
          {privateNet.length > 0 && privateNet.map((net) => net.ip).join(", ")}
        </span>
      );
    },
  },
  {
    accessorKey: "server_type.name",
    header: () => <span>Server Type</span>,
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
      const server = row.original;
      const { data: session } = useSession();
      const [_, startTransition] = useTransition();
      const [isDeleteOpen, setIsDeleteOpen] = useState(false);
      const [isViewOpen, setIsViewOpen] = useState(false);
      const [isMetricsOpen, setIsMetricsOpen] = useState(false);
      const [isAttachOpen, setIsAttachOpen] = useState(false);
      const [isDetachOpen, setIsDetachOpen] = useState(false);

      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.hetzner.servers.delete,
        data.projectId,
      );

      const canCreate = hasPermissionSync(
        session,
        routePermissions.admin.hetzner.servers.create,
        data.projectId,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete this server.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteHetznerServer(
              data.projectId,
              server.id,
            );
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

      const getDetailsModal = () => {
        switch (server.labels.type) {
          case "dedi":
            return <HetznerServerDetailsModal data={server} />;
          case "database":
            return <HetznerDatabaseDetailsModal data={server} />;
          default:
            return <HetznerServerDetailsModal data={server} />;
        }
      };

      const handleAddServer = () => {
        if (!canCreate) {
          toast.error("You do not have permission to add this server.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await addSimpleServerSetup(
              data.projectId,
              server.id,
            );
            if (error) {
              throw new Error(error);
            }
            refetch();
            toast.success("Server successfully added");
          } catch (error) {
            toast.error("Error adding server", {
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
              <DropdownMenuItem onClick={() => setIsMetricsOpen(true)}>
                View Metrics
              </DropdownMenuItem>
              {canCreate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAddServer}>
                    Add Server Setup
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsAttachOpen(true)}>
                    Attach to Network
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsDetachOpen(true)}>
                    Detach from Network
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
                    Delete Server
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
              title="Delete server"
              description={`Are you sure you want to delete ${server.name}?`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          <Modal isOpen={isViewOpen} setIsOpen={setIsViewOpen}>
            {getDetailsModal()}
          </Modal>

          <Modal isOpen={isMetricsOpen} setIsOpen={setIsMetricsOpen}>
            <HetznerServerMetricsModal
              closeModal={() => setIsMetricsOpen(false)}
              data={{
                projectId: data.projectId,
                serverId: server.id,
              }}
            />
          </Modal>

          {canCreate && (
            <>
              <Modal isOpen={isAttachOpen} setIsOpen={setIsAttachOpen}>
                <AttachHetznerServerToNetworkModal
                  onSubmit={refetch}
                  data={{
                    projectId: data.projectId,
                    serverId: server.id,
                  }}
                />
              </Modal>

              <Modal isOpen={isDetachOpen} setIsOpen={setIsDetachOpen}>
                <DetachServerFromNetworkModal
                  onSubmit={refetch}
                  data={{
                    projectId: data.projectId,
                    serverId: server.id,
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
