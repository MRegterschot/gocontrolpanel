"use client";

import {
  getServerPlugin,
  getServerPluginVariables,
  setServerPlugin,
} from "@/actions/gbx/server-plugin";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ServerPluginsSchema,
  ServerPluginsSchemaType,
} from "./server-plugins-schema";

export default function ServerPluginsForm({
  serverId,
  serverPlugin,
  scripts,
}: {
  serverId: string;
  serverPlugin: unknown;
  scripts: string[];
}) {
  const handleGetServerPlugin = async () => {
    try {
      const { data, error } = await getServerPlugin(serverId);
      if (error) {
        throw new Error(error);
      }
      console.log("Server Plugin Data:", data);
    } catch (error) {
      toast.error("Failed to get server plugin", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleGetServerPluginVariables = async () => {
    try {
      const { data, error } = await getServerPluginVariables(serverId);
      if (error) {
        throw new Error(error);
      }
      console.log("Server Plugin Variables:", data);
    } catch (error) {
      toast.error("Failed to get server plugin variables", {
        description: getErrorMessage(error),
      });
    }
  };

  const form = useForm<ServerPluginsSchemaType>({
    resolver: zodResolver(ServerPluginsSchema),
    defaultValues: {
      // scriptName: ,
    },
  });

  async function onSubmit(values: ServerPluginsSchemaType) {
    console.log("Form submitted with values:", values);

    try {
      const { error } = await setServerPlugin(
        serverId,
        true,
        values.scriptName || "",
        {},
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Server plugin updated successfully");
    } catch (error) {
      toast.error("Failed to update server plugin", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-2"
      >
        <FormElement
          name={"scriptName"}
          label="Script Name"
          description="The name of the script to load."
          rootClassName="max-w-full"
          options={scripts.map((script) => ({
            label: script,
            value: script,
          }))}
          className="max-w-48 sm:max-w-full sm:w-1/2"
          type="select"
          isRequired
        />

        <Button
          type="button"
          variant={"outline"}
          className="max-w-min"
          onClick={handleGetServerPlugin}
        >
          Get Server Plugin
        </Button>
        <Button
          type="button"
          variant={"outline"}
          className="max-w-min"
          onClick={handleGetServerPluginVariables}
        >
          Get Server Plugin Variables
        </Button>

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
