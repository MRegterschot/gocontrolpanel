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
import { ECMPluginConfig } from "@/types/plugins/ecm";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy, IconSettings } from "@tabler/icons-react";
import { useState } from "react";
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
  const [configModalOpen, setConfigModalOpen] = useState<
    keyof PluginsSchemaType | undefined
  >();

  const defaultValues: PluginsSchemaType = plugins.reduce((acc, plg) => {
    const sp = serverPlugins.find((sp) => sp.pluginId === plg.id);

    return {
      ...acc,
      [plg.name]: sp?.enabled,
    };
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
          enabled: values[p.name as keyof PluginsSchemaType] || false,
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

  const handleConfigUpdate = (name: string, config?: any) => {
    const sp = serverPlugins.find((sp) => sp.plugin.name === name);
    if (sp) {
      sp.config = config;
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <FormElement
              name="admin"
              label="Admin Plugin"
              type="checkbox"
              description={
                plugins.find((p) => p.name === "admin")?.description || ""
              }
            />

            <FormElement
              name="ecm"
              label="eCircuitMania Plugin"
              type="checkbox"
              description={
                plugins.find((p) => p.name === "ecm")?.description || ""
              }
            >
              <Button
                variant={"outline"}
                type="button"
                onClick={() => setConfigModalOpen("ecm")}
              >
                <IconSettings />
                Configure
              </Button>
            </FormElement>

            <FormElement
              name="map-info"
              label="Map Info Plugin"
              type="checkbox"
              description={
                plugins.find((p) => p.name === "map-info")?.description || ""
              }
            />

            <FormElement
              name="records-info"
              label="Records Info Plugin"
              type="checkbox"
              description={
                plugins.find((p) => p.name === "records-info")?.description ||
                ""
              }
            />

            <FormElement
              name="live-ranking"
              label="Live Ranking Plugin"
              type="checkbox"
              description={
                plugins.find((p) => p.name === "live-ranking")?.description ||
                ""
              }
            />

            <FormElement
              name="live-round"
              label="Live Round Plugin"
              type="checkbox"
              description={
                plugins.find((p) => p.name === "live-round")?.description || ""
              }
            />

            <FormElement
              name="ta-leaderboard"
              label="TA Leaderboard Plugin"
              type="checkbox"
              description={
                plugins.find((p) => p.name === "ta-leaderboard")?.description ||
                ""
              }
            />

            <FormElement
              name="ta-active-runs"
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

      <Modal
        isOpen={configModalOpen === "ecm"}
        setIsOpen={() => setConfigModalOpen(undefined)}
      >
        <EcircuitmaniaPluginModal
          serverId={serverId}
          data={{
            pluginId: plugins.find((p) => p.name === "ecm")?.id || "",
            config: serverPlugins.find((sp) => sp.plugin.name === "ecm")
              ?.config as ECMPluginConfig,
          }}
          onSubmit={(config) => {
            handleConfigUpdate("ecm", config);
          }}
        />
      </Modal>
    </>
  );
}
