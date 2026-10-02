/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import { MapsWithRecords } from "@/actions/database/maps";
import Modal from "@/components/modals/modal";
import MapRecordsModal from "@/components/modals/records/map-records";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import TimeDisplay from "@/components/time-display";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { parseTmTags } from "tmtags";

export const createMapsColumns = (): ColumnDef<MapsWithRecords>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Name"} />
    ),
    cell: ({ row }) => (
      <span
        className="truncate"
        dangerouslySetInnerHTML={{
          __html: parseTmTags(row.original.name),
        }}
      />
    ),
  },
  {
    accessorKey: "authorNickname",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={"Author"} />
    ),
  },
  {
    accessorKey: "records",
    header: () => <span>Records</span>,
    cell: ({ row }) => row.original.records.length,
  },
  {
    accessorKey: "records.time",
    header: () => <span>Local Record</span>,
    cell: ({ row }) => (
      <TimeDisplay time={row.original.records[0]?.time ?? null} />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const map = row.original;
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
              <DropdownMenuItem onClick={() => setIsOpen(true)}>
                View details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <MapRecordsModal data={map} />
          </Modal>
        </div>
      );
    },
  },
];
