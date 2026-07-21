"use client";

import { updateServerPlugin } from "@/actions/database/server-plugins";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { LiveRoundPluginConfig } from "@/types/plugins/live-round";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconFileImport, IconX } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  LiveRoundPluginSchema,
  LiveRoundPluginSchemaType,
} from "./live-round-schema";

export default function LiveRoundForm({
  serverId,
  pluginId,
  config,
  onSubmit,
  onClose,
}: {
  serverId: string;
  pluginId: string;
  config?: LiveRoundPluginConfig;
  onSubmit?: (config: LiveRoundPluginConfig) => void;
  onClose?: () => void;
}) {
  const form = useForm<LiveRoundPluginSchemaType>({
    resolver: zodResolver(LiveRoundPluginSchema),
    defaultValues: {
      ...config,
      showPoints: config?.showPoints ?? true,
      rowCount: config?.rowCount ?? 8,
    },
  });

  async function handleSubmit(values: LiveRoundPluginSchemaType) {
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

  const handleConfigImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedConfig = LiveRoundPluginSchema.parse(JSON.parse(text));
      form.reset(importedConfig);
      toast.success("Config imported successfully");
    } catch (error) {
      toast.error("Failed to import config", {
        description: getErrorMessage(error),
      });
    }
  };

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

        <FormElement
          name="showPoints"
          label="Show points"
          type="checkbox"
          description="Whether to show points for each player in the live round widget or to show a finish flag instead."
        />

        <FormElement
          name="rowCount"
          label="Row count"
          type="number"
          description="The number of rows to display in the live round widget. If there are more players than this number, the widget will scroll."
          min={1}
          className="w-24"
        />

        <div className="flex justify-between">
          <Button variant={"outline"} onClick={onClose} className="self-end">
            <IconX />
            Close
          </Button>

          <div>
            <Button asChild variant={"outline"} className="mr-2">
              <label htmlFor="config-import">
                <IconFileImport />
                Import Config
                <input
                  id="config-import"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleConfigImport}
                />
              </label>
            </Button>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              <IconDeviceFloppy />
              Save
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
