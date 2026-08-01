"use client";

import { removeMapFromJukebox } from "@/actions/gbx/map";
import { DndListColumn } from "@/components/dnd/dnd-list";
import ConfirmModal from "@/components/modals/confirm-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/utils";
import { JukeboxMap } from "@/types/map";
import { ServerError } from "@/types/responses";
import { MoreHorizontal } from "lucide-react";
import { memo, useState, useTransition } from "react";
import { toast } from "sonner";
import { parseTmTags } from "tmtags";

const MapActionsCell = memo(function MapActionsCell({
  data,
  serverId,
  onRemoveMap,
}: {
  data: JukeboxMap;
  serverId?: string;
  onRemoveMap: (map: JukeboxMap) => void;
}) {
  const [_, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  if (!serverId) return null;

  const handleRemove = () => {
    startTransition(async () => {
      try {
        const { error } = await removeMapFromJukebox(serverId, data.id);
        if (error) {
          throw new ServerError(error, "RemoveMapFromJukeboxError");
        }
        onRemoveMap(data);
        toast.success("Map successfully removed");
      } catch (error) {
        toast.error("Error removing map", {
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
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setIsOpen(true)}
          >
            Remove map
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleRemove}
        title="Remove map"
        description="Are you sure you want to remove this map?"
        confirmText="Remove"
        cancelText="Cancel"
      />
    </div>
  );
});

export const createColumns = (
  onRemoveMap: (map: JukeboxMap) => void,
): DndListColumn<JukeboxMap>[] => [
  {
    id: "id",
    cell: () => <></>,
    visibility: false,
  },
  {
    id: "name",
    cell: ({ data }) => (
      <span
        className="truncate"
        dangerouslySetInnerHTML={{ __html: parseTmTags(data.name) }}
      />
    ),
  },
  {
    id: "authorNickname",
    cell: ({ data }) => (
      <span
        className="truncate"
        dangerouslySetInnerHTML={{ __html: parseTmTags(data.authorNickname) }}
      />
    ),
  },
  {
    id: "QueuedByDisplayName",
    cell: ({ data }) => (
      <span
        className="truncate"
        dangerouslySetInnerHTML={{
          __html: parseTmTags(data.QueuedByDisplayName),
        }}
      />
    ),
  },
  {
    id: "actions",
    cell: ({ data, serverId }) => (
      <MapActionsCell
        data={data}
        serverId={serverId}
        onRemoveMap={onRemoveMap}
      />
    ),
  },
];
