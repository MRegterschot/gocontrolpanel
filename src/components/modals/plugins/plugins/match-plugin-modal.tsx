"use client";

import { exportServerPluginConfig } from "@/actions/database/server-plugins";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import MatchForm from "@/forms/server/plugins/match/match-form";
import { getErrorMessage } from "@/lib/utils";
import { MatchPluginConfig } from "@/types/plugins/match";
import { IconDownload, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { DefaultModalProps } from "../../default-props";
import { ServerError } from "@/types/responses";

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

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

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
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Match Plugin</h1>

        <div className="flex gap-2 items-center">
          <Button size={"icon"} variant={"outline"} onClick={handleExport}>
            <IconDownload />
          </Button>

          <IconX
            className="h-6 w-6 cursor-pointer text-muted-foreground ml-2"
            onClick={closeModal}
          />
        </div>
      </div>

      <MatchForm
        serverId={serverId}
        pluginId={data?.pluginId}
        config={data?.config}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </Card>
  );
}
