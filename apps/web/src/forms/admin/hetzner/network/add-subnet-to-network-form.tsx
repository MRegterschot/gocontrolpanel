"use client";

import { addSubnetToNetwork } from "@/actions/hetzner/networks";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useHetznerLocations } from "@/hooks/use-hetzner-queries";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getErrorMessage } from "@/lib/utils";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AddSubnetToNetworkSchema,
  AddSubnetToNetworkSchemaType,
} from "./add-subnet-to-network-schema";

export default function AddSubnetToNetworkForm({
  projectId,
  network,
  callback,
}: {
  projectId: string;
  network: HetznerNetwork;
  callback: () => void;
}) {
  const form = useForm<AddSubnetToNetworkSchemaType>({
    resolver: zodResolver(AddSubnetToNetworkSchema),
    defaultValues: {
      type: "cloud",
    },
  });

  const locationsQuery = useHetznerLocations(projectId);
  // One entry per network zone
  const locations = useMemo(
    () =>
      Array.from(
        new Map(
          (locationsQuery.data ?? []).map((loc) => [loc.network_zone, loc]),
        ),
      )
        .sort((a, b) => a[1].network_zone.localeCompare(b[1].network_zone))
        .map(([, loc]) => loc),
    [locationsQuery.data],
  );
  const loading = locationsQuery.isPending;
  const error = locationsQuery.error
    ? "Failed to get locations: " + getErrorMessage(locationsQuery.error)
    : null;
  useQueryErrorToast(locationsQuery.error, "Failed to fetch locations");

  useEffect(() => {
    if (!locationsQuery.data) return;
    form.setValue(
      "networkZone",
      locations.length > 0
        ? locations.find((loc) => loc.network_zone === "eu-central")
            ?.network_zone || locations[0].network_zone
        : "",
    );
     
  }, [locationsQuery.data]);

  async function onSubmit(values: AddSubnetToNetworkSchemaType) {
    try {
      const { error } = await addSubnetToNetwork(projectId, network.id, values);
      if (error) {
        throw new ServerError(error, "AddSubnetToNetworkError");
      }

      toast.success("Subnet successfully added to network");
      if (callback) {
        callback();
      }
    } catch (err) {
      toast.error("Failed to add Subnet to network", {
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
          name={"type"}
          placeholder="Select subnet type"
          className="min-w-32"
          type="select"
          options={[
            { value: "cloud", label: "Cloud" },
            { value: "server", label: "Server" },
          ]}
          isRequired
        />

        <FormElement
          name={"ipRange"}
          placeholder="Enter subnet IP range (e.g., 10.0.0.0/16)"
        />

        <FormElement
          name={"networkZone"}
          placeholder="Select network zone"
          className="min-w-32"
          type="select"
          options={locations.map((loc) => ({
            value: loc.network_zone,
            label: loc.network_zone,
          }))}
          isRequired
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconPlus />
          Add Subnet
        </Button>
      </form>
    </Form>
  );
}
