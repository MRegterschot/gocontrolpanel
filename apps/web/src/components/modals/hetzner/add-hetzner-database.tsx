"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddHetznerDatabaseForm from "@/forms/admin/hetzner/database/add-hetzner-database-form";
import { DefaultModalProps } from "../default-props";

export default function AddHetznerDatabaseModal({
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
        <DialogTitle>Add Database</DialogTitle>
      </DialogHeader>

      <AddHetznerDatabaseForm projectId={data} callback={handleSubmit} />
    </ModalContent>
  );
}
