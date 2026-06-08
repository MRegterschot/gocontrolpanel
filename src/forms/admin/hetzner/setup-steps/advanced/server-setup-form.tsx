"use client";

import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerNetwork } from "@/types/api/hetzner/networks";
import { HetznerServer, HetznerServerType } from "@/types/api/hetzner/servers";
import { HetznerSSHKey } from "@/types/api/hetzner/ssh-keys";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import DatabaseForm from "./database-form";
import NetworkForm from "./network-form";
import ServerControllerForm from "./server-controller-form";
import ServerForm from "./server-form";
import {
  AdvancedServerSetupSchema,
  AdvancedServerSetupSchemaType,
} from "./server-setup-schema";
import Summary from "./summary";

type Steps = "server" | "serverController" | "database" | "network" | "summary";

export default function AdvancedServerSetupForm({
  projectId,
  locations,
  databases,
  serverTypes,
  networks,
  sshKeys,
  callback,
}: {
  projectId: string;
  locations: HetznerLocation[];
  databases: HetznerServer[];
  serverTypes: HetznerServerType[];
  networks: HetznerNetwork[];
  sshKeys: HetznerSSHKey[];
  callback?: () => void;
}) {
  const [step, setStep] = useState<Steps>("server");

  const form = useForm<AdvancedServerSetupSchemaType>({
    resolver: zodResolver(AdvancedServerSetupSchema),
    mode: "onChange",
    defaultValues: {
      server: {
        location:
          locations.length > 0
            ? locations.find((loc) => loc.name === "fsn1")?.name ||
              locations[0]?.name
            : "",
        serverType:
          serverTypes.length > 0
            ? serverTypes
                .find((type) => type.name === "cpx11")
                ?.id.toString() || serverTypes[0]?.id.toString()
            : "",
      },
      serverController: undefined,
      database: undefined,
      network: undefined,
    },
  });

  const controllerSelected = form.watch("server.controller");
  const selectedController = form.watch("serverController.type");
  const localDatabase = form.watch("database.local");

  useEffect(() => {
    if (!controllerSelected) {
      form.reset({
        ...form.getValues(),
        serverController: undefined,
        database: undefined,
        network: undefined,
      });
    }
  }, [controllerSelected]);

  useEffect(() => {
    if (localDatabase) {
      form.reset({
        ...form.getValues(),
        network: undefined,
      });
    }
  }, [localDatabase]);

  const nextStep = async () => {
    if (step !== "summary") {
      const valid = await form.trigger(
        step as "server" | "serverController" | "database" | "network",
      );
      if (!valid) return;
    }

    switch (step) {
      case "server":
        setStep(controllerSelected ? "serverController" : "summary");
        break;
      case "serverController":
        setStep("database");
        break;
      case "database":
        setStep(localDatabase ? "summary" : "network");
        break;
      case "network":
        setStep("summary");
        break;
    }
  };

  const previousStep = () => {
    switch (step) {
      case "serverController":
        setStep("server");
        break;
      case "database":
        setStep("serverController");
        break;
      case "network":
        setStep("database");
        break;
      case "summary":
        if (!controllerSelected) {
          setStep("server");
        } else {
          setStep(localDatabase ? "database" : "network");
        }
        break;
      default:
        setStep("server");
    }
  };

  const filterDatabaseOnControllerType = (db: HetznerServer) => {
    if (!selectedController) return true;

    switch (selectedController) {
      case "evosc":
      case "pyplanet":
      case "maniacontrol":
        return ["mariadb", "mysql"].includes(db.labels["database.type"]);
      case "minicontrol":
        return ["mariadb", "mysql", "postgres"].includes(
          db.labels["database.type"],
        );
      default:
        return true;
    }
  };

  return (
    <Tabs value={step} onValueChange={() => {}} className="w-full gap-3">
      <TabsList className="w-full">
        <TabsTrigger value="server" className="cursor-default">
          Server
        </TabsTrigger>
        <TabsTrigger value="serverController" className="cursor-default">
          Controller
        </TabsTrigger>
        <TabsTrigger value="database" className="cursor-default">
          Database
        </TabsTrigger>
        <TabsTrigger value="network" className="cursor-default">
          Network
        </TabsTrigger>
        <TabsTrigger value="summary" className="cursor-default">
          Summary
        </TabsTrigger>
      </TabsList>

      <Form {...form}>
        <TabsContent value="server">
          <ServerForm
            form={form}
            onNext={nextStep}
            locations={locations}
            serverTypes={serverTypes}
            sshKeys={sshKeys}
          />
        </TabsContent>

        <TabsContent value="serverController">
          <ServerControllerForm
            form={form}
            onNext={nextStep}
            onBack={previousStep}
          />
        </TabsContent>

        <TabsContent value="database">
          <DatabaseForm
            form={form}
            onNext={nextStep}
            onBack={previousStep}
            databases={databases.filter(filterDatabaseOnControllerType)}
            serverTypes={serverTypes}
            locations={locations}
            serverController={form.watch("serverController.type")}
          />
        </TabsContent>

        <TabsContent value="network">
          <NetworkForm
            form={form}
            onNext={nextStep}
            onBack={previousStep}
            networks={networks}
            databases={databases}
            locations={locations}
          />
        </TabsContent>

        <TabsContent value="summary">
          <Summary
            form={form}
            projectId={projectId}
            onBack={previousStep}
            callback={callback}
          />
        </TabsContent>
      </Form>
    </Tabs>
  );
}
