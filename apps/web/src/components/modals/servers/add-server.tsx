"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddServerForm from "@/forms/admin/server/add-server-form";
import { HetznerServerCache } from "@/types/api/hetzner/servers";
import { DefaultModalProps } from "../default-props";

export default function AddServerModal({
  data,
  onSubmit,
  closeModal,
}: DefaultModalProps<HetznerServerCache[]>) {
  const handleSubmit = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Add Server</DialogTitle>
      </DialogHeader>

      <AddServerForm callback={handleSubmit} recentlyCreatedServers={data} />
    </ModalContent>
  );
}
