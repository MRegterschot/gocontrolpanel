"use client";

import { updateChatConfig } from "@/actions/gbxconnector/chat";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ChatConfigSchema, ChatConfigSchemaType } from "./chatconfig-schema";

export default function ChatConfigForm({
  serverUuid,
  chatConfig,
}: {
  serverUuid: string;
  chatConfig: ChatConfigSchemaType;
}) {
  const session = useSession();

  const form = useForm<ChatConfigSchemaType>({
    resolver: zodResolver(ChatConfigSchema),
    defaultValues: chatConfig,
  });

  async function onSubmit(values: ChatConfigSchemaType) {
    try {
      const { error } = await updateChatConfig(serverUuid, values);
      if (error) {
        throw new Error(error);
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

  function formatMessage(format: string): string {
    const msg = format
      .replaceAll(
        "{login}",
        session.data?.user.login ?? "v8vgGbx_TuKkBabAyn7nsQ",
      )
      .replaceAll("{nickName}", session.data?.user.displayName ?? "Marijntje04")
      .replaceAll("{message}", "Nice time!");
    return msg.trim();
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

        <div>
          <FormElement
            name={"messageFormat"}
            label="Message Format"
            description="Requires manual routing to be enabled. Define the format for chat messages. Available variables: {login}, {nickName}, {message}."
            type="text"
            placeholder="{nickName}: {message}"
            className="max-w-128"
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
            className="max-w-128"
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
            className="max-w-128"
          />

          {disconnectMessageValue && (
            <span className="text-sm text-muted-foreground">
              {">"} {formatMessage(disconnectMessageValue)}
            </span>
          )}
        </div>

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="max-w-24"
        >
          Save
        </Button>
      </form>
    </Form>
  );
}
