"use client";

import FormElement from "@/components/form/form-element";
import { FieldValues, Path } from "react-hook-form";

interface PositionInputProps<TControl extends FieldValues> {
  name: Path<TControl>;
  min?: number;
}

export default function PositionInput<TControl extends FieldValues>({
  name,
  min,
}: PositionInputProps<TControl>) {
  return (
    <div className="flex flex-col gap-1">
      <span>Position</span>

      <div className="grid grid-cols-2 gap-2">
        <FormElement
          name={`${name}.x` as Path<TControl & FieldValues>}
          label="X"
          type="number"
          placeholder="0"
          min={min}
        />
        <FormElement
          name={`${name}.y` as Path<TControl & FieldValues>}
          label="Y"
          type="number"
          placeholder="0"
          min={min}
        />
      </div>
    </div>
  );
}
