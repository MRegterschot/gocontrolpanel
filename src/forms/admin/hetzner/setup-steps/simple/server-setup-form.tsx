"use client";

import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HetznerLocation } from "@/types/api/hetzner/locations";
import { HetznerServer, HetznerServerType } from "@/types/api/hetzner/servers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import DatabaseForm from "./database-form";
import ServerControllerForm from "./server-controller-form";
import ServerForm from "./server-form";
import {
  SimpleServerSetupSchema,
  SimpleServerSetupSchemaType,
} from "./server-setup-schema";
import Summary from "./summary";
import { HetznerSSHKey } from "@/types/api/hetzner/ssh-keys";

type Steps = "server" | "serverController" | "database" | "summary";

export default function SimpleServerSetupForm({
  projectId,
  locations,
  databases,
  serverTypes,
  sshKeys,
  callback,
}: {
  projectId: string;
  locations: HetznerLocation[];
  databases: HetznerServer[];
  serverTypes: HetznerServerType[];
  sshKeys: HetznerSSHKey[];
  callback?: () => void;
}) {
  const [step, setStep] = useState<Steps>("server");

  const form = useForm<SimpleServerSetupSchemaType>({
    resolver: zodResolver(SimpleServerSetupSchema),
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
    },
  });

  const controllerSelected = form.watch("server.controller");
  const selectedController = form.watch("serverController.type");

  useEffect(() => {
    if (!controllerSelected) {
      form.reset({
        ...form.getValues(),
        serverController: undefined,
        database: undefined,
      });
    }
  }, [controllerSelected]);

  const nextStep = async () => {
    if (step !== "summary") {
      const valid = await form.trigger(
        step as "server" | "serverController" | "database",
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
      case "summary":
        if (!controllerSelected) {
          setStep("server");
        } else {
          setStep("database");
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
