"use client";

import FormElement from "@/components/form/form-element";
import PositionInput from "@/components/form/manialink/position-input";

export default function DefaultAttributesForm() {
  return (
    <>
      <PositionInput name="pos" min={-1000} />

      <FormElement
        name="zIndex"
        label="Z Index"
        type="number"
        placeholder="0"
      />

      <FormElement name="scale" label="Scale" type="number" placeholder="1" />

      <FormElement name="rot" label="Rotation" type="number" placeholder="0" />

      <FormElement name="id" label="Id" placeholder="my-element" />

      <FormElement name="class" label="Class" placeholder="my-class" />
      <FormElement name="hidden" label="Hidden" type="checkbox" />
    </>
  );
}
