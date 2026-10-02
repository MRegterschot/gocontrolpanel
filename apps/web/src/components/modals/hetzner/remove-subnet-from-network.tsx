"use client";
import RemoveSubnetFromNetworkForm from "@/forms/admin/hetzner/network/remove-subnet-from-network-form";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { IconX } from "@tabler/icons-react";
import { Card } from "../../ui/card";
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

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSubmit = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Remove Subnet from Network</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <RemoveSubnetFromNetworkForm
        projectId={data.projectId}
        network={data.network}
        callback={handleSubmit}
      />
    </Card>
  );
}
