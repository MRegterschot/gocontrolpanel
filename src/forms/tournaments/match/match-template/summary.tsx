"use client";

import { Button } from "@/components/ui/button";
import { reducers } from "@/lib/tourney-manager";
import { getErrorMessage } from "@/lib/utils";
import { IconArrowNarrowLeft, IconPlus } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import { CreateMatchTemplateSchemaType } from "./create-match-template-schema";

export default function MatchTemplateSummary({
  form,
  onBack,
  callback,
}: {
  form: UseFormReturn<CreateMatchTemplateSchemaType>;
  onBack: () => void;
  callback?: () => void;
}) {
  const createMatchTemplate = useReducer(reducers.createMatchTemplate);

  async function onSubmit(values: CreateMatchTemplateSchemaType) {
    try {
      createMatchTemplate(values);

      toast.success("Match template successfully created");
      callback?.();
    } catch (error) {
      toast.error("Failed to create match template", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-4">
        <div className="gap-4 grid sm:grid-cols-2 sm:gap-8 text-sm"></div>

        <div className="flex gap-2 justify-between">
          <Button
            className="flex-1 max-w-32"
            variant="outline"
            onClick={onBack}
          >
            <IconArrowNarrowLeft />
            Previous
          </Button>
          <Button
            className="flex-1 max-w-fit"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            type="submit"
          >
            <IconPlus />
            Create Template
          </Button>
        </div>
      </div>
    </form>
  );
}
