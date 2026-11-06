"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditServerForm from "@/forms/admin/server/edit-server-form";
import type { ServersWithUsers } from "@/services/database/servers";
import { DefaultModalProps } from "../default-props";

export default function EditServerModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<ServersWithUsers>) {
  if (!data) return null;

  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Edit {data.name}</DialogTitle>
      </DialogHeader>
      <EditServerForm server={data} callback={handleCallback} />
    </ModalContent>
  );
}
