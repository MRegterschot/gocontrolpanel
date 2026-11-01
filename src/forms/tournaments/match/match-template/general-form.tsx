"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { IconArrowNarrowRight } from "@tabler/icons-react";

// The server cannot rename a shared config yet, so the name is locked when editing.
export default function GeneralForm({ onNext, isEditing }: { onNext: () => void; isEditing?: boolean }) {
  return (
    <form className="flex flex-col gap-4">
      <FormElement
        name={"name"}
        label="Template Name"
        placeholder="Enter match template name"
        isRequired
        isDisabled={isEditing}
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
