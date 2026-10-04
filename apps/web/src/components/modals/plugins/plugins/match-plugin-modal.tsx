"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MatchForm from "@/forms/server/plugins/match/match-form";
import { exportServerPluginConfig } from "@/lib/api-client/database";
import { getErrorMessage } from "@/lib/utils";
import { MatchPluginConfig } from "@/types/plugins/match";
import { ServerError } from "@/types/responses";
import { IconDownload } from "@tabler/icons-react";
import { toast } from "sonner";
import { DefaultModalProps } from "../../default-props";

export default function MatchPluginModal({
  serverId,
  data,
  closeModal,
  onSubmit,
}: DefaultModalProps<
  {
    pluginId: string;
    config: MatchPluginConfig;
  },
  MatchPluginConfig
>) {
  if (!serverId || !data || !data.pluginId) {
    return null;
  }

  const handleSubmit = (config: MatchPluginConfig) => {
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
      a.download = `match-plugin-config-${serverId}.json`;
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
        <DialogTitle>Match Plugin</DialogTitle>

        <div className="flex gap-2 items-center">
          <Button size={"icon"} variant={"outline"} onClick={handleExport}>
            <IconDownload />
          </Button>
        </div>
      </DialogHeader>

      <MatchForm
        serverId={serverId}
        pluginId={data?.pluginId}
        config={data?.config}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </ModalContent>
  );
}
