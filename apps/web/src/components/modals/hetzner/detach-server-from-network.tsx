"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DetachServerFromNetworkForm from "@/forms/admin/hetzner/server/detach-server-from-network-form";
import { DefaultModalProps } from "../default-props";

export default function DetachServerFromNetworkModal({
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
        <DialogTitle>Detach Server from Network</DialogTitle>
      </DialogHeader>

      <DetachServerFromNetworkForm
        projectId={data.projectId}
        serverId={data.serverId}
        callback={handleSubmit}
      />
    </ModalContent>
  );
}
