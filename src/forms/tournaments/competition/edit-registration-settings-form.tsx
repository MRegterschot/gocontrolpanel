"use client";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { reducers } from "@/lib/server-manager";
import { RegistrationSettings } from "@/lib/server-manager/types";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Infer } from "spacetimedb";
import { useReducer } from "spacetimedb/react";
import {
  EditRegistrationSettingsSchema,
  EditRegistrationSettingsSchemaType,
} from "./edit-registration-settings-schema";

export default function EditRegistrationSettingsForm({
  registrationId,
  registrationSettings,
  callback,
}: {
  registrationId: number;
  registrationSettings: Infer<typeof RegistrationSettings>;
  callback?: () => void;
}) {
  const editRegistrationSettings = useReducer(
    reducers.registrationSettingsUpdate,
  );

  const form = useForm<EditRegistrationSettingsSchemaType>({
    resolver: zodResolver(EditRegistrationSettingsSchema),
    defaultValues: {
      type: registrationSettings.tag,
      ...(registrationSettings.tag === "Player"
        ? {
            playerLimit: registrationSettings.value.playerLimit,
          }
        : {}),
    },
  });

  async function onSubmit(values: EditRegistrationSettingsSchemaType) {
    try {
      const registrationSettings = {
        tag: "Player" as const,
        value: {
          playerLimit: values.playerLimit ?? 0,
        },
      };

      editRegistrationSettings({
        id: registrationId,
        settings: registrationSettings,
      });
      toast.success("Registration settings successfully updated");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to update registration settings", {
        description: getErrorMessage(error),
      });
    }
  }

  const type = form.watch("type");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name="type"
          label="Registration Type"
          placeholder="Select type"
          isRequired
          options={[
            {
              value: "Player",
              label: "Player",
            },
          ]}
          type="select"
          className="w-27"
        />

        {type === "Player" && (
          <>
            <FormElement
              name="playerLimit"
              label="Player Limit"
              placeholder="Player limit"
              type="number"
              isRequired
              min={0}
              className="w-27"
            />
          </>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
