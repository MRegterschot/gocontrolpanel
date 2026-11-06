"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddSubnetToNetworkForm from "@/forms/admin/hetzner/network/add-subnet-to-network-form";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { DefaultModalProps } from "../default-props";

export default function AddSubnetToNetworkModal({
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
        <DialogTitle>Add Subnet to Network</DialogTitle>
      </DialogHeader>

      <AddSubnetToNetworkForm
        projectId={data.projectId}
        network={data.network}
        callback={handleSubmit}
      />
    </ModalContent>
  );
}
