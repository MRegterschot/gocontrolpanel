"use client";

import { Card } from "@/components/ui/card";
import ECMForm from "@/forms/server/interface/ecm/ecm-form";
import { ECMPluginConfig } from "@/types/plugins/ecm";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function EcircuitmaniaPluginModal({
  serverId,
  data,
  closeModal,
  onSubmit,
}: DefaultModalProps<
  {
    pluginId: string;
    config: ECMPluginConfig;
  },
  ECMPluginConfig
>) {
  if (!serverId || !data || !data.pluginId) {
    return null;
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSubmit = (config: ECMPluginConfig) => {
    closeModal?.();
    onSubmit?.(config);
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">eCircuitMania Plugin</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <ECMForm
        serverId={serverId}
        pluginId={data?.pluginId}
        config={data?.config}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </Card>
  );
}
