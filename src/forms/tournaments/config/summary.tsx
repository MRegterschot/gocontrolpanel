"use client";

import { Button } from "@/components/ui/button";
import { IconArrowNarrowLeft, IconDeviceFloppy } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import { ConfigFormSchemaType } from "./config-schema";
import ConfigDetails from "./config-details";

export default function ConfigSummary({
  form,
  submitLabel,
  inline,
  onSubmit,
  onBack,
}: {
  form: UseFormReturn<ConfigFormSchemaType>;
  submitLabel: string;
  inline?: boolean;
  onSubmit: (values: ConfigFormSchemaType) => Promise<unknown>;
  onBack: () => void;
}) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-4">
        <ConfigDetails name={inline ? undefined : form.watch("name")} config={form.watch("config")} />

        <div className="flex gap-2 justify-between">
          <Button
            className="flex-1 max-w-32"
            type="button"
            variant="outline"
            onClick={onBack}
          >
            <IconArrowNarrowLeft />
            Previous
          </Button>
          <Button
            className="flex-1 max-w-fit"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            type="submit"
          >
            <IconDeviceFloppy />
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
