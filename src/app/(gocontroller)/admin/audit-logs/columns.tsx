/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import {
  AuditLogsWithUsers,
  deleteAuditLogById,
} from "@/actions/database/audit-logs";
import BooleanDisplay from "@/components/boolean-display";
import AuditLogDetailsModal from "@/components/modals/audit-logs/audit-log-details";
import ConfirmModal from "@/components/modals/confirm-modal";
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
import { ServerError } from "@/types/responses";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";

export const createColumns = (
  refetch: () => void,
): ColumnDef<AuditLogsWithUsers>[] => [
  {
    accessorKey: "action",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Action"} />
    ),
  },
  {
    accessorKey: "user.nickName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"User"} />
    ),
    cell: ({ row }) => (
      <span
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.original.user?.nickName || "Unknown"),
        }}
      />
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Timestamp"} />
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
    accessorKey: "error",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Error"} />
    ),
    cell: ({ row }) => <BooleanDisplay value={!!row.original.error} />,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const auditLog = row.original;
      const { data: session } = useSession();
      const [_, startTransition] = useTransition();
      const [isOpen, setIsOpen] = useState(false);
      const [isDeleteOpen, setIsDeleteOpen] = useState(false);

      const canDelete = hasPermissionSync(
        session,
        routePermissions.admin.auditLogs.delete,
        auditLog.targetId,
      );

      const handleDelete = () => {
        if (!canDelete) {
          toast.error("You do not have permission to delete this log.");
          return;
        }

        startTransition(async () => {
          try {
            const { error } = await deleteAuditLogById(auditLog.id);
            if (error) {
              throw new ServerError(error, "DeleteAuditLogError");
            }
            refetch();
            toast.success("Log successfully deleted");
          } catch (error) {
            toast.error("Error deleting log", {
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
                View log
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    Delete log
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
              title="Delete log"
              description={`Are you sure you want to delete this log?`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          )}

          <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <AuditLogDetailsModal data={auditLog} />
          </Modal>
        </div>
      );
    },
  },
];
