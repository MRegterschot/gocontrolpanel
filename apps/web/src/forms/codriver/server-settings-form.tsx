"use client";
import { saveCodriverServerSettings } from "@/actions/codriver";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { queryKeys } from "@/lib/api-client/query";
import { getErrorMessage } from "@/lib/utils";
import type { CodriverServerOverview } from "@/types/codriver";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ServerCodriverSettingsSchema,
  ServerCodriverSettingsType,
} from "./server-settings-schema";

const MODEL_LABELS = {
  haiku: "Haiku (fast, cheap)",
  sonnet: "Sonnet (smarter)",
};

export default function ServerCodriverSettingsForm({
  serverId,
  overview,
}: {
  serverId: string;
  overview: CodriverServerOverview;
}) {
  const queryClient = useQueryClient();
  const { settings } = overview;
  const ownKeyInUse = overview.allowServerKeys && !!settings.keyHint;
  const models = ownKeyInUse
    ? (["haiku", "sonnet"] as const)
    : overview.sharedKeyModels;

  const form = useForm<ServerCodriverSettingsType>({
    resolver: zodResolver(ServerCodriverSettingsSchema),
    defaultValues: {
      enabled: settings.enabled,
      model: settings.model,
      escalation: settings.escalation,
      guestAccess: settings.guestAccess,
      memberAccess: settings.memberAccess,
      cooldownSeconds: settings.cooldownSeconds,
      memoryTurns: settings.memoryTurns,
      monthlyBudgetDollars:
        settings.monthlyBudgetCents === null
          ? ""
          : settings.monthlyBudgetCents / 100,
    },
  });

  async function onSubmit(values: ServerCodriverSettingsType) {
    try {
      const { error } = await saveCodriverServerSettings(serverId, {
        enabled: values.enabled,
        model: values.model,
        escalation: values.escalation,
        guestAccess: values.guestAccess,
        memberAccess: values.memberAccess,
        cooldownSeconds: values.cooldownSeconds,
        memoryTurns: values.memoryTurns,
        monthlyBudgetCents:
          values.monthlyBudgetDollars === ""
            ? null
            : Math.round(values.monthlyBudgetDollars * 100),
      });
      if (error) throw new ServerError(error, "SaveCodriverSettingsError");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.codriverServer(serverId),
      });
      toast.success("Codriver settings saved");
    } catch (error) {
      toast.error("Failed to save Codriver settings", {
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <FormElement
          name="enabled"
          type="checkbox"
          label="Enabled"
          placeholder="Enable Codriver on this server"
        />
        <FormElement
          name="model"
          type="select"
          label="Model"
          description={
            ownKeyInUse
              ? "The model that answers requests first."
              : "Limited to the models the panel's shared key allows."
          }
          options={models.map((m) => ({ label: MODEL_LABELS[m], value: m }))}
          className="w-64"
        />
        <FormElement
          name="escalation"
          type="checkbox"
          label="Escalation"
          placeholder="Retry with Sonnet when Haiku's answer can't be used"
        />
        <FormElement
          name="guestAccess"
          type="select"
          label="Guest access"
          description="Players without a panel account."
          options={[
            { label: "Off", value: "off" },
            { label: "Read-only questions", value: "read" },
          ]}
          className="w-64"
        />
        <FormElement
          name="memberAccess"
          type="checkbox"
          label="Member access"
          placeholder="Members can use read-only questions"
        />
        <FormElement
          name="cooldownSeconds"
          type="number"
          label="Cooldown (seconds)"
          description="Minimum time between requests per player (0 to 300)."
          min={0}
          max={300}
          className="w-32"
        />
        <FormElement
          name="memoryTurns"
          type="number"
          label="Remembered messages"
          description="Earlier exchanges per player sent along with a request so follow-ups like “skip it” work. Forgotten after 15 minutes (0 to 10, 0 turns memory off)."
          min={0}
          max={10}
          className="w-32"
        />
        {overview.allowServerKeys && (
          <FormElement
            name="monthlyBudgetDollars"
            type="number"
            label="Monthly budget for this server's own key ($)"
            description="Leave empty for no limit."
            min={0}
            step={0.01}
            className="w-40"
          />
        )}
        <div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <IconDeviceFloppy />
            Save settings
          </Button>
        </div>
      </form>
    </Form>
  );
}
