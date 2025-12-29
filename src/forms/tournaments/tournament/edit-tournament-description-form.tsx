"use client";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { reducers, TournamentV1 } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Infer } from "spacetimedb";
import { useReducer } from "spacetimedb/react";
import {
  EditTournamentDescriptionSchema,
  EditTournamentDescriptionSchemaType,
} from "./edit-tournament-description-schema";

export default function EditTournamentDescriptionForm({
  tournament,
  callback,
}: {
  tournament: Infer<typeof TournamentV1>;
  callback?: () => void;
}) {
  const editTournamentDescription = useReducer(
    reducers.tournamentEditDescription,
  );

  const form = useForm<EditTournamentDescriptionSchemaType>({
    resolver: zodResolver(EditTournamentDescriptionSchema),
    defaultValues: {
      description: tournament.description,
    },
  });

  async function onSubmit(values: EditTournamentDescriptionSchemaType) {
    try {
      editTournamentDescription({
        tournamentId: tournament.id,
        description: values.description || "",
      });
      toast.success("Description successfully updated");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to update description", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-2"
      >
        <FormElement
          name="description"
          placeholder="Enter description"
          isRequired
          rootClassName="max-w-full"
          className="text-sm"
          type="textarea"
        />

        <Button
          type="submit"
          className="w-20"
          size={"sm"}
          disabled={form.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
