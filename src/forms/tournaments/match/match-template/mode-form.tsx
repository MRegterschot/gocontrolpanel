"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { ModeConfigSchema } from "@/types/tm-tourney-manager/config";
import { IconArrowNarrowLeft, IconArrowNarrowRight } from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import { CreateMatchTemplateSchemaType } from "./create-match-template-schema";
import RoundsForm from "./modes/rounds-form";

const MODES_OPTIONS = ModeConfigSchema.options.map((o) => ({
  label: o.shape.tag.value,
  value: o.shape.tag.value,
}));

export default function ModeForm({
  form,
  onNext,
  onBack,
}: {
  form: UseFormReturn<CreateMatchTemplateSchemaType>;
  onNext: () => void;
  onBack: () => void;
}) {
  const mode = form.watch("config.mode.tag");

  return (
    <form className="flex flex-col gap-4">
      <FormElement
        label="Game Mode"
        name="config.mode.tag"
        type="select"
        className="w-full max-w-32"
        options={MODES_OPTIONS}
        isRequired
      />

      {mode === "Rounds" && <RoundsForm form={form} />}

      <div className="flex gap-2 justify-between">
        <Button className="flex-1 max-w-32" variant="outline" onClick={onBack}>
          <IconArrowNarrowLeft />
          Previous
        </Button>
        <Button className="flex-1 max-w-32" type="button" onClick={onNext}>
          Next
          <IconArrowNarrowRight />
        </Button>
      </div>
    </form>
  );
}
