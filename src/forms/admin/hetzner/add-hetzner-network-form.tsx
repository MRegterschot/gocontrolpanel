"use client";

import { getHetznerLocations } from "@/actions/hetzner/locations";
import { createHetznerNetwork } from "@/actions/hetzner/networks";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form, FormLabel } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AddHetznerNetworkSchema,
  AddHetznerNetworkSchemaType,
} from "./add-hetzner-network-schema";

export default function AddHetznerNetworkForm({
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
        // Remove duplicates based on network_zone
        const uniqueLocations = Array.from(
          new Map(data.map((loc) => [loc.network_zone, loc])),
        )
          .sort((a, b) => a[1].network_zone.localeCompare(b[1].network_zone))
          .map(([, loc]) => loc);
        setLocations(uniqueLocations);
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

  const form = useForm<AddHetznerNetworkSchemaType>({
    resolver: zodResolver(AddHetznerNetworkSchema),
  });

  const { control } = form;
  const {
    fields: subnets,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "subnets",
  });

  async function onSubmit(values: AddHetznerNetworkSchemaType) {
    try {
      const { error } = await createHetznerNetwork(projectId, values);
      if (error) {
        throw new Error(error);
      }

      toast.success("Hetzner network successfully created");
      if (callback) {
        callback();
      }
    } catch (err) {
      toast.error("Failed to create Hetzner network", {
        description: getErrorMessage(err),
      });
    }
  }

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
          label="Network Name"
          placeholder="Enter network name"
          isRequired
        />

        <FormElement
          name="ipRange"
          label="IP Range"
          placeholder="Enter IP range (e.g., 10.0.0.0/16)"
          isRequired
        />

        <div className="flex flex-col gap-2">
          <FormLabel>Subnets</FormLabel>
          {subnets.map((_, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-2">
              <FormElement
                name={`subnets.${index}.type`}
                placeholder="Select subnet type"
                type="select"
                options={[
                  { value: "cloud", label: "Cloud" },
                  { value: "server", label: "Server" },
                  { value: "vswitch", label: "VSwitch" },
                ]}
                isRequired
              />

              <FormElement
                name={`subnets.${index}.ipRange`}
                placeholder="Enter subnet IP range"
              />
              </div>

<div className="flex gap-2">
              <FormElement
                name={`subnets.${index}.networkZone`}
                placeholder="Select network zone"
                type="select"
                options={locations.map((loc) => ({
                  value: loc.network_zone,
                  label: loc.network_zone,
                }))}
                isRequired
              />

              <Button
                type="button"
                variant="destructive"
                size={"icon"}
                onClick={() => remove(index)}
              >
                <IconTrash />
                <span className="sr-only">Remove Subnet</span>
              </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                type: "cloud",
                networkZone:
                  locations.length > 0
                    ? locations.find((loc) => loc.network_zone === "eu-central")
                        ?.network_zone || locations[0].network_zone
                    : "",
              })
            }
          >
            <IconPlus />
            Add Subnet
          </Button>
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
