"use client";

import { getHetznerLocations } from "@/actions/hetzner/locations";
import { createHetznerVolume } from "@/actions/hetzner/volumes";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Flag from "react-world-flags";
import { toast } from "sonner";
import {
  AddHetznerVolumeSchema,
  AddHetznerVolumeSchemaType,
} from "./add-hetzner-volume-schema";

export default function AddHetznerVolumeForm({
  projectId,
  callback,
}: {
  projectId: string;
  callback: () => void;
}) {
  const [locations, setLocations] = useState<HetznerLocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await getHetznerLocations(projectId);
        if (error) {
          throw new Error(error);
        }
        setLocations(data);
        form.setValue(
          "location",
          data.length > 0
            ? data.find((loc) => loc.name === "fsn1")?.name || data[0].name
            : "",
        );
      } catch (err) {
        setError("Failed to get locations: " + getErrorMessage(err));
        toast.error("Failed to fetch locations", {
          description: getErrorMessage(err),
        });
      }

      setLoading(false);
    }

    fetch();
  }, []);

  const form = useForm<AddHetznerVolumeSchemaType>({
    resolver: zodResolver(AddHetznerVolumeSchema),
    defaultValues: {
      size: 10,
    },
  });

  async function onSubmit(values: AddHetznerVolumeSchemaType) {
    try {
      const { error } = await createHetznerVolume(projectId, values);
      if (error) {
        throw new Error(error);
      }

      toast.success("Hetzner volume successfully created");
      if (callback) {
        callback();
      }
    } catch (err) {
      toast.error("Failed to create Hetzner volume", {
        description: getErrorMessage(err),
      });
    }
  }

  const location = locations.find(
    (loc) => loc.name === form.watch("location"),
  );

  if (loading) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  if (error) {
    return <span>{error}</span>;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name="name"
          label="Volume Name"
          placeholder="Enter volume name"
          isRequired
        />

        <FormElement
          name="size"
          label="Size (GB)"
          placeholder="Enter size in GB"
          type="number"
          isRequired
        />

        <div className="flex gap-4 items-end truncate">
          <FormElement
            name="location"
            label="Location"
            placeholder="Select a location"
            type="select"
            options={locations.map((location) => ({
              value: location.name,
              label: location.description,
            }))}
            isRequired
          />

          {location && (
            <div className="flex items-center gap-2">
              <Flag
                code={location.country}
                className="h-10 w-10"
                fallback={location.country}
              />
              <span>{location.name}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          Save
        </Button>
      </form>
    </Form>
  );
}
