"use client";

import { createApiKey } from "@/actions/database/api-keys";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import type { ApiKeyTarget } from "@/lib/api-keys/authenticate";
import { getErrorMessage } from "@/lib/utils";
import { ServerError } from "@/types/responses";
import { API_KEY_SCOPE_DESCRIPTIONS, API_KEY_SCOPES } from "@gcp/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconKey } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  API_KEY_EXPIRY_OPTIONS,
  CreateApiKeySchema,
  CreateApiKeySchemaType,
} from "./create-api-key-schema";

export default function CreateApiKeyForm({
  target,
  callback,
}: {
  target: ApiKeyTarget;
  callback: (token: string) => void;
}) {
  const form = useForm<CreateApiKeySchemaType>({
    resolver: zodResolver(CreateApiKeySchema),
    defaultValues: { name: "", scopes: [], expiresIn: "90" },
  });

  async function onSubmit(values: CreateApiKeySchemaType) {
    try {
      const { data, error } = await createApiKey({
        target,
        name: values.name,
        scopes: values.scopes,
        expiresInDays:
          values.expiresIn === "never"
            ? null
            : (Number(values.expiresIn) as 30 | 90 | 365),
      });
      if (error) throw new ServerError(error, "CreateApiKeyError");
      toast.success("API key created");
      callback(data.token);
    } catch (error) {
      toast.error("Failed to create API key", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name="name"
          label="Name"
          placeholder="What will use this key?"
          isRequired
        />
        <FormElement
          name="scopes"
          label="Scopes"
          placeholder="Select what the key may do"
          type="multi-select"
          isRequired
          options={API_KEY_SCOPES.map((scope) => ({
            label: `${scope}: ${API_KEY_SCOPE_DESCRIPTIONS[scope]}`,
            value: scope,
          }))}
        />
        <FormElement
          name="expiresIn"
          label="Expires"
          type="select"
          options={API_KEY_EXPIRY_OPTIONS.map((option) => ({ ...option }))}
        />
        <Button
          type="submit"
          className="w-full mt-2"
          disabled={form.formState.isSubmitting}
        >
          <IconKey />
          Create API key
        </Button>
      </form>
    </Form>
  );
}
