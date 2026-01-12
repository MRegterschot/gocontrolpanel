"use client";

import { updateServerPlugin } from "@/actions/database/server-plugins";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form, FormDescription, FormLabel } from "@/components/ui/form";
import { useSearchUsers } from "@/hooks/use-search-users";
import { getErrorMessage } from "@/lib/utils";
import { PlayerInfoPluginConfig } from "@/types/plugins/player-info";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  PlayerInfoPluginSchema,
  PlayerInfoPluginSchemaType,
} from "./player-info-schema";

const DEVICE_OPTIONS = [
  { label: "Keyboard", value: "Keyboard" },
  { label: "Controller", value: "Controller" },
  { label: "Wheel", value: "Wheel" },
  { label: "Mouse", value: "Mouse" },
  { label: "Joystick", value: "Joystick" },
];

const CAMERA_OPTIONS = [
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "Alt 1", value: "Alt 1" },
  { label: "Alt 2", value: "Alt 2" },
  { label: "Alt 3", value: "Alt 3" },
];

export default function PlayerInfoForm({
  serverId,
  pluginId,
  config,
  onSubmit,
  onClose,
}: {
  serverId: string;
  pluginId: string;
  config?: PlayerInfoPluginConfig;
  onSubmit?: (config: PlayerInfoPluginConfig) => void;
  onClose?: () => void;
}) {
  const { search, searchResults, searching, loading } = useSearchUsers({
    defaultUsers: config?.playerInfos?.map((p) => p.login),
    field: "login",
  });

  const form = useForm<PlayerInfoPluginSchemaType>({
    resolver: zodResolver(PlayerInfoPluginSchema),
    defaultValues: {
      playerInfos: config?.playerInfos || [],
    },
  });

  const { control } = form;
  const {
    fields: playerInfoFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "playerInfos",
  });

  async function handleSubmit(values: PlayerInfoPluginSchemaType) {
    try {
      const updatedConfig: PlayerInfoPluginConfig = {
        playerInfos: values.playerInfos?.filter((p) => p.login) || [],
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

  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <div>
            <FormLabel className="text-sm">Players</FormLabel>
            <FormDescription className="max-w-xs whitespace-normal break-words">
              Add players to display their device and camera information.
            </FormDescription>
          </div>
          {playerInfoFields.map((_, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex gap-2 flex-1">
                <FormElement
                  name={`playerInfos.${index}.login`}
                  className="w-full"
                  rootClassName="flex-1"
                  placeholder="Search user..."
                  onSearch={search}
                  options={searchResults.map((u) => ({
                    label: u.nickName,
                    value: u.login,
                  }))}
                  isLoading={searching}
                  type="search"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size={"icon"}
                  onClick={() => remove(index)}
                >
                  <IconTrash />
                  <span className="sr-only">Remove Player</span>
                </Button>
              </div>
              <div className="flex flex-1 gap-2">
                <FormElement
                  name={`playerInfos.${index}.device`}
                  className="w-full"
                  rootClassName="flex-1"
                  placeholder="Keyboard, Controller, etc."
                  options={DEVICE_OPTIONS}
                  type="select"
                />
                <FormElement
                  name={`playerInfos.${index}.camera`}
                  className="w-full"
                  rootClassName="flex-1"
                  placeholder="1, 2, Alt 1, etc."
                  options={CAMERA_OPTIONS}
                  type="select"
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ login: "" })}
          >
            <IconPlus />
            Add Player
          </Button>

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
        </div>
      </form>
    </Form>
  );
}
