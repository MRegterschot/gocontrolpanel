"use client";

import AddHetznerDatabaseModal from "@/components/modals/hetzner/add-hetzner-database";
import AddServerSetupModal from "@/components/modals/hetzner/add-server-setup";
import Modal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export const createServerActions = (
  refetch: () => void,
  args?: {
    id: string;
  },
) => {
  return (
    <div className="flex gap-2">
      <Modal closeOnBackdropClick={false}>
        <AddHetznerDatabaseModal data={args?.id} onSubmit={refetch} />
        <Button collapse="sm" variant={"outline"}>
          <IconPlus />
          Add Database
        </Button>
      </Modal>
      <Modal closeOnBackdropClick={false}>
        <AddServerSetupModal data={args?.id} onSubmit={refetch} />
        <Button collapse="sm">
          <IconPlus />
          Add Server
        </Button>
      </Modal>
    </div>
  );
};
