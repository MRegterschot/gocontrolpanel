"use client";

import { attachVolumeToServer, getAllVolumes } from "@/actions/hetzner/volumes";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerVolume } from "@/types/api/hetzner/volumes";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  AttachVolumeToServerSchema,
  AttachVolumeToServerSchemaType,
} from "../volume/attach-volume-to-server-schema";

export default function AttachVolumeToServerForm({
  projectId,
  serverId,
  locationId,
  callback,
}: {
  projectId: string;
  serverId: number;
  locationId: number;
  callback?: () => void;
}) {
  const [volumes, setVolumes] = useState<HetznerVolume[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);

      const [volumesResult] = await Promise.allSettled([
        getAllVolumes(projectId),
      ]);

      if (volumesResult.status === "fulfilled") {
        const { data, error } = volumesResult.value;
        if (!error) {
          const filteredData = data.filter(
            (volume) => !volume.server && volume.location.id === locationId,
          );
          setVolumes(filteredData);
        } else {
          toast.error("Failed to fetch volumes", { description: error });
          setError("Failed to get volumes: " + error);
        }
      } else {
        setError(getErrorMessage(volumesResult.reason));
        toast.error("Failed to fetch volumes", {
          description: getErrorMessage(volumesResult.reason),
        });
      }

      setLoading(false);
    }

    fetch();
  }, []);

  const form = useForm<AttachVolumeToServerSchemaType>({
    resolver: zodResolver(AttachVolumeToServerSchema),
    defaultValues: {
      serverId: serverId.toString(),
    },
  });

  async function onSubmit(values: AttachVolumeToServerSchemaType) {
    try {
      const { error } = await attachVolumeToServer(
        projectId,
        parseInt(values.volumeId),
        parseInt(values.serverId),
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Volume successfully attached to server");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to attach volume", {
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
          name="volumeId"
          label="Volume"
          placeholder="Select a volume"
          className="min-w-32"
          options={volumes.map((nw) => ({
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
