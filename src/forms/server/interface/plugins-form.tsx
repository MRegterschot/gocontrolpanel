"use client";

import { ServerPluginsWithPlugin } from "@/actions/database/server-only/gbx";
import { updateServerPlugins } from "@/actions/database/server-plugins";
import FormElement from "@/components/form/form-element";
import EcircuitmaniaPluginModal from "@/components/modals/interface/plugins/ecircuitmania-plugin-modal";
import Modal from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Plugins } from "@/lib/prisma/generated";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconSettings } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PluginsSchema, PluginsSchemaType } from "./plugins-schema";

export default function PluginsForm({
  serverId,
  serverPlugins,
  plugins,
}: {
  serverId: string;
  serverPlugins: ServerPluginsWithPlugin[];
  plugins: Plugins[];
}) {
  const defaultValues: PluginsSchemaType = plugins.reduce((acc, plg) => {
    const sp = serverPlugins.find((sp) => sp.pluginId === plg.id);

    acc[plg.name as keyof PluginsSchemaType] = sp
      ? {
          ...sp,
          config: sp.config || {},
        }
      : {
          enabled: false,
          config: {},
        };

    return acc;
  }, {} as PluginsSchemaType);

  const form = useForm<PluginsSchemaType>({
    resolver: zodResolver(PluginsSchema),
    defaultValues,
  });

  async function onSubmit(values: PluginsSchemaType) {
    try {
      const { error } = await updateServerPlugins(
        serverId,
        plugins.map((p) => ({
          pluginId: p.id,
          enabled: values[p.name as keyof PluginsSchemaType].enabled ?? false,
          config: values[p.name as keyof PluginsSchemaType].config,
        })),
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Plugins successfully saved");
    } catch (error) {
      toast.error("Failed to save plugins", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <FormElement
            name="admin.enabled"
            label="Admin Plugin"
            type="checkbox"
            description={
              plugins.find((p) => p.name === "admin")?.description || ""
            }
          />

          <FormElement
            name="ecm.enabled"
            label="eCircuitMania Plugin"
            type="checkbox"
            description={
              plugins.find((p) => p.name === "ecm")?.description || ""
            }
          >
            <Modal>
              <EcircuitmaniaPluginModal form={form} />
              <Button variant={"outline"} type="button">
                <IconSettings />
                Configure
              </Button>
            </Modal>
          </FormElement>

          <FormElement
            name="map-info.enabled"
            label="Map Info Plugin"
            type="checkbox"
            description={
              plugins.find((p) => p.name === "map-info")?.description || ""
            }
          />

          <FormElement
            name="records-info.enabled"
            label="Records Info Plugin"
            type="checkbox"
            description={
              plugins.find((p) => p.name === "records-info")?.description || ""
            }
          />

          <FormElement
            name="live-ranking.enabled"
            label="Live Ranking Plugin"
            type="checkbox"
            description={
              plugins.find((p) => p.name === "live-ranking")?.description || ""
            }
          />

          <FormElement
            name="live-round.enabled"
            label="Live Round Plugin"
            type="checkbox"
            description={
              plugins.find((p) => p.name === "live-round")?.description || ""
            }
          />

          <FormElement
            name="ta-leaderboard.enabled"
            label="TA Leaderboard Plugin"
            type="checkbox"
            description={
              plugins.find((p) => p.name === "ta-leaderboard")?.description ||
              ""
            }
          />

          <FormElement
            name="ta-active-runs.enabled"
            label="TA Active Runs Plugin"
            type="checkbox"
            description={
              plugins.find((p) => p.name === "ta-active-runs")?.description ||
              ""
            }
          />
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="max-w-24"
        >
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
