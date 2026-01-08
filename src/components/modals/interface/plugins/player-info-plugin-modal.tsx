"use client";

import { Card } from "@/components/ui/card";
import PlayerInfoForm from "@/forms/server/interface/player-info/player-info-form";
import { PlayerInfoPluginConfig } from "@/types/plugins/player-info";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function PlayerInfoPluginModal({
  serverId,
  data,
  closeModal,
  onSubmit,
}: DefaultModalProps<
  {
    pluginId: string;
    config: PlayerInfoPluginConfig;
  },
  PlayerInfoPluginConfig
>) {
  if (!serverId || !data || !data.pluginId) {
    return null;
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSubmit = (config: PlayerInfoPluginConfig) => {
    closeModal?.();
    onSubmit?.(config);
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Player Info Plugin</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <PlayerInfoForm
        serverId={serverId}
        pluginId={data?.pluginId}
        config={data?.config}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </Card>
  );
}
