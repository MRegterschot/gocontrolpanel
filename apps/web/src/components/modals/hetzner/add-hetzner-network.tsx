"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddHetznerNetworkForm from "@/forms/admin/hetzner/network/add-hetzner-network-form";
import { DefaultModalProps } from "../default-props";

export default function AddHetznerNetworkModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<string>) {
  if (!data) return null;

  const handleSubmit = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Add Network</DialogTitle>
      </DialogHeader>

      <AddHetznerNetworkForm projectId={data} callback={handleSubmit} />
    </ModalContent>
  );
}
