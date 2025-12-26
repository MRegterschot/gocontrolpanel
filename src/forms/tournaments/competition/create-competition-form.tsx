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
  CreateCompetitionSchema,
  CreateCompetitionSchemaType,
} from "./create-competition-schema";

export default function CreateCompetitionForm({
  parentId,
  callback,
}: {
  parentId: number;
  callback?: () => void;
}) {
  const createCompetition = useReducer(reducers.createCompetition);

  const form = useForm<CreateCompetitionSchemaType>({
    resolver: zodResolver(CreateCompetitionSchema),
    defaultValues: {
      parentId: parentId,
      withTemplate: undefined,
    },
  });

  async function onSubmit(values: CreateCompetitionSchemaType) {
    try {
      createCompetition({
        ...values,
        withTemplate: values.withTemplate ?? undefined,
      });

      toast.success("Stageg successfully created");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to create stage", {
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
          label="Stage Name"
          placeholder="Enter stage name"
          isRequired
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconPlus />
          Create Stage
        </Button>
      </form>
    </Form>
  );
}
