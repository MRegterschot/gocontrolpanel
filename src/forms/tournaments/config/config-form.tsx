"use client";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import CommonForm, { DEFAULT_COMMON_CONFIG } from "./common-form";
import { ConfigFormSchema, ConfigFormSchemaType } from "./config-schema";
import GeneralForm from "./general-form";
import MapsForm from "./maps-form";
import ModeForm from "./mode-form";
import { DEFAULT_ROUNDS_CONFIG } from "./modes/rounds-form";
import ConfigSummary from "./summary";

const STEPS = ["general", "common", "mode", "maps", "summary"] as const;
type Step = (typeof STEPS)[number];

export const DEFAULT_CONFIG: ConfigFormSchemaType["config"] = {
  options: {},
  common: DEFAULT_COMMON_CONFIG,
  mode: { tag: "Rounds", value: DEFAULT_ROUNDS_CONFIG },
  maps: { start: 0, mapUids: ["olsKnq_qAghcVAnEkoeUnVHFZei"] },
};

// Inline configs have no name, so their form starts at the common step.
export default function ConfigForm({
  initial,
  isEditing,
  inline,
  submitLabel,
  onSubmit,
}: {
  initial?: ConfigFormSchemaType;
  isEditing?: boolean;
  inline?: boolean;
  submitLabel: string;
  onSubmit: (values: ConfigFormSchemaType) => Promise<unknown>;
}) {
  const steps = inline ? STEPS.slice(1) : STEPS;
  const [step, setStep] = useState<Step>(steps[0]);

  const form = useForm<ConfigFormSchemaType>({
    resolver: zodResolver(ConfigFormSchema),
    defaultValues: { name: inline ? "Inline" : "", config: DEFAULT_CONFIG, ...initial },
  });

  const move = async (by: number) => {
    if (step !== "summary" && !(await form.trigger())) return;
    setStep(steps[Math.min(Math.max(steps.indexOf(step) + by, 0), steps.length - 1)]);
  };
  const onNext = () => move(1);
  const onBack = () => move(-1);

  return (
    <Tabs value={step} onValueChange={() => { }} className="w-full gap-3">
      <TabsList className="w-full">
        {steps.map((s) => (
          <TabsTrigger key={s} value={s} className="cursor-default capitalize">{s}</TabsTrigger>
        ))}
      </TabsList>
      <Form {...form}>
        <TabsContent value="general">
          <GeneralForm onNext={onNext} isEditing={isEditing} />
        </TabsContent>
        <TabsContent value="common">
          <CommonForm form={form} onNext={onNext} onBack={onBack} />
        </TabsContent>
        <TabsContent value="mode">
          <ModeForm form={form} onNext={onNext} onBack={onBack} />
        </TabsContent>
        <TabsContent value="maps">
          <MapsForm form={form} onNext={onNext} onBack={onBack} />
        </TabsContent>
        <TabsContent value="summary">
          <ConfigSummary form={form} inline={inline} submitLabel={submitLabel} onSubmit={onSubmit} onBack={onBack} />
        </TabsContent>
      </Form>
    </Tabs>
  );
}
