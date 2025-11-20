"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ECMForm from "@/forms/server/interface/ecm/ecm-form";
import { PluginsSchemaType } from "@/forms/server/interface/plugins-schema";
import { IconX } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import { DefaultModalProps } from "../../default-props";

interface EcircuitmaniaPluginModalProps extends DefaultModalProps {
  form: UseFormReturn<PluginsSchemaType>;
}

export default function EcircuitmaniaPluginModal({
  closeModal,
  form,
}: EcircuitmaniaPluginModalProps) {
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
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

      <ECMForm form={form} />

      <Button variant={"outline"} onClick={closeModal} className="self-end">
        <IconX />
        Close
      </Button>
    </Card>
  );
}
