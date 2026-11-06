"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AttachHetznerServerToNetworkForm from "@/forms/admin/hetzner/server/attach-hetzner-server-to-network-form";
import { DefaultModalProps } from "../default-props";

export default function AttachHetznerServerToNetworkModal({
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
        <DialogTitle>Attach Server to Network</DialogTitle>
      </DialogHeader>

      <AttachHetznerServerToNetworkForm
        projectId={data.projectId}
        serverId={data.serverId}
        callback={handleSubmit}
      />
    </ModalContent>
  );
}
