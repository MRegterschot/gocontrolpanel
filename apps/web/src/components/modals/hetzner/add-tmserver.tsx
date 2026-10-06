"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TMServerForm from "@/forms/admin/hetzner/setup-steps/tm-server/tm-server-form";
import { DefaultModalProps } from "../default-props";

export default function AddTrackmaniaServerModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<{
  projectId: string;
  serverId: number;
}>) {
  if (!data) return null;

  const handleSubmit = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Add Trackmania Server</DialogTitle>
      </DialogHeader>

      <TMServerForm
        projectId={data.projectId}
        serverId={data.serverId}
        callback={handleSubmit}
      />
    </ModalContent>
  );
}
