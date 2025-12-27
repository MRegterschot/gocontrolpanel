"use client";
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
  CreateMatchSchema,
  CreateMatchSchemaType,
} from "./create-match-schema";

export default function CreateMatchForm({
  competitionId,
  callback,
}: {
  competitionId: number;
  callback?: () => void;
}) {
  const createMatch = useReducer(reducers.createMatch);

  const form = useForm<CreateMatchSchemaType>({
    resolver: zodResolver(CreateMatchSchema),
    defaultValues: {
      competitionId: competitionId,
      withTemplate: undefined,
    },
  });

  async function onSubmit(values: CreateMatchSchemaType) {
    try {
      createMatch({
        ...values,
        withTemplate: values.withTemplate ?? undefined,
      });

      toast.success("Match successfully created");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to create match", {
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
        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconPlus />
          Create Match
        </Button>
      </form>
    </Form>
  );
}
