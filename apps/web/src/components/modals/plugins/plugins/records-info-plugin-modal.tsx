"use client";

import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RecordsInfoForm from "@/forms/server/plugins/records-info/records-info-form";
import { RecordsInfoPluginConfig } from "@/types/plugins/records-info";
import { DefaultModalProps } from "../../default-props";

export default function RecordsInfoPluginModal({
  serverId,
  data,
  closeModal,
  onSubmit,
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

  const handleSubmit = (config: RecordsInfoPluginConfig) => {
    closeModal?.();
    onSubmit?.(config);
  };

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Records Info Plugin</DialogTitle>
      </DialogHeader>

      <RecordsInfoForm
        serverId={serverId}
        pluginId={data?.pluginId}
        config={data?.config}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </ModalContent>
  );
}
