"use client";

import AddHetznerVolumeModal from "@/components/modals/hetzner/add-hetzner-volume";
import Modal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export const createVolumeActions = (
  refetch: () => void,
  args?: {
    id: string;
  },
) => {
  return (
    <Modal closeOnBackdropClick={false}>
      <AddHetznerVolumeModal data={args?.id} onSubmit={refetch} />
      <Button className="w-9 sm:w-auto">
        <IconPlus />
        <span className="hidden sm:inline">Add Volume</span>
      </Button>
    </Modal>
  );
};
