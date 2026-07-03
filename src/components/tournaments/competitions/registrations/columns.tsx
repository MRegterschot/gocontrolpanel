"use client";

import ConfirmModal from "@/components/modals/confirm-modal";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Registration } from "@/hooks/tournaments/competitions/registrations/use-registrations";
import { reducers } from "@/lib/server-manager";
import { RegistrationStatus } from "@/lib/server-manager/types";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { useReducer } from "spacetimedb/react";

export const createColumnns = (
  registrationStatus?: RegistrationStatus,
): ColumnDef<Registration>[] => {
  const columns: ColumnDef<Registration>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={"Name"} />
      ),
    },
    {
      accessorKey: "registeredAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={"Registered At"} />
      ),
      cell: ({ row }) => (
        <span>
          {row.original.registeredAt.toDate().toLocaleDateString()}{" "}
          {row.original.registeredAt.toDate().toLocaleTimeString()}
        </span>
      ),
    },
  ];

  if (registrationStatus?.tag === RegistrationStatus.Ongoing.tag) {
    columns.push({
      id: "actions",
      cell: ({ row }) => {
        const registration = row.original;

        const unregisterPlayer = useReducer(reducers.unregisterPlayer);

        const [isOpen, setIsOpen] = useState(false);

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
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsOpen(true)}
                >
                  Unregister player
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onConfirm={() => {
                unregisterPlayer({
                  registrationId: registration.registrationId,
                  player: registration.userId,
                });
                setIsOpen(false);
              }}
              title="Unregister player"
              description={`Are you sure you want to unregister ${registration.name}?`}
              confirmText="Delete"
              cancelText="Cancel"
            />
          </div>
        );
      },
    });
  }

  return columns;
};
