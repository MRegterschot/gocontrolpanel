"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { IconArrowNarrowRight } from "@tabler/icons-react";

export default function GeneralForm({ onNext }: { onNext: () => void }) {
  return (
    <form className="flex flex-col gap-4">
      <FormElement
        name={"name"}
        label="Template Name"
        placeholder="Enter match template name"
        isRequired
      />

      <div className="flex justify-end">
        <Button type="button" className="flex-1 max-w-32" onClick={onNext}>
          Next
          <IconArrowNarrowRight />
        </Button>
      </div>
    </form>
  );
}
