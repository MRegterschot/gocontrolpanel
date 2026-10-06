"use client";

import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerServer, HetznerServerType } from "@/types/api/hetzner/servers";
import { IconArrowNarrowLeft, IconArrowNarrowRight } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import Flag from "react-world-flags";
import { AdvancedServerSetupSchemaType } from "./server-setup-schema";

export default function DatabaseForm({
  form,
  onNext,
  onBack,
  databases,
  serverTypes,
  locations,
  serverController,
}: {
  form: UseFormReturn<AdvancedServerSetupSchemaType>;
  onNext: () => void;
  onBack: () => void;
  databases: HetznerServer[];
  serverTypes: HetznerServerType[];
  locations: HetznerLocation[];
  serverController: string | undefined;
}) {
  const isFirstRender = useRef(true);

  const [creatingNewDatabase, setCreatingNewDatabase] = useState(false);
  const newDatabase = form.watch("database.new");

  const existingDatabase = form.watch("database.existing");

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (newDatabase) {
      form.reset({
        ...form.getValues(),
        database: {
          new: true,
          serverType:
            serverTypes.length > 0
              ? serverTypes.find((st) => st.name === "cpx11")?.id.toString() ||
                serverTypes[0].id.toString()
              : "",
          location:
            locations.length > 0
              ? locations.find((loc) => loc.name === "fsn1")?.name ||
                locations[0].name
              : "",
          name: "",
          databaseType: "mysql",
          databaseRootPassword: "",
          databaseName: "",
          databaseUser: "",
          databasePassword: "",
        },
      });
      setCreatingNewDatabase(true);
    } else {
      setCreatingNewDatabase(false);
    }
  }, [newDatabase]);

  useEffect(() => {
    async function check() {
      if (existingDatabase) {
        const db = databases.find(
          (db) => db.id.toString() === existingDatabase,
        );
        if (db) {
          form.reset({
            ...form.getValues(),
            database: {
              new: false,
              local: false,
              existing: db.id.toString(),
              name: db.name,
              serverType: db.server_type?.id.toString(),
              location: db.location.name,
              databaseType: db.labels["database.type"] || "mysql",
              databaseName: db.labels["authorization.database.name"] || "",
              databaseUser: db.labels["authorization.database.user"],
              databasePassword: db.labels["authorization.database.password"],
            },
          });
          await form.trigger("database");
        }
      }
    }

    check();
  }, [existingDatabase]);

  const selectedServerType = serverTypes.find(
    (type) => type.id.toString() === form.watch("database.serverType"),
  );

  const selectedLocation = locations.find(
    (location) => location.name === form.watch("database.location"),
  );

  const pricing =
    selectedServerType?.prices.find(
      (price) => price.location === selectedLocation?.name,
    ) || selectedServerType?.prices.find((price) => price.location === "fsn1");

  let databaseOptions = [];
  switch (serverController) {
    case "evosc":
    case "maniacontrol":
    case "pyplanet":
      databaseOptions = [
        { value: "mysql", label: "MySQL" },
        { value: "mariadb", label: "MariaDB" },
      ];
      break;
    case "minicontrol":
      databaseOptions = [
        { value: "mysql", label: "MySQL" },
        { value: "postgres", label: "PostgreSQL" },
        { value: "mariadb", label: "MariaDB" },
      ];
      break;
    default:
      databaseOptions = [
        { value: "mysql", label: "MySQL" },
        { value: "postgres", label: "PostgreSQL" },
        { value: "mariadb", label: "MariaDB" },
      ];
      break;
  }

  return (
    <form className={"flex flex-col gap-4"}>
      {creatingNewDatabase ? (
        <div className="gap-4 grid sm:grid-cols-2 sm:gap-8">
          <div className="flex flex-col gap-4">
            <FormElement
              name="database.new"
              label="New Database"
              type="checkbox"
              description="Create a new database for this server"
            />

            <FormElement
              name="database.local"
              label="Local Database"
              type="checkbox"
              description="Host the database on the same server instead of a separate one"
            />

            {!form.watch("database.local") && (
              <>
                <FormElement
                  name={"database.name"}
                  label="Server Name"
                  placeholder="Enter server name"
                  isRequired
                />

                <FormElement
                  name={"database.serverType"}
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
                            pricing.included_traffic /
                              1000 /
                              1000 /
                              1000 /
                              1000,
                          )} TB`
                        : "-"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {form.watch("database.local") && (
              <FormElement
                name={"database.databaseType"}
                label="Database Type"
                placeholder="Select database type"
                type="select"
                options={databaseOptions}
                isRequired
              />
            )}
          </div>

          <div className="flex flex-col gap-4">
            {!form.watch("database.local") && (
              <>
                <FormElement
                  name={"database.location"}
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
                    <span className="truncate">
                      {selectedLocation?.city || "-"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {!form.watch("database.local") && (
              <FormElement
                name={"database.databaseType"}
                label="Database Type"
                placeholder="Select database type"
                type="select"
                options={databaseOptions}
                isRequired
              />
            )}

            <FormElement
              name={"database.databaseRootPassword"}
              label="Database Root Password"
              placeholder="Enter database root password"
              type="password"
            />

            <FormElement
              name={"database.databaseName"}
              label="Database Name"
              placeholder="Enter database name"
            />

            <FormElement
              name={"database.databaseUser"}
              label="Database User"
              placeholder="Enter database user"
            />

            <FormElement
              name={"database.databasePassword"}
              label="Database Password"
              placeholder="Enter database password"
              type="password"
            />
          </div>
        </div>
      ) : (
        <>
          <FormElement
            name="database.new"
            label="New Database"
            type="checkbox"
            description="Create a new database for this server"
          />

          <FormElement
            name="database.existing"
            label="Existing Database"
            description="Select an existing database to use for this server"
            className="min-w-32"
            type="select"
            isRequired
            options={databases.map((db) => ({
              value: db.id.toString(),
              label: db.name,
            }))}
          />
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
