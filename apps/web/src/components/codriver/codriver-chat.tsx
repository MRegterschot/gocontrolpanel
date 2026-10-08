"use client";

import { sendCodriverMessage } from "@/actions/codriver";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { useCodriverChatAccess } from "@/hooks/use-codriver";
import { codriverRequestsPath } from "@/lib/api-client/codriver";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { stripFormatting } from "@/lib/codriver/text";
import { getErrorMessage } from "@/lib/utils";
import type { CodriverChatReply } from "@/types/codriver";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  text: z.string().trim().min(1, "Enter a request").max(300),
});
type Message = { id: number; speaker: "You" | "Codriver"; text: string };

export default function CodriverChat({ serverId }: { serverId: string }) {
  const access = useCodriverChatAccess(serverId);
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { text: "" },
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [result, setResult] = useState<CodriverChatReply | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const sequence = useRef(0);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);

  async function send(text: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const add = (speaker: Message["speaker"], text: string) => {
      const message = { id: sequence.current++, speaker, text };
      setMessages((previous) => [...previous, message].slice(-100));
    };
    add("You", text);
    try {
      const response = await unwrap(
        sendCodriverMessage(serverId, text, result?.confirmationId),
      );
      setResult(response);
      add("Codriver", stripFormatting(response.reply));
      form.reset();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.codriverServer(serverId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.codriverUsage(serverId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.codriverUsage() }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "paginated" &&
            [codriverRequestsPath(serverId), codriverRequestsPath()].includes(
              String(query.queryKey[1]),
            ),
        }),
      ]);
    } catch (error) {
      toast.error("Could not send request", {
        description: getErrorMessage(error),
      });
      add("Codriver", `Could not send request: ${getErrorMessage(error)}`);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Card className="gap-6 py-6">
      <CardHeader>
        <CardTitle>Ask Codriver</CardTitle>
        <CardDescription>
          Manage this server in plain English. Disruptive changes ask for
          confirmation. Each request stands on its own.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {access.isPending ? (
          <p className="text-muted-foreground">Checking access…</p>
        ) : access.error ? (
          <p role="alert" className="text-destructive">
            {getErrorMessage(access.error)}
          </p>
        ) : !access.data?.allowed ? (
          <p role="status" className="text-muted-foreground">
            {access.data?.reason}
          </p>
        ) : null}
        <div
          role="log"
          aria-label="Codriver conversation"
          aria-live="polite"
          className="max-h-96 min-h-40 space-y-3 overflow-y-auto rounded-md border p-4"
        >
          {!messages.length && (
            <p className="text-sm text-muted-foreground">
              Try “status”, “list plugins” or “skip this map”.
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.speaker === "You"
                  ? "ml-8 rounded-md bg-muted p-3"
                  : "mr-8 p-3"
              }
            >
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                {message.speaker}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">
                {message.text}
              </p>
            </div>
          ))}
          {busy && (
            <p className="text-sm text-muted-foreground">
              Codriver is thinking…
            </p>
          )}
          <div ref={end} />
        </div>
        {result?.status === "needs_confirmation" && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
            <p className="text-sm">Confirm this change within 60 seconds.</p>
            <Button
              type="button"
              disabled={busy || !access.data?.allowed}
              onClick={() => void send("yes")}
            >
              Confirm
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !access.data?.allowed}
              onClick={() => void send("no")}
            >
              Cancel
            </Button>
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(({ text }) => send(text))}
            className="flex flex-col gap-3"
          >
            <FormElement
              name="text"
              label="Request"
              type="textarea"
              placeholder="What would you like to do?"
              rootClassName="max-w-none"
              isDisabled={busy || !access.data?.allowed}
            />
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={
                  busy || !access.data?.allowed || !form.watch("text").trim()
                }
              >
                {busy ? "Sending…" : "Send request"}
              </Button>
              <span className="text-xs text-muted-foreground">
                {form.watch("text").length}/300
              </span>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
