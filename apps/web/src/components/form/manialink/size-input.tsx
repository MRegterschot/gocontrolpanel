"use client";

import FormElement from "@/components/form/form-element";
import { FieldValues, Path } from "react-hook-form";

interface SizeInputProps<TControl extends FieldValues> {
  name: Path<TControl>;
  min?: number;
}

export default function SizeInput<TControl extends FieldValues>({
  name,
  min = 0,
}: SizeInputProps<TControl>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <FormElement
        name={`${name}.width` as Path<TControl & FieldValues>}
        label="Width"
        type="number"
        placeholder="0"
        min={min}
      />

      <FormElement
        name={`${name}.height` as Path<TControl & FieldValues>}
        label="Height"
        type="number"
        placeholder="0"
        min={min}
      />
    </div>
  );
}
