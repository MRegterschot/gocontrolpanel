"use client";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { CompetitionV1, reducers } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Infer } from "spacetimedb";
import { useReducer } from "spacetimedb/react";
import {
  EditCompetitionSchema,
  EditCompetitionSchemaType,
} from "./edit-competition-schema";

export default function EditCompetitionForm({
  competition,
  callback,
}: {
  competition: Infer<typeof CompetitionV1>;
  callback?: () => void;
}) {
  const editCompetitionName = useReducer(reducers.competitionEditName);

  const form = useForm<EditCompetitionSchemaType>({
    resolver: zodResolver(EditCompetitionSchema),
    defaultValues: {
      name: competition.name,
    },
  });

  async function onSubmit(values: EditCompetitionSchemaType) {
    if (competition.name !== values.name) {
      try {
        editCompetitionName({
          name: values.name,
          competitionId: competition.id,
        });
      } catch (error) {
        toast.error("Failed to update stage name", {
          description: getErrorMessage(error),
        });
      }
    }

    toast.success("Stage successfully updated");
    callback?.();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name="name"
          label="Stage Name"
          placeholder="Enter stage name"
          isRequired
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
