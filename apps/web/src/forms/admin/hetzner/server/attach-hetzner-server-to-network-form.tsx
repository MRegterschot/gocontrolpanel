"use client";

import { getAllNetworks } from "@/actions/hetzner/networks";
import { attachHetznerServerToNetwork } from "@/actions/hetzner/servers";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AttachHetznerServerToNetworkSchema,
  AttachHetznerServerToNetworkSchemaType,
} from "./attach-hetzner-server-to-network-schema";
import { ServerError } from "@/types/responses";

export default function AttachHetznerServerToNetworkForm({
  projectId,
  serverId,
  callback,
}: {
  projectId: string;
  serverId: number;
  callback?: () => void;
}) {
  const [networks, setNetworks] = useState<HetznerNetwork[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);

      const [networksResult] = await Promise.allSettled([
        getAllNetworks(projectId),
      ]);

      // Handle networks
      if (networksResult.status === "fulfilled") {
        const { data, error } = networksResult.value;
        if (!error) {
          const filteredData = data.filter(
            (network) => !network.servers.includes(serverId),
          );
          setNetworks(filteredData);
        } else {
          toast.error("Failed to fetch networks", { description: error });
          setError("Failed to get networks: " + error);
        }
      } else {
        toast.error("Failed to fetch networks", {
          description: getErrorMessage(networksResult.reason),
        });
      }

      setLoading(false);
    }

    fetch();
  }, []);

  const form = useForm<AttachHetznerServerToNetworkSchemaType>({
    resolver: zodResolver(AttachHetznerServerToNetworkSchema),
  });

  async function onSubmit(values: AttachHetznerServerToNetworkSchemaType) {
    try {
      const { error } = await attachHetznerServerToNetwork(
        projectId,
        serverId,
        values,
      );
      if (error) {
        throw new ServerError(error, "AttachHetznerServerToNetworkError");
      }
      toast.success("Hetzner server attached to network successfully");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to attach Hetzner server", {
        description: getErrorMessage(error),
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
          name="networkId"
          label="Network"
          placeholder="Select a network"
          className="min-w-32"
          options={networks.map((nw) => ({
            value: nw.id.toString(),
            label: nw.name,
          }))}
          type="select"
          isRequired
        />

        <div className="flex flex-col text-sm">
          <span>IP Range</span>
          <span className="text-muted-foreground">
            {networks.find((nw) => nw.id.toString() === form.watch("networkId"))
              ?.ip_range || "-"}
          </span>
        </div>

        <FormElement
          name="ip"
          label="IP Address"
          placeholder="Enter IP address"
        />

        <Button
          type="submit"
          className="w-full mt-4"
          disabled={form.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Save
        </Button>
      </form>
    </Form>
  );
}
