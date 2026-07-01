"use client";

import { getHetznerLocations } from "@/actions/hetzner/locations";
import { getServerTypes } from "@/actions/hetzner/server-types";
import { createHetznerDatabase } from "@/actions/hetzner/servers";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerServerType } from "@/types/api/hetzner/servers";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Flag from "react-world-flags";
import { toast } from "sonner";
import {
  AddHetznerDatabaseSchema,
  AddHetznerDatabaseSchemaType,
} from "./add-hetzner-database-schema";

export default function AddHetznerDatabaseForm({
  projectId,
  callback,
}: {
  projectId: string;
  callback?: () => void;
}) {
  const [locations, setLocations] = useState<HetznerLocation[]>([]);
  const [serverTypes, setServerTypes] = useState<HetznerServerType[]>([]);

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

      try {
        const { data, error } = await getServerTypes(projectId);
        if (error) {
          throw new Error(error);
        }
        setServerTypes(data);
        form.setValue(
          "serverType",
          data.length > 0
            ? data.find((st) => st.name === "cpx11")?.id.toString() ||
                data[0].id.toString()
            : "",
        );
      } catch (err) {
        setError("Failed to get server types: " + getErrorMessage(err));
        toast.error("Failed to fetch server types", {
          description: getErrorMessage(err),
        });
      }

      setLoading(false);
    }

    fetch();
  }, []);

  const form = useForm<AddHetznerDatabaseSchemaType>({
    resolver: zodResolver(AddHetznerDatabaseSchema),
    defaultValues: {
      databaseType: "mysql",
    },
  });

  async function onSubmit(values: AddHetznerDatabaseSchemaType) {
    try {
      const { error } = await createHetznerDatabase(projectId, values);
      if (error) {
        throw new Error(error);
      }

      toast.success("Hetzner database successfully created");
      if (callback) {
        callback();
      }
    } catch (error) {
      toast.error("Failed to create Hetzner database", {
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

  const selectedServerType = serverTypes.find(
    (type) => type.id.toString() === form.watch("serverType"),
  );

  const selectedLocation = locations.find(
    (location) => location.name === form.watch("location"),
  );

  const pricing =
    selectedServerType?.prices.find(
      (price) => price.location === selectedLocation?.name,
    ) || selectedServerType?.prices.find((price) => price.location === "fsn1");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="gap-4 grid sm:grid-cols-2 sm:gap-8"
      >
        <div className="flex flex-col gap-4">
          <FormElement
            name={"name"}
            label="Server Name"
            placeholder="Enter server name"
            isRequired
          />

          <FormElement
            name={"serverType"}
            label="Server Type"
            placeholder="Select server type"
            type="select"
            className="w-32"
            options={serverTypes.map((type) => ({
              value: type.id.toString(),
              label: type.name,
            }))}
            isRequired
          />

          {/* Database Type Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="font-semibold">Description</span>
              <span className="truncate">
                {selectedServerType?.description || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Cores</span>
              <span className="truncate">
                {selectedServerType?.cores || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Memory</span>
              <span className="truncate">
                {selectedServerType?.memory
                  ? `${selectedServerType.memory} GB`
                  : "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Disk</span>
              <span className="truncate">
                {selectedServerType?.disk
                  ? `${selectedServerType.disk} GB`
                  : "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">CPU Type</span>
              <span className="truncate">
                {selectedServerType?.cpu_type || "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Hourly Price</span>
              <span className="truncate">
                {pricing
                  ? `€${parseFloat(pricing.price_hourly.gross).toFixed(4)}`
                  : "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Monthly Price</span>
              <span className="truncate">
                {pricing
                  ? `€${parseFloat(pricing.price_monthly.gross).toFixed(4)}`
                  : "-"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">Included Traffic</span>
              <span className="truncate">
                {pricing
                  ? `${Math.floor(
                      pricing.included_traffic / 1000 / 1000 / 1000 / 1000,
                    )} TB`
                  : "-"}
              </span>
            </div>
          </div>
          <FormElement
            name={"location"}
            label="Location"
            placeholder="Select database location"
            type="select"
            className="w-64"
            options={locations.map((location) => ({
              value: location.name,
              label: location.description,
            }))}
            isRequired
          />

          {/* Location Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="font-semibold">Country</span>
              <span className="truncate">
                <Flag
                  className="h-4"
                  code={selectedLocation?.country}
                  fallback={selectedLocation?.country || "-"}
                />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">City</span>
              <span className="truncate">{selectedLocation?.city || "-"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <FormElement
            name={"databaseType"}
            label="Database Type"
            placeholder="Select database type"
            type="select"
            options={[
              { value: "mysql", label: "MySQL" },
              { value: "postgres", label: "PostgreSQL" },
              { value: "mariadb", label: "MariaDB" },
            ]}
            isRequired
          />

          <FormElement
            name={"databaseRootPassword"}
            label="Database Root Password"
            placeholder="Enter database root password"
            type="password"
          />

          <FormElement
            name={"databaseName"}
            label="Database Name"
            placeholder="Enter database name"
            isRequired
          />

          <FormElement
            name={"databaseUser"}
            label="Database User"
            placeholder="Enter database user"
          />

          <FormElement
            name={"databasePassword"}
            label="Database Password"
            placeholder="Enter database password"
            type="password"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            <IconPlus />
            Add Database
          </Button>
        </div>
      </form>
    </Form>
  );
}
