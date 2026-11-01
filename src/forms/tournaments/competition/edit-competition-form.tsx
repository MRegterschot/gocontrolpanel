"use client";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useServerAction } from "@/hooks/tournaments/use-server-action";
import { reducers } from "@/lib/server-manager";
import { CompetitionV1, NodeHandle } from "@/lib/server-manager/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { useReducer } from "spacetimedb/react";
import {
  EditCompetitionSchema,
  EditCompetitionSchemaType,
} from "./edit-competition-schema";

export default function EditCompetitionForm({
  competition,
  callback,
}: {
  competition: CompetitionV1;
  callback?: () => void;
}) {
  // competition_edit_name is commented out on the server, node_name_edit covers competitions too.
  const editName = useServerAction(
    useReducer(reducers.nodeNameEdit),
    "Failed to update stage name",
    "Stage successfully updated",
  );

  const form = useForm<EditCompetitionSchemaType>({
    resolver: zodResolver(EditCompetitionSchema),
    defaultValues: {
      name: competition.name,
    },
  });

  async function onSubmit({ name }: EditCompetitionSchemaType) {
    if (name === competition.name) return callback?.();
    if (await editName({ node: NodeHandle.CompetitionV1(competition.id), name })) callback?.();
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
