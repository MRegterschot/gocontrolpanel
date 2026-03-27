"use client";

import { Card } from "@/components/ui/card";
import RecordsInfoForm from "@/forms/server/interface/records-info/records-info-form";
import { RecordsInfoPluginConfig } from "@/types/plugins/records-info";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function RecordsInfoPluginModal({
  serverId,
  data,
  closeModal,
}: DefaultModalProps<
  {
    pluginId: string;
    config: RecordsInfoPluginConfig;
  },
  RecordsInfoPluginConfig
>) {
  if (!serverId || !data || !data.pluginId) {
    return null;
  }

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-100 max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Records Info Plugin</h1>

        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground ml-2"
          onClick={closeModal}
        />
      </div>

      <RecordsInfoForm
        serverId={serverId}
        pluginId={data?.pluginId}
        config={data?.config}
      />
    </Card>
  );
}
