"use client";

import { removeSubnetFromNetwork } from "@/actions/hetzner/networks";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconMinus } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  RemoveSubnetFromNetworkSchema,
  RemoveSubnetFromNetworkSchemaType,
} from "./remove-subnet-from-network-schema";
import { ServerError } from "@/types/responses";

export default function RemoveSubnetFromNetworkForm({
  projectId,
  network,
  callback,
}: {
  projectId: string;
  network: HetznerNetwork;
  callback: () => void;
}) {
  const form = useForm<RemoveSubnetFromNetworkSchemaType>({
    resolver: zodResolver(RemoveSubnetFromNetworkSchema),
  });

  async function onSubmit(values: RemoveSubnetFromNetworkSchemaType) {
    try {
      const { error } = await removeSubnetFromNetwork(
        projectId,
        network.id,
        values,
      );
      if (error) {
        throw new ServerError(error, "RemoveSubnetFromNetworkError");
      }

      toast.success("Subnet successfully removed from network");
      if (callback) {
        callback();
      }
    } catch (err) {
      toast.error("Failed to remove Subnet from network", {
        description: getErrorMessage(err),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <FormElement
          name={"ipRange"}
          label="IP Range"
          placeholder="Select IP range"
          className="min-w-32"
          type="select"
          options={network.subnets
            .filter((sn) => sn.ip_range !== undefined)
            .map((sn) => ({
              value: sn.ip_range || "",
              label: sn.ip_range || "",
            }))}
          isRequired
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconMinus />
          Remove Subnet
        </Button>
      </form>
    </Form>
  );
}
