"use client";

import { updateServerPlugin } from "@/actions/database/server-plugins";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form, FormDescription, FormLabel } from "@/components/ui/form";
import { useSearchUsers } from "@/hooks/use-search-users";
import { getErrorMessage } from "@/lib/utils";
import { ECMPluginConfig } from "@/types/plugins/ecm";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconDeviceFloppy,
  IconFileImport,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ECMPluginSchema, ECMPluginSchemaType } from "./ecm-schema";

export default function ECMForm({
  serverId,
  pluginId,
  config,
  onSubmit,
  onClose,
}: {
  serverId: string;
  pluginId: string;
  config?: ECMPluginConfig;
  onSubmit?: (config: ECMPluginConfig) => void;
  onClose?: () => void;
}) {
  const { data: session } = useSession();

  let defaultEditors = config?.editors;
  if (!defaultEditors) {
    defaultEditors = session ? [session.user.login] : [];
  }

  const { search, searchResults, searching, loading } = useSearchUsers({
    defaultUsers: defaultEditors,
    field: "login",
  });

  const form = useForm<ECMPluginSchemaType>({
    resolver: zodResolver(ECMPluginSchema),
    defaultValues: {
      apiKey: config?.apiKey || "",
      isRecording: config?.isRecording || false,
      editors: defaultEditors.map((e) => {
        return { login: e };
      }),
    },
  });

  const { control } = form;
  const {
    fields: editorFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "editors",
  });

  async function handleSubmit(values: ECMPluginSchemaType) {
    try {
      const updatedConfig: ECMPluginConfig = {
        ...values,
        editors:
          values.editors?.filter((e) => e.login).map((e) => e.login) || [],
      };

      const { error } = await updateServerPlugin(
        serverId,
        pluginId,
        updatedConfig,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Config successfully saved");
      if (onSubmit) {
        onSubmit(updatedConfig);
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
      const importedConfig = ECMPluginSchema.parse(JSON.parse(text));
      form.reset(importedConfig);
      toast.success("Config imported successfully");
    } catch (error) {
      toast.error("Failed to import config", {
        description: getErrorMessage(error),
      });
    }
  };

  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name="apiKey"
          label="API Key"
          placeholder="Enter your eCircuitMania API Key"
        />

        <FormElement
          name="isRecording"
          label="Enable recording"
          type="checkbox"
          description="Toggle to enable or disable recording of race data."
        />

        {/* Editors */}
        <div className="flex flex-col gap-2">
          <div>
            <FormLabel className="text-sm">Editors</FormLabel>
            <FormDescription className="max-w-xs whitespace-normal wrap-break-word">
              Users who can manage ECM settings in the server widget. No editors
              means everyone can manage.
            </FormDescription>
          </div>
          {editorFields.map((_, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <FormElement
                  name={`editors.${index}.login`}
                  className="w-full"
                  placeholder="Search user..."
                  onSearch={search}
                  options={searchResults.map((u) => ({
                    label: u.nickName,
                    value: u.login,
                  }))}
                  isLoading={searching}
                  type="search"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size={"icon"}
                onClick={() => remove(index)}
              >
                <IconTrash />
                <span className="sr-only">Remove Editor</span>
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ login: "" })}
          >
            <IconPlus />
            Add User
          </Button>

          <div className="flex justify-between mt-4">
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
        </div>
      </form>
    </Form>
  );
}
