"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconX } from "@tabler/icons-react";
import { DefaultModalProps } from "../../default-props";

export default function EcircuitmaniaPluginModal({
  closeModal,
}: DefaultModalProps) {
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

      <FormElement
        name="ecm.config.apiKey"
        label="API Key"
        placeholder="Enter your eCircuitMania API Key"
      />

      <FormElement
        name="ecm.config.isRecording"
        label="Enable recording"
        type="checkbox"
        description="Toggle to enable or disable recording of race data."
      />

      <Button variant={"outline"} onClick={closeModal} className="self-end">
        <IconX />
        Close
      </Button>
    </Card>
  );
}
