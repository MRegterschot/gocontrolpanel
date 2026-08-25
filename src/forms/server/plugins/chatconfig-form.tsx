"use client";

import { updateServerChatConfig } from "@/actions/database/servers";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Servers } from "@/lib/prisma/generated";
import {
  formatMessage as formatChatMessage,
  formatTemplate,
  getErrorMessage,
} from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ChatConfigSchema, ChatConfigSchemaType } from "./chatconfig-schema";
import { ServerError } from "@/types/responses";

export default function ChatConfigForm({
  serverId,
  chatConfig,
}: {
  serverId: string;
  chatConfig: Pick<
    Servers,
    | "manualRouting"
    | "messageFormat"
    | "connectMessage"
    | "disconnectMessage"
    | "scriptNameChangeMessage"
    | "matchSettingsLoadedMessage"
    | "scriptSettingsSavedMessage"
    | "mapListChangeMessage"
  >;
}) {
  const session = useSession();

  const form = useForm<ChatConfigSchemaType>({
    resolver: zodResolver(ChatConfigSchema),
    defaultValues: {
      manualRouting: chatConfig.manualRouting,
      messageFormat: chatConfig.messageFormat ?? "",
      connectMessage: chatConfig.connectMessage ?? "",
      disconnectMessage: chatConfig.disconnectMessage ?? "",
      scriptNameChangeMessage: chatConfig.scriptNameChangeMessage ?? "",
      matchSettingsLoadedMessage: chatConfig.matchSettingsLoadedMessage ?? "",
      scriptSettingsSavedMessage: chatConfig.scriptSettingsSavedMessage ?? "",
      mapListChangeMessage: chatConfig.mapListChangeMessage ?? "",
    },
  });

  async function onSubmit(values: ChatConfigSchemaType) {
    try {
      const { error } = await updateServerChatConfig(serverId, {
        manualRouting: values.manualRouting,
        messageFormat: values.messageFormat ?? null,
        connectMessage: values.connectMessage ?? null,
        disconnectMessage: values.disconnectMessage ?? null,
        scriptNameChangeMessage: values.scriptNameChangeMessage ?? null,
        matchSettingsLoadedMessage: values.matchSettingsLoadedMessage ?? null,
        scriptSettingsSavedMessage: values.scriptSettingsSavedMessage ?? null,
        mapListChangeMessage: values.mapListChangeMessage ?? null,
      });
      if (error) {
        throw new ServerError(error, "UpdateServerChatConfigError");
      }
      toast.success("Chat configuration successfully saved");
    } catch (error) {
      toast.error("Failed to save chat configuration", {
        description: getErrorMessage(error),
      });
    }
  }

  const messageFormatValue = form.watch(
    "messageFormat",
    chatConfig.messageFormat ?? "",
  );

  const connectMessageValue = form.watch(
    "connectMessage",
    chatConfig.connectMessage ?? "",
  );

  const disconnectMessageValue = form.watch(
    "disconnectMessage",
    chatConfig.disconnectMessage ?? "",
  );

  const scriptNameChangeMessageValue = form.watch(
    "scriptNameChangeMessage",
    chatConfig.scriptNameChangeMessage ?? "",
  );

  const matchSettingsLoadedMessageValue = form.watch(
    "matchSettingsLoadedMessage",
    chatConfig.matchSettingsLoadedMessage ?? "",
  );

  const scriptSettingsSavedMessageValue = form.watch(
    "scriptSettingsSavedMessage",
    chatConfig.scriptSettingsSavedMessage ?? "",
  );

  const mapListChangeMessageValue = form.watch(
    "mapListChangeMessage",
    chatConfig.mapListChangeMessage ?? "",
  );

  function formatMessage(format: string): string {
    return formatChatMessage(
      format,
      session.data?.user?.login || "v8vgGbx_TuKkBabAyn7nsQ",
      session.data?.user?.displayName || "Marijntje04",
      "Nice Time! Well done.",
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormElement
          name={"manualRouting"}
          label="Manual Routing"
          description="Enable manual routing for chat messages."
          type="checkbox"
          isRequired
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
          <div>
            <FormElement
              name={"messageFormat"}
              label="Message Format"
              description="Requires manual routing to be enabled. Define the format for chat messages. Available variables: {login}, {nickName}, {message}."
              type="text"
              placeholder="{nickName}: {message}"
              rootClassName="max-w-full"
              className="max-w-full"
            />

            {messageFormatValue && (
              <span className="text-sm text-muted-foreground">
                {">"} {formatMessage(messageFormatValue)}
              </span>
            )}
          </div>

          <div>
            <FormElement
              name={"connectMessage"}
              label="Connect Message"
              description="Message sent when a player connects. Available variables: {login}, {nickName}."
              type="text"
              placeholder="Welcome to the server {nickName}!"
              className="max-w-full"
              rootClassName="max-w-full"
            />

            {connectMessageValue && (
              <span className="text-sm text-muted-foreground">
                {">"} {formatMessage(connectMessageValue)}
              </span>
            )}
          </div>

          <div>
            <FormElement
              name={"disconnectMessage"}
              label="Disconnect Message"
              description="Message sent when a player disconnects. Available variables: {login}, {nickName}."
              type="text"
              placeholder="Goodbye {nickName}!"
              rootClassName="max-w-full"
              className="max-w-full"
            />

            {disconnectMessageValue && (
              <span className="text-sm text-muted-foreground">
                {">"} {formatMessage(disconnectMessageValue)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
          <div>
            <FormElement
              name={"scriptNameChangeMessage"}
              label="Script Name Changed"
              description="Message sent when the game mode script is changed. Available variables: {script}."
              type="text"
              placeholder="Game mode changed to {script}"
              rootClassName="max-w-full"
              className="max-w-full"
            />

            {scriptNameChangeMessageValue && (
              <span className="text-sm text-muted-foreground">
                {">"}{" "}
                {formatTemplate(scriptNameChangeMessageValue, {
                  script: "TimeAttack.Script.txt",
                })}
              </span>
            )}
          </div>

          <div>
            <FormElement
              name={"matchSettingsLoadedMessage"}
              label="Match Settings Loaded"
              description="Message sent when match settings are loaded. Available variables: {filename}."
              type="text"
              placeholder="Match settings loaded: {filename}"
              rootClassName="max-w-full"
              className="max-w-full"
            />

            {matchSettingsLoadedMessageValue && (
              <span className="text-sm text-muted-foreground">
                {">"}{" "}
                {formatTemplate(matchSettingsLoadedMessageValue, {
                  filename: "MyPlaylist.txt",
                })}
              </span>
            )}
          </div>

          <div>
            <FormElement
              name={"scriptSettingsSavedMessage"}
              label="Script Settings Saved"
              description="Message sent when the mode script settings are saved."
              type="text"
              placeholder="Mode script settings have been updated"
              rootClassName="max-w-full"
              className="max-w-full"
            />

            {scriptSettingsSavedMessageValue && (
              <span className="text-sm text-muted-foreground">
                {">"} {formatTemplate(scriptSettingsSavedMessageValue, {})}
              </span>
            )}
          </div>

          <div>
            <FormElement
              name={"mapListChangeMessage"}
              label="Map List Changed"
              description="Message sent when the map list is changed. Available variables: {action} (added, removed or reordered), {count}, {maps}."
              type="text"
              placeholder="Map list updated ({count} map(s) {action}: {maps})"
              rootClassName="max-w-full"
              className="max-w-full"
            />

            {mapListChangeMessageValue && (
              <span className="text-sm text-muted-foreground">
                {">"}{" "}
                {formatTemplate(mapListChangeMessageValue, {
                  action: "added",
                  count: 3,
                  maps: "A01-Race, A02-Race, A03-Race",
                })}
              </span>
            )}
          </div>
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
