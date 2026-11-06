/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { revokeApiKey } from "@/actions/database/api-keys";
import RenameApiKeyModal from "@/components/modals/api-keys/rename-api-key";
import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/utils";
import type { ApiKeyRow } from "@/services/database/api-keys";
import { ServerError } from "@/types/responses";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function apiKeyStatus(key: ApiKeyRow, now = new Date()) {
  if (key.revokedAt) return "Revoked";
  if (key.expiresAt && key.expiresAt <= now) return "Expired";
  return "Active";
}

const formatDate = (date: Date | null, empty: string) =>
  date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString()}` : empty;

interface ColumnOptions {
  // Adds a column naming the server or group a key belongs to
  showTarget?: boolean;
  // Whether this viewer may rename and revoke the listed keys
  canManage: (key: ApiKeyRow) => { rename: boolean; revoke: boolean };
}

export const createApiKeyColumns = (
  refetch: () => void,
  { showTarget = false, canManage }: ColumnOptions,
): ColumnDef<ApiKeyRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "prefix",
    header: "Key",
    cell: ({ row }) => (
      <code className="text-xs text-muted-foreground">
        {row.original.prefix}…
      </code>
    ),
  },
  ...(showTarget
    ? [
        {
          id: "target",
          header: "Belongs to",
          cell: ({ row }) => (
            <span>
              <span className="text-muted-foreground capitalize">
                {row.original.target.type}:{" "}
              </span>
              {row.original.target.name || row.original.target.id}
            </span>
          ),
        } satisfies ColumnDef<ApiKeyRow>,
      ]
    : []),
  {
    accessorKey: "scopes",
    header: "Scopes",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.scopes.map((scope) => (
          <Badge key={scope} variant="secondary" className="font-mono">
            {scope}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = apiKeyStatus(row.original);
      return (
        <Badge variant={status === "Active" ? "default" : "outline"}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "lastUsedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last used" />
    ),
    cell: ({ row }) => formatDate(row.original.lastUsedAt, "Never"),
  },
  {
    accessorKey: "expiresAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expires" />
    ),
    cell: ({ row }) => formatDate(row.original.expiresAt, "Never"),
  },
  {
    id: "createdBy",
    header: "Created by",
    cell: ({ row }) => row.original.createdBy.nickName,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const key = row.original;
      const [, startTransition] = useTransition();
      const [isRevokeOpen, setIsRevokeOpen] = useState(false);
      const [isRenameOpen, setIsRenameOpen] = useState(false);
      const allowed = canManage(key);
      const canRevoke = allowed.revoke && !key.revokedAt;

      if (!allowed.rename && !canRevoke) return null;

      const handleRevoke = () => {
        startTransition(async () => {
          try {
            const { error } = await revokeApiKey(key.id);
            if (error) throw new ServerError(error, "RevokeApiKeyError");
            refetch();
            toast.success("API key revoked");
          } catch (error) {
            toast.error("Failed to revoke API key", {
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
              {allowed.rename && (
                <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                  Rename
                </DropdownMenuItem>
              )}
              {allowed.rename && canRevoke && <DropdownMenuSeparator />}
              {canRevoke && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsRevokeOpen(true)}
                >
                  Revoke
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {canRevoke && (
            <ConfirmModal
              isOpen={isRevokeOpen}
              onClose={() => setIsRevokeOpen(false)}
              onConfirm={handleRevoke}
              title="Revoke API key"
              description={`Anything using ${key.name} stops working immediately. This cannot be undone.`}
              confirmText="Revoke"
              cancelText="Cancel"
            />
          )}

          {allowed.rename && (
            <Modal
              isOpen={isRenameOpen}
              setIsOpen={setIsRenameOpen}
              closeOnBackdropClick={false}
            >
              <RenameApiKeyModal data={key} onSubmit={refetch} />
            </Modal>
          )}
        </div>
      );
    },
  },
];
