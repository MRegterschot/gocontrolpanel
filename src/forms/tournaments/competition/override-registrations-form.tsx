"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form, FormLabel } from "@/components/ui/form";
import { reducers } from "@/lib/server-manager";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import {
  OverrideRegistrationsSchema,
  OverrideRegistrationsSchemaType,
} from "./override-registrations-schema";

export default function OverrideRegistrationsForm({
  registrationId,
  callback,
}: {
  registrationId: number;
  callback?: () => void;
}) {
  const overrideRegistrations = useReducer(
    reducers.unstableManualRegisterOverridePlayers,
  );

  const form = useForm<OverrideRegistrationsSchemaType>({
    resolver: zodResolver(OverrideRegistrationsSchema),
    defaultValues: {
      players: [],
    },
  });

  const { control } = form;
  const {
    fields: playerFields,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "players",
  });

  async function handleSubmit(values: OverrideRegistrationsSchemaType) {
    try {
      overrideRegistrations({
        players: values.players?.map((player) => player.accountId) || [],
        registrationId,
      });
      toast.success("Registrations successfully overridden");
      callback?.();
    } catch (error) {
      toast.error("Failed to override registrations", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        {/* Players */}
        <div className="flex flex-col gap-2">
          <div>
            <FormLabel className="text-sm">Players</FormLabel>
          </div>
          {playerFields.map((_, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1">
                <FormElement
                  name={`players.${index}.accountId`}
                  className="w-full"
                  placeholder="Player Account ID"
                  type="text"
                />
              </div>
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
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ accountId: "" })}
          >
            <IconPlus />
            Add Player
          </Button>

          <div className="flex justify-between mt-4">
            <Button variant={"outline"} onClick={callback} className="self-end">
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
