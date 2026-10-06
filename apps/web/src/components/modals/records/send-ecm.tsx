"use client";

import {
  getEcmApiKey,
  sendRecordsToEcm,
} from "@/actions/database/ecircuitmania";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { SendEcmSchema } from "@/forms/server/records/send-ecm-schema";
import { getErrorMessage } from "@/lib/utils";
import type { RecordsWithUser } from "@/services/database/matches";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ModalContent } from "../modal";

export default function SendEcmModal({
  serverId,
  matchId,
  records,
  closeModal,
}: {
  serverId: string;
  matchId: string;
  records: RecordsWithUser[];
  closeModal?: () => void;
}) {
  const [isKeyLoading, setIsKeyLoading] = useState(true);
  const [keyError, setKeyError] = useState<string>();
  const form = useForm<z.infer<typeof SendEcmSchema>>({
    resolver: zodResolver(SendEcmSchema),
    defaultValues: {
      apiKey: "",
      roundNumber: Math.max(1, ...records.map((record) => record.round ?? 1)),
    },
  });

  useEffect(() => {
    let active = true;
    getEcmApiKey(serverId)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setKeyError(error);
        else form.setValue("apiKey", data);
        setIsKeyLoading(false);
      })
      .catch((error) => {
        if (active) {
          setKeyError(getErrorMessage(error));
          setIsKeyLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [serverId, form]);

  async function onSubmit(values: z.infer<typeof SendEcmSchema>) {
    if (!values.apiKey) {
      form.setError("apiKey", { message: "Enter an ECM API key" });
      return;
    }
    try {
      const { error } = await sendRecordsToEcm(serverId, matchId, {
        ...values,
        recordIds: records.map((record) => record.id),
      });
      if (error) throw new Error(error);
      toast.success("Selected records sent to eCircuitMania");
      closeModal?.();
    } catch (error) {
      toast.error("Error sending records to eCircuitMania", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <ModalContent>
      <DialogHeader>
        <DialogTitle>Send to eCircuitMania</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground">
        Send {records.length} selected records as one ECM round. If a player has
        multiple selected records, their best time is used.
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormElement
            name="apiKey"
            label="API key"
            type="text"
            placeholder="matchId_token"
            description="Defaults to the current ECM plugin API key. Changes apply to this send only."
            isDisabled={form.formState.isSubmitting || isKeyLoading}
          />
          {keyError && (
            <p role="alert" className="text-sm text-destructive">
              Could not check the saved key: {keyError}
            </p>
          )}
          <FormElement
            name="roundNumber"
            label="Round number"
            type="number"
            min={1}
            step={1}
            isDisabled={form.formState.isSubmitting}
          />
          <Button
            type="submit"
            className="self-end"
            disabled={form.formState.isSubmitting || isKeyLoading}
          >
            {form.formState.isSubmitting
              ? "Sending..."
              : "Send to eCircuitMania"}
          </Button>
        </form>
      </Form>
    </ModalContent>
  );
}
