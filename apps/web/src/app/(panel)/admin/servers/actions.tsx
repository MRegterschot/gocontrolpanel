"use client";

import Modal from "@/components/modals/modal";
import AddServerModal from "@/components/modals/servers/add-server";
import { Button } from "@/components/ui/button";
import { HetznerServerCache } from "@/types/api/hetzner/servers";
import { IconPlus } from "@tabler/icons-react";

export const createActions = (
  refetch: () => void,
  args?: {
    recentlyCreatedServers: HetznerServerCache[];
  },
) => {
  return (
    <Modal closeOnBackdropClick={false}>
      <AddServerModal data={args?.recentlyCreatedServers} onSubmit={refetch} />
      <Button className="w-9 sm:w-auto relative">
        <IconPlus />
        <span className="hidden sm:inline">Add Server</span>
        {args?.recentlyCreatedServers &&
          args.recentlyCreatedServers.length > 0 && (
            <span className="absolute -top-1 -right-1 h-3 w-3 text-center rounded-full bg-destructive text-[8px]">
              {args.recentlyCreatedServers.length}
            </span>
          )}
      </Button>
    </Modal>
  );
};
