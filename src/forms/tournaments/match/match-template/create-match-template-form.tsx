"use client";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import CommonForm, { DEFAULT_COMMON_CONFIG } from "./common-form";
import {
  CreateMatchTemplateSchema,
  CreateMatchTemplateSchemaType,
} from "./create-match-template-schema";
import GeneralForm from "./general-form";
import MapsForm from "./maps-form";
import ModeForm from "./mode-form";
import { DEFAULT_ROUNDS_CONFIG } from "./modes/rounds-form";
import ServerForm from "./server-form";
import MatchTemplateSummary from "./summary";

type Steps = "general" | "server" | "common" | "mode" | "maps" | "summary";

export default function CreateMatchTemplateForm({
  callback,
}: {
  callback?: () => void;
}) {
  const [step, setStep] = useState<Steps>("general");

  const form = useForm<CreateMatchTemplateSchemaType>({
    resolver: zodResolver(CreateMatchTemplateSchema),
    defaultValues: {
      name: "",
      config: {
        options: {},
        common: DEFAULT_COMMON_CONFIG,
        mode: {
          tag: "Rounds",
          value: DEFAULT_ROUNDS_CONFIG,
        },
        maps: {
          start: 0,
          mapUids: ["olsKnq_qAghcVAnEkoeUnVHFZei"],
        },
      },
    },
  });

  const nextStep = async () => {
    if (step !== "summary") {
      const valid = await form.trigger("name");
      if (!valid) return;
    }

    switch (step) {
      case "general":
        setStep("server");
        break;
      case "server":
        setStep("common");
        break;
      case "common":
        setStep("mode");
        break;
      case "mode":
        setStep("maps");
        break;
      case "maps":
        setStep("summary");
        break;
    }
  };

  const previousStep = () => {
    switch (step) {
      case "server":
        setStep("general");
        break;
      case "common":
        setStep("server");
        break;
      case "mode":
        setStep("common");
        break;
      case "maps":
        setStep("mode");
        break;
      case "summary":
        setStep("maps");
        break;
      default:
        setStep("general");
        break;
    }
  };

  return (
    <Tabs value={step} onValueChange={() => {}} className="w-full gap-3">
      <TabsList className="w-full">
        <TabsTrigger value="general" className="cursor-default">
          General
        </TabsTrigger>
        <TabsTrigger value="server" className="cursor-default">
          Server
        </TabsTrigger>
        <TabsTrigger value="common" className="cursor-default">
          Common
        </TabsTrigger>
        <TabsTrigger value="mode" className="cursor-default">
          Mode
        </TabsTrigger>
        <TabsTrigger value="maps" className="cursor-default">
          Maps
        </TabsTrigger>
        <TabsTrigger value="summary" className="cursor-default">
          Summary
        </TabsTrigger>
      </TabsList>
      <Form {...form}>
        <TabsContent value="general">
          <GeneralForm onNext={nextStep} />
        </TabsContent>
        <TabsContent value="server">
          <ServerForm onNext={nextStep} onBack={previousStep} />
        </TabsContent>
        <TabsContent value="common">
          <CommonForm form={form} onNext={nextStep} onBack={previousStep} />
        </TabsContent>
        <TabsContent value="mode">
          <ModeForm form={form} onNext={nextStep} onBack={previousStep} />
        </TabsContent>
        <TabsContent value="maps">
          <MapsForm onNext={nextStep} onBack={previousStep} />
        </TabsContent>
        <TabsContent value="summary">
          <MatchTemplateSummary
            form={form}
            onBack={previousStep}
            callback={callback}
          />
        </TabsContent>
      </Form>
    </Tabs>
  );
}
