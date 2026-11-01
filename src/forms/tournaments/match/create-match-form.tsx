"use client";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { reducers } from "@/lib/server-manager";
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
  competitionId: parentId,
  callback,
}: {
  competitionId: number;
  callback?: () => void;
}) {
  const createMatch = useReducer(reducers.matchCreate);

  const form = useForm<CreateMatchSchemaType>({
    resolver: zodResolver(CreateMatchSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit({ name }: CreateMatchSchemaType) {
    try {
      // Templates are not implemented on the server yet (`with_template != 0` is a todo).
      await createMatch({ name, parentId, position: { x: 0, y: 0 }, withTemplate: 0, asTemplate: false });
      toast.success("Match successfully created");
      callback?.();
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
        <FormElement
          name="name"
          label="Match Name"
          type="text"
          placeholder="Enter match name"
        />

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
