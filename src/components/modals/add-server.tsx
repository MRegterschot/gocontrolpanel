"use client";
import AddServerForm from "@/forms/admin/server/add-server-form";
import { HetznerServerCache } from "@/types/api/hetzner/servers";
import { IconX } from "@tabler/icons-react";
import { Card } from "../ui/card";
import { DefaultModalProps } from "./default-props";

export default function AddServerModal({
  data,
  onSubmit,
  closeModal,
}: DefaultModalProps<HetznerServerCache[]>) {
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
        <h1 className="text-xl font-bold">Add Server</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <AddServerForm callback={handleSubmit} recentlyCreatedServers={data} />
    </Card>
  );
}
