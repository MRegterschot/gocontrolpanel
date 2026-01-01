"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { UseFormReturn } from "react-hook-form";
import { CreateMatchTemplateSchemaType } from "./create-match-template-schema";

export default function MapsForm({
  form,
  onNext,
  onBack,
}: {
  form: UseFormReturn<CreateMatchTemplateSchemaType>;
  onNext: () => void;
  onBack: () => void;
}) {
  const mapUids = form.watch("config.maps.mapUids");

  return (
    <form className="flex flex-col gap-4">
      <FormElement
        label="Start Index"
        name={"config.maps.start"}
        type="number"
        min={0}
        step={1}
        isRequired
        max={mapUids.length}
        className="w-full max-w-20"
      />

      <div className="flex flex-col gap-2">
        <FormLabel className="text-sm">Maps</FormLabel>
        {mapUids.map((_, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="flex-1">
              <FormElement
                name={`config.maps.mapUids.${index}` as const}
                className="w-full"
                placeholder="Enter map uid"
              />
            </div>

            <Button
              type="button"
              variant="destructive"
              size={"icon"}
              onClick={() => {
                const currentMapUids = form.getValues("config.maps.mapUids");
                form.setValue(
                  "config.maps.mapUids",
                  currentMapUids.filter((_, i) => i !== index),
                );
              }}
            >
              <IconTrash />
              <span className="sr-only">Remove Map</span>
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const currentMapUids = form.getValues("config.maps.mapUids") || [];
            form.setValue("config.maps.mapUids", [...currentMapUids, ""]);
          }}
        >
          <IconPlus />
          Add Map
        </Button>
      </div>

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
