"use client";

import { getAllNetworks } from "@/actions/hetzner/networks";
import { detachHetznerServerFromNetwork } from "@/actions/hetzner/servers";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  DetachServerFromNetworkSchema,
  DetachServerFromNetworkSchemaType,
} from "./detach-server-from-network-schema";

export default function DetachServerFromNetworkForm({
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
        const { ok, data, error } = networksResult.value;
        if (ok) {
          const filteredNetworks = data.filter((network) =>
            network.servers.includes(serverId),
          );
          setNetworks(filteredNetworks);
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

  const form = useForm<DetachServerFromNetworkSchemaType>({
    resolver: zodResolver(DetachServerFromNetworkSchema),
  });

  async function onSubmit(values: DetachServerFromNetworkSchemaType) {
    try {
      const { error } = await detachHetznerServerFromNetwork(
        projectId,
        serverId,
        parseInt(values.network),
      );
      if (error) {
        throw new ServerError(error, "DetachHetznerServerFromNetworkError");
      }
      toast.success("Server successfully detached from network");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to detach server", {
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
          name="network"
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
