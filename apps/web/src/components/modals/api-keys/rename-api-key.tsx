"use client";

import { renameApiKey } from "@/actions/database/api-keys";
import FormElement from "@/components/form/form-element";
import { ModalContent } from "@/components/modals/modal";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  RenameApiKeySchema,
  RenameApiKeySchemaType,
} from "@/forms/api-keys/create-api-key-schema";
import { getErrorMessage } from "@/lib/utils";
import type { ApiKeyRow } from "@/services/database/api-keys";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DefaultModalProps } from "../default-props";

export default function RenameApiKeyModal({
  closeModal,
  onSubmit,
  data: apiKey,
}: DefaultModalProps<ApiKeyRow>) {
  const form = useForm<RenameApiKeySchemaType>({
    resolver: zodResolver(RenameApiKeySchema),
    defaultValues: { name: apiKey?.name ?? "" },
  });

  if (!apiKey) return null;

  async function submit(values: RenameApiKeySchemaType) {
    try {
      const { error } = await renameApiKey(apiKey!.id, values.name);
      if (error) throw new ServerError(error, "RenameApiKeyError");
      toast.success("API key renamed");
      onSubmit?.();
      closeModal?.();
    } catch (error) {
      toast.error("Failed to rename API key", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>Rename API key</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="flex flex-col gap-4"
        >
          <FormElement name="name" label="Name" isRequired />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Save
          </Button>
        </form>
      </Form>
    </ModalContent>
  );
}
