"use client";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { reducers, RegistrationSettings } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Infer, Timestamp } from "spacetimedb";
import { useReducer } from "spacetimedb/react";
import {
  EditRegistrationSettingsSchema,
  EditRegistrationSettingsSchemaType,
} from "./edit-registration-settings-schema";

export default function EditRegistrationSettingsForm({
  competitionId,
  registrationSettings,
  callback,
}: {
  competitionId: number;
  registrationSettings: Infer<typeof RegistrationSettings>;
  callback?: () => void;
}) {
  const editRegistrationSettings = useReducer(
    reducers.competitionRegistrationSettings,
  );

  const form = useForm<EditRegistrationSettingsSchemaType>({
    resolver: zodResolver(EditRegistrationSettingsSchema),
    defaultValues: {
      type: registrationSettings.tag,
      ...(registrationSettings.tag === "Players"
        ? {
            playerLimit: registrationSettings.value.playerLimit,
            registrationDeadline:
              registrationSettings.value.registrationDeadline.toDate(),
          }
        : {}),
      ...(registrationSettings.tag === "Team"
        ? {
            teamLimit: registrationSettings.value.teamLimit,
            teamSizeMin: registrationSettings.value.teamSizeMin,
            teamSizeMax: registrationSettings.value.teamSizeMax,
            registrationDeadline:
              registrationSettings.value.registrationDeadline.toDate(),
          }
        : {}),
    },
  });

  async function onSubmit(values: EditRegistrationSettingsSchemaType) {
    try {
      const registrationSettings =
        values.type === "Players"
          ? {
              tag: "Players" as const,
              value: {
                playerLimit: values.playerLimit ?? undefined,
                registrationDeadline: Timestamp.fromDate(
                  values.registrationDeadline,
                ),
              },
            }
          : values.type === "Team"
            ? {
                tag: "Team" as const,
                value: {
                  teamLimit: values.teamLimit ?? undefined,
                  teamSizeMin: values.teamSizeMin,
                  teamSizeMax: values.teamSizeMax,
                  registrationDeadline: Timestamp.fromDate(
                    values.registrationDeadline,
                  ),
                },
              }
            : {
                tag: "None" as const,
              };

      editRegistrationSettings({
        registrationSettings,
        competitionId: competitionId,
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
              value: "None",
              label: "None",
            },
            {
              value: "Players",
              label: "Players",
            },
            {
              value: "Team",
              label: "Team",
            },
          ]}
          type="select"
          className="w-27"
        />

        {type === "Players" && (
          <>
            <FormElement
              name="playerLimit"
              label="Player Limit"
              placeholder="Player limit"
              isRequired={false}
              type="number"
              min={0}
              className="w-27"
            />

            <FormElement
              name="registrationDeadline"
              label="Registration Deadline"
              placeholder="Registration deadline"
              isRequired
              type="datetime"
            />
          </>
        )}

        {type === "Team" && (
          <>
            <FormElement
              name="teamLimit"
              label="Team Limit"
              placeholder="Team limit"
              isRequired={false}
              min={0}
              type="number"
              className="w-27"
            />

            <div className="flex flex-col gap-2">
              <Label>
                Team Size
                <span className="text-xs text-muted-foreground">
                  (Required)
                </span>
              </Label>
              <div className="flex gap-2 items-center">
                <FormElement
                  name="teamSizeMin"
                  placeholder="Min"
                  isRequired
                  type="number"
                  min={0}
                  className="w-27"
                />

                <span>-</span>

                <FormElement
                  name="teamSizeMax"
                  placeholder="Max"
                  isRequired
                  type="number"
                  min={0}
                  className="w-27"
                />
              </div>
            </div>

            <FormElement
              name="registrationDeadline"
              label="Registration Deadline"
              placeholder="Registration d eadline"
              isRequired
              type="datetime"
            />
          </>
        )}

        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
