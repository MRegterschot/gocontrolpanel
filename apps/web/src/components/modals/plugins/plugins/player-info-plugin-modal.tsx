"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PlayerInfoForm from "@/forms/server/plugins/player-info/player-info-form";
import { exportServerPluginConfig } from "@/lib/api-client/database";
import { getErrorMessage } from "@/lib/utils";
import { PlayerInfoPluginConfig } from "@/types/plugins/player-info";
import { ServerError } from "@/types/responses";
import { IconDownload } from "@tabler/icons-react";
import { toast } from "sonner";
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

  const handleSubmit = (config: PlayerInfoPluginConfig) => {
    closeModal?.();
    onSubmit?.(config);
  };

  const handleExport = async () => {
    try {
      const { data: pluginConfig, error } = await exportServerPluginConfig(
        serverId,
        data.pluginId,
      );
      if (error) {
        throw new ServerError(error, "ExportServerPluginConfigError");
      }

      const blob = new Blob([JSON.stringify(pluginConfig, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `player-info-plugin-config-${serverId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to export plugin config", {
        description: getErrorMessage(err),
      });
    }
  };

  return (
    <ModalContent>
      <DialogHeader className="flex-row flex-wrap items-center justify-between pr-6">
        <DialogTitle>Player Info Plugin</DialogTitle>
        <div className="flex gap-2 items-center">
          <Button size={"icon"} variant={"outline"} onClick={handleExport}>
            <IconDownload />
          </Button>
        </div>
      </DialogHeader>

      <PlayerInfoForm
        serverId={serverId}
        pluginId={data?.pluginId}
        config={data?.config}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </ModalContent>
  );
}
