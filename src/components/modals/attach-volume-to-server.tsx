"use client";
import AttachVolumeToServerForm from "@/forms/admin/hetzner/server/attach-volume-to-server-form";
import { IconX } from "@tabler/icons-react";
import { Card } from "../ui/card";
import { DefaultModalProps } from "./default-props";

export default function AttachVolumeToServerModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<{
  projectId: string;
  serverId: number;
  locationId: number;
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
        <h1 className="text-xl font-bold">Attach Volume to Server</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <AttachVolumeToServerForm
        projectId={data.projectId}
        serverId={data.serverId}
        locationId={data.locationId}
        callback={handleSubmit}
      />
    </Card>
  );
}
