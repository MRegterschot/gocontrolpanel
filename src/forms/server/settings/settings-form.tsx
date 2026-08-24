"use client";
import { getServerSettings, saveServerSettings } from "@/actions/gbx/server";
import FormElement from "@/components/form/form-element";
import FormElementSkeleton from "@/components/skeletons/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ServerSettingsSchema,
  ServerSettingsSchemaType,
} from "./settings-schema";

export default function SettingsForm({ serverId }: { serverId: string }) {
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<ServerSettingsSchemaType>({
    resolver: zodResolver(ServerSettingsSchema),
    defaultValues: async () => {
      const response = await getServerSettings(serverId);
      setIsLoading(false);
      if (!response.ok) {
        throw new ServerError(response.error, "GetServerSettingsError");
      }
      return response.data;
    },
  });

  async function onSubmit(values: ServerSettingsSchemaType) {
    try {
      const { error } = await saveServerSettings(serverId, values);
      if (error) {
        throw new ServerError(error, "SaveServerSettingsError");
      }
      toast.success("Settings successfully saved");
    } catch (error) {
      toast.error("Failed to save settings", {
        description: getErrorMessage(error),
      });
    }
  }

  // Return skeleton if loading
  if (isLoading) {
    return (
      <div
        className="gap-6 lg:gap-x-8 2xl:gap-x-16 grid grid-rows-18 lg:grid-rows-9 
        2xl:grid-rows-6 grid-flow-col"
      >
        {Array.from({ length: 18 }).map((_, index) => (
          <FormElementSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="gap-8 flex flex-col"
      >
        <div
          className="gap-4 lg:gap-x-8 2xl:gap-x-16 grid grid-rows-18 lg:grid-rows-9 
        2xl:grid-rows-6 grid-flow-col"
        >
          <FormElement
            name={"defaultOptions.Name"}
            label="Server Name"
            description="The name of the server."
            placeholder="My server"
            className="w-full min-w-64"
            isRequired
          />

          <FormElement
            name={"defaultOptions.Comment"}
            label="Server Comment"
            description="The comment of the server."
            placeholder="This is my server"
            className="w-full min-w-64"
          />

          <FormElement
            name={"defaultOptions.Password"}
            label="Server Password"
            description="The password of the server for players."
            placeholder="playerpass"
            className="w-2/3 min-w-64"
            type="password"
          />

          <FormElement
            name={"defaultOptions.PasswordForSpectator"}
            label="Server Password Spectator"
            description="The password of the server for spectators."
            placeholder="spectatorpass"
            className="w-2/3 min-w-64"
            type="password"
          />

          <FormElement
            name={"defaultOptions.NextCallVoteTimeOut"}
            label="Call Vote Timeout"
            description="The timeout for call vote in seconds."
            placeholder="Call vote timeout..."
            className="w-20"
            type="number"
            isRequired
          />

          <FormElement
            name={"defaultOptions.CallVoteRatio"}
            label="Call Vote Ratio"
            description="The ratio for call vote in %."
            placeholder="Call vote ratio..."
            className="w-20"
            type="number"
            isRequired
          />
          <FormElement
            name={"defaultOptions.HideServer"}
            label="Server Visibility"
            description="The visibility of the server."
            options={[
              { label: "Visible", value: "0" },
              { label: "Hidden", value: "1" },
              { label: "Hidden from nations", value: "2" },
            ]}
            className="w-3/5 min-w-48"
            type="select"
            isRequired
          />

          <FormElement
            name={"defaultOptions.NextMaxPlayers"}
            label="Max Players"
            description="The maximum number of players. 0 for unlimited."
            placeholder="Max players..."
            className="w-20"
            type="number"
          />

          <FormElement
            name={"defaultOptions.NextMaxSpectators"}
            label="Max Spectators"
            description="The maximum number of spectators. 0 for unlimited."
            placeholder="Max spectators..."
            className="w-20"
            type="number"
          />

          <FormElement
            name={"defaultOptions.KeepPlayerSlots"}
            label="Keep Player Slots"
            description="Keep player slots for spectators."
            type="checkbox"
            isRequired
          />

          <FormElement
            name={"allowMapDownload"}
            label="Allow Map Download"
            description="Allow map download."
            type="checkbox"
            isRequired
          />

          <FormElement
            name={"defaultOptions.AutoSaveReplays"}
            label="Auto Save Replays"
            description="Auto save replays."
            type="checkbox"
            isRequired
          />
          <FormElement
            name={"defaultOptions.DisableHorns"}
            label="Horns"
            description="Enable horns."
            type="checkbox"
            isRequired
          />

          <FormElement
            name={"defaultOptions.DisableServiceAnnounces"}
            label="Service Announcements"
            description="Enable service announcements."
            type="checkbox"
            isRequired
          />

          <FormElement
            name={"downloadRate"}
            label="Download Rate"
            description="The download rate of the server."
            placeholder="Download rate..."
            className="w-26"
            type="number"
            isRequired
          />

          <FormElement
            name={"uploadRate"}
            label="Upload Rate"
            description="The upload rate of the server."
            placeholder="Upload rate..."
            className="w-26"
            type="number"
            isRequired
          />

          <FormElement
            name={"profileSkins"}
            label="Profile Skins"
            description="Enable profile skins."
            type="checkbox"
            isRequired
          />

          <FormElement
            name={"enableHelpCommand"}
            label="Enable Help Command"
            description="Enable the help command for plugins."
            type="checkbox"
          />
        </div>

        <Button
          type="submit"
          className="w-fit"
          disabled={form.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
