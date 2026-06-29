"use client";

import AddHetznerNetworkModal from "@/components/modals/hetzner/add-hetzner-network";
import Modal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export const createNetworkActions = (
  refetch: () => void,
  args?: {
    id: string;
  },
) => {
  return (
    <Modal closeOnBackdropClick={false}>
      <AddHetznerNetworkModal data={args?.id} onSubmit={refetch} />
      <Button className="w-9 sm:w-auto">
        <IconPlus />
        <span className="hidden sm:inline">Add Network</span>
      </Button>
    </Modal>
  );
};
