"use client";

import FormElement from "@/components/form/form-element";
import { FieldValues, Path } from "react-hook-form";

export default function FourSideInput<TControl extends FieldValues>({
  name,
  label,
  min,
}: {
  name: Path<TControl>;
  label: string;
  min?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span>{label}</span>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <FormElement
          name={`${name}.top` as Path<TControl & FieldValues>}
          label="Top"
          type="number"
          placeholder="0"
          min={min}
        />
        <FormElement
          name={`${name}.right` as Path<TControl & FieldValues>}
          label="Right"
          type="number"
          placeholder="0"
          min={min}
        />
        <FormElement
          name={`${name}.bottom` as Path<TControl & FieldValues>}
          label="Bottom"
          type="number"
          placeholder="0"
          min={min}
        />
        <FormElement
          name={`${name}.left` as Path<TControl & FieldValues>}
          label="Left"
          type="number"
          placeholder="0"
          min={min}
        />
      </div>
    </div>
  );
}
