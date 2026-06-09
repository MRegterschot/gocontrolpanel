"use client";

import { getServerPlugin, setServerPlugin } from "@/actions/gbx/server-plugin";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { getErrorMessage } from "@/lib/utils";
import { ServerPlugin } from "@/types/gbx/server-plugin";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconCancel, IconDeviceFloppy } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ServerPluginsSchema,
  ServerPluginsSchemaType,
} from "./server-plugins-schema";

export default function ServerPluginsForm({
  serverId,
  defaultServerPlugin,
  scripts,
}: {
  serverId: string;
  defaultServerPlugin: ServerPlugin;
  scripts: string[];
}) {
  const [serverPlugin, setServerPluginState] =
    useState<ServerPlugin>(defaultServerPlugin);

  const refreshServerPlugin = async () => {
    try {
      const { data, error } = await getServerPlugin(serverId);
      if (error) {
        throw new Error(error);
      }
      setServerPluginState(data);
    } catch (error) {
      toast.error("Failed to refresh server plugin", {
        description: getErrorMessage(error),
      });
    }
  };

  const form = useForm<ServerPluginsSchemaType>({
    resolver: zodResolver(ServerPluginsSchema),
    defaultValues: {
      scriptName: serverPlugin.Name,
      settings: serverPlugin.SettingsValues,
    },
  });

  async function onSubmit(values: ServerPluginsSchemaType) {
    try {
      const parsedSettings = Object.fromEntries(
        Object.entries(values.settings).map(([key, value]) => {
          const desc = serverPlugin.SettingsDesc.find((d) => d.Name === key);
          if (!desc) return [key, value];

          if (desc.Type === "boolean") {
            return [key, Boolean(value)];
          } else if (desc.Type === "int") {
            return [key, Number(value)];
          }
          return [key, value];
        }),
      );

      const { error } = await setServerPlugin(
        serverId,
        true,
        values.scriptName || "",
        parsedSettings,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Server plugin updated successfully");
      await refreshServerPlugin();
    } catch (error) {
      toast.error("Failed to update server plugin", {
        description: getErrorMessage(error),
      });
    }
  }

  async function onUnload() {
    try {
      const { error } = await setServerPlugin(serverId, true, "", {});
      if (error) {
        throw new Error(error);
      }
      form.reset({
        scriptName: "",
        settings: serverPlugin.SettingsValues,
      });
      toast.success("Server plugin unloaded successfully");
      await refreshServerPlugin();
    } catch (error) {
      toast.error("Failed to unload server plugin", {
        description: getErrorMessage(error),
      });
    }
  }

  const formElements = useMemo(() => {
    return serverPlugin.SettingsDesc.map((desc) => {
      return (
        <FormElement
          key={desc.Name}
          name={`settings.${desc.Name}`}
          label={desc.Name}
          description={desc.Desc}
          rootClassName="max-w-full"
          placeholder={String(desc.Default)}
          type={
            desc.Type === "boolean"
              ? "checkbox"
              : desc.Type === "int"
                ? "number"
                : "text"
          }
          className={
            desc.Type === "int"
              ? "w-26"
              : "sm:w-2/3 xl:max-w-[calc(100%-192px)] min-w-48"
          }
        />
      );
    });
  }, [serverPlugin.SettingsDesc, serverPlugin.SettingsValues]);

  const middleIndex = Math.ceil(formElements.length / 2);
  const leftElements = formElements.slice(0, middleIndex);
  const rightElements = formElements.slice(middleIndex);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name={"scriptName"}
          label="Script Name"
          description="The name of the script to load."
          rootClassName="max-w-128"
          options={scripts.map((script) => ({
            label: script,
            value: script,
          }))}
          placeholder="Select a script to load as a server plugin"
          className="w-full"
          type="select"
          isRequired
        >
          <Button
            type="button"
            variant="outline"
            onClick={onUnload}
            disabled={form.formState.isSubmitting}
          >
            <IconCancel />
            <span className="hidden sm:block">Unload Server Plugin</span>
          </Button>
        </FormElement>

        <Separator />

        {serverPlugin.Name && (
          <div className="flex flex-col gap-4 max-sm:flex-col max-[768px]:flex-row min-[960px]:flex-row">
            <div className="flex flex-col gap-3 flex-1">{leftElements}</div>
            <div className="flex flex-col gap-3 flex-1">{rightElements}</div>
          </div>
        )}

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
