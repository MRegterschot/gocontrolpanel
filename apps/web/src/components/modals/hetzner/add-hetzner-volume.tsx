"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddHetznerVolumeForm from "@/forms/admin/hetzner/volume/add-hetzner-volume-form";
import { DefaultModalProps } from "../default-props";

export default function AddHetznerVolumeModal({
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
        <DialogTitle>Add Volume</DialogTitle>
      </DialogHeader>

      <AddHetznerVolumeForm projectId={data} callback={handleSubmit} />
    </ModalContent>
  );
}
