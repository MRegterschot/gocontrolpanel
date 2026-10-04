"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ECMForm from "@/forms/server/plugins/ecm/ecm-form";
import { exportServerPluginConfig } from "@/lib/api-client/database";
import { getErrorMessage } from "@/lib/utils";
import { ECMPluginConfig } from "@/types/plugins/ecm";
import { ServerError } from "@/types/responses";
import { IconDownload } from "@tabler/icons-react";
import { toast } from "sonner";
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

  const handleSubmit = (config: ECMPluginConfig) => {
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
      a.download = `ecm-plugin-config-${serverId}.json`;
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
        <DialogTitle>eCircuitMania Plugin</DialogTitle>

        <div className="flex gap-2 items-center">
          <Button size={"icon"} variant={"outline"} onClick={handleExport}>
            <IconDownload />
          </Button>
        </div>
      </DialogHeader>

      <ECMForm
        serverId={serverId}
        pluginId={data?.pluginId}
        config={data?.config}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </ModalContent>
  );
}
