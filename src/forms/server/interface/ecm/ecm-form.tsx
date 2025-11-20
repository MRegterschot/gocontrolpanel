"use client";

import FormElement from "@/components/form/form-element";
import { UseFormReturn } from "react-hook-form";
import { PluginsSchemaType } from "../plugins-schema";

export default function ECMForm({
  form,
}: {
  form: UseFormReturn<PluginsSchemaType>;
}) {
  return (
    <>
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
    </>
  );
}
