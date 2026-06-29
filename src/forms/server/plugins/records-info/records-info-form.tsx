"use client";

import { updateServerPlugin } from "@/actions/database/server-plugins";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { RecordsInfoPluginConfig } from "@/types/plugins/records-info";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  RecordsInfoPluginSchema,
  RecordsInfoPluginSchemaType,
} from "./records-info-schema";

export default function RecordsInfoForm({
  serverId,
  pluginId,
  config,
  onSubmit,
  onClose,
}: {
  serverId: string;
  pluginId: string;
  config?: RecordsInfoPluginConfig;
  onSubmit?: (config: RecordsInfoPluginConfig) => void;
  onClose?: () => void;
}) {
  const form = useForm<RecordsInfoPluginSchemaType>({
    resolver: zodResolver(RecordsInfoPluginSchema),
    defaultValues: {
      localRecordText: config?.localRecordText || "",
    },
  });

  async function handleSubmit(values: RecordsInfoPluginSchemaType) {
    try {
      const { error } = await updateServerPlugin(serverId, pluginId, values);
      if (error) {
        throw new Error(error);
      }
      toast.success("Config successfully saved");
      if (onSubmit) {
        onSubmit(values);
      }
    } catch (error) {
      toast.error("Failed to save config", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name="localRecordText"
          label="Local Record Text"
          placeholder="Text to display for the local record (default: LR)"
        />

        <div className="flex justify-between mt-4">
          <Button variant={"outline"} onClick={onClose} className="self-end">
            <IconX />
            Close
          </Button>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            <IconDeviceFloppy />
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
}
