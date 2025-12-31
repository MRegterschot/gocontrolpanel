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
import { Infer, Timestamp } from "spacetimedb";
import { useReducer } from "spacetimedb/react";
import {
  EditTournamentSchema,
  EditTournamentSchemaType,
} from "./edit-tournament-schema";

export default function EditTournamentForm({
  tournament,
  callback,
}: {
  tournament: Infer<typeof TournamentV1>;
  callback?: () => void;
}) {
  const editTournamentName = useReducer(reducers.tournamentEditName);
  const editTournamentDescription = useReducer(
    reducers.tournamentEditDescription,
  );
  const editTournamentDates = useReducer(reducers.tournamentEditDates);

  const form = useForm<EditTournamentSchemaType>({
    resolver: zodResolver(EditTournamentSchema),
    defaultValues: {
      name: tournament.name,
      description: tournament.description,
      startDate: tournament.startingAt.toDate(),
      endDate: tournament.endingAt.toDate(),
    },
  });

  async function onSubmit(values: EditTournamentSchemaType) {
    const startDateModified =
      tournament.startingAt.toDate().getTime() !== values.startDate.getTime();
    const endDateModified =
      tournament.endingAt.toDate().getTime() !== values.endDate.getTime();

    // Don't allow modifying startDate if tournament already started
    if (startDateModified && new Date() >= tournament.startingAt.toDate()) {
      toast.error(
        "Cannot modify start date of a tournament that has already started",
      );
      form.resetField("startDate", {
        defaultValue: tournament.startingAt.toDate(),
      });
      return;
    }

    // Don't allow modifying ending_at if tournament already ended
    if (endDateModified && new Date() >= tournament.endingAt.toDate()) {
      toast.error(
        "Cannot modify end date of a tournament that has already ended",
      );
      form.resetField("endDate", {
        defaultValue: tournament.endingAt.toDate(),
      });
      return;
    }

    if (tournament.name !== values.name) {
      try {
        editTournamentName({
          tournamentId: tournament.id,
          name: values.name,
        });
      } catch (error) {
        toast.error("Failed to update name", {
          description: getErrorMessage(error),
        });
      }
    }

    if (tournament.description !== values.description) {
      try {
        editTournamentDescription({
          tournamentId: tournament.id,
          description: values.description || "",
        });
      } catch (error) {
        toast.error("Failed to update description", {
          description: getErrorMessage(error),
        });
      }
    }

    if (startDateModified || endDateModified) {
      try {
        editTournamentDates({
          tournamentId: tournament.id,
          startingAt: Timestamp.fromDate(values.startDate),
          endingAt: Timestamp.fromDate(values.endDate),
        });
      } catch (error) {
        toast.error("Failed to update tournament dates", {
          description: getErrorMessage(error),
        });
      }
    }

    toast.success("Tournament successfully updated");
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
          label="Tournament Name"
          placeholder="Enter tournament name"
          isRequired
        />

        <FormElement
          name="description"
          label="Description"
          placeholder="Enter tournament description"
          type="textarea"
        />

        <FormElement
          name="startDate"
          label="Start Date"
          type="datetime"
          isRequired
          isDisabled={
            tournament.status.tag === "Ongoing" ||
            tournament.status.tag === "Ended"
          }
          tooltip="Can't edit the start date once the tournament has started."
        />

        <FormElement
          name="endDate"
          label="End Date"
          type="datetime"
          isRequired
          isDisabled={tournament.status.tag === "Ended"}
          tooltip="Can't edit the end date once the tournament has ended."
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
