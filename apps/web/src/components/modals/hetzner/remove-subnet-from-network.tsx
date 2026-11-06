"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RemoveSubnetFromNetworkForm from "@/forms/admin/hetzner/network/remove-subnet-from-network-form";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { DefaultModalProps } from "../default-props";

export default function RemoveSubnetFromNetworkModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<{
  projectId: string;
  network: HetznerNetwork;
}>) {
  if (!data) return null;

  const handleSubmit = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Remove Subnet from Network</DialogTitle>
      </DialogHeader>

      <RemoveSubnetFromNetworkForm
        projectId={data.projectId}
        network={data.network}
        callback={handleSubmit}
      />
    </ModalContent>
  );
}
