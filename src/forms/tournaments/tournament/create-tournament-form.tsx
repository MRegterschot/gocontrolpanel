"use client";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { reducers } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import {
  CreateTournamentSchema,
  CreateTournamentSchemaType,
} from "./create-tournament-schema";

export default function CreateTournamentForm({
  callback,
}: {
  callback?: () => void;
}) {
  const createTournament = useReducer(reducers.createTournament);

  const form = useForm<CreateTournamentSchemaType>({
    resolver: zodResolver(CreateTournamentSchema),
  });

  async function onSubmit(values: CreateTournamentSchemaType) {
    try {
      createTournament(values);

      toast.success("Tournament successfully created");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to create tournament", {
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
          label="Tournament Name"
          placeholder="Enter tournament name"
          isRequired
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconPlus />
          Create Tournament
        </Button>
      </form>
    </Form>
  );
}
