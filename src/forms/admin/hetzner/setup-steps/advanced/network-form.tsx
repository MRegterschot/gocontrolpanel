"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { FormLabel, FormMessage } from "@/components/ui/form";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { HetznerServer } from "@/types/api/hetzner/servers";
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useFieldArray, UseFormReturn } from "react-hook-form";
import { AdvancedServerSetupSchemaType } from "./server-setup-schema";

export default function NetworkForm({
  form,
  onNext,
  onBack,
  networks,
  databases,
  locations,
}: {
  form: UseFormReturn<AdvancedServerSetupSchemaType>;
  onNext: () => void;
  onBack: () => void;
  networks: HetznerNetwork[];
  databases: HetznerServer[];
  locations: HetznerLocation[];
}) {
  const isFirstRender = useRef(true);

  const uniqueLocations = Array.from(
    new Map(locations.map((loc) => [loc.network_zone, loc])),
  )
    .sort((a, b) => a[1].network_zone.localeCompare(b[1].network_zone))
    .map(([, loc]) => loc);

  const newNetwork = form.watch("network.new");

  const existingNetwork = form.watch("network.existing");

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (newNetwork) {
      remove();
      form.reset({
        ...form.getValues(),
        network: {
          new: true,
          name: "",
          ipRange: "10.0.0.0/16",
          subnets: [
            {
              type: "cloud",
              ipRange: "10.0.0.0/16",
              networkZone:
                uniqueLocations.length > 0
                  ? uniqueLocations.find(
                      (loc) => loc.network_zone === "eu-central",
                    )?.network_zone || uniqueLocations[0].network_zone
                  : "",
            },
          ],
          databaseIp: undefined,
        },
      });
    }
  }, [newNetwork]);

  useEffect(() => {
    async function check() {
      if (existingNetwork) {
        const nw = networks.find((nw) => nw.id.toString() === existingNetwork);
        if (nw) {
          const dbInNetwork = nw.servers.find(
            (s) => s.toString() === form.watch("database.existing"),
          );
          let existingDb: string | undefined;
          if (dbInNetwork) {
            existingDb = databases
              .find((db) => db.id === dbInNetwork)
              ?.private_net.find((net) => net.network === nw.id)?.ip;
          }

          form.reset({
            ...form.getValues(),
            network: {
              new: false,
              existing: nw.id.toString(),
              name: nw.name,
              ipRange: nw.ip_range,
              subnets: nw.subnets.map((subnet) => ({
                type: subnet.type,
                ipRange: subnet.ip_range,
                networkZone: subnet.network_zone,
              })),
              databaseIp: existingDb,
              databaseInNetwork: !!existingDb,
            },
          });
        }
      }
    }

    check();
  }, [existingNetwork]);

  const { control } = form;
  const {
    fields: subnets,
    append,
    remove,
  } = useFieldArray({
    control,
    name: "network.subnets",
  });

  return (
    <form className={"flex flex-col gap-4"}>
      <FormElement
        name="network.new"
        label="New Network"
        type="checkbox"
        description="Create a new network for this server"
      />

      {newNetwork ? (
        <>
          <FormElement
            name="network.name"
            label="Network Name"
            placeholder="Enter network name"
            isRequired
          />

          <FormElement
            name="network.ipRange"
            label="IP Range"
            placeholder="Enter IP range (e.g., 10.0.0.0/16)"
            isRequired
          />

          <div className="flex flex-col gap-2">
            <FormLabel data-error={!!form.formState.errors.network?.subnets}>
              Subnets{" "}
              <span
                className="text-xs text-muted-foreground data-[error=true]:text-destructive"
                data-error={!!form.formState.errors.network?.subnets}
              >
                (Required)
              </span>
            </FormLabel>
            {subnets.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row gap-2">
                <div className="flex gap-2">
                  <FormElement
                    name={`network.subnets.${index}.type`}
                    placeholder="Select subnet type"
                    type="select"
                    options={[
                      { value: "cloud", label: "Cloud" },
                      { value: "server", label: "Server" },
                    ]}
                    isRequired
                  />

                  <FormElement
                    name={`network.subnets.${index}.ipRange`}
                    placeholder="Enter subnet IP range (e.g., 10.0.0.0/16)"
                    className="max-w-32"
                  />
                </div>

                <div className="flex gap-2">
                  <FormElement
                    name={`network.subnets.${index}.networkZone`}
                    placeholder="Select network zone"
                    className="max-w-24"
                    type="select"
                    options={uniqueLocations.map((loc) => ({
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
                    uniqueLocations.length > 0
                      ? uniqueLocations.find(
                          (loc) => loc.network_zone === "eu-central",
                        )?.network_zone || uniqueLocations[0].network_zone
                      : "",
                })
              }
            >
              <IconPlus />
              Add Subnet
            </Button>

            {form.formState.errors.network?.subnets && (
              <FormMessage className="text-destructive text-xs">
                {form.formState.errors.network.subnets.message}
              </FormMessage>
            )}
          </div>
        </>
      ) : (
        <>
          <FormElement
            name="network.existing"
            label="Existing Network"
            description="Select an existing network to use for this server"
            className="min-w-32"
            type="select"
            options={networks.map((nw) => ({
              value: nw.id.toString(),
              label: nw.name,
            }))}
            isRequired
          />

          <div className="flex flex-col text-sm">
            <span>IP Range</span>
            <span className="text-muted-foreground">
              {form.watch("network.ipRange") || "-"}
            </span>
          </div>
        </>
      )}

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
