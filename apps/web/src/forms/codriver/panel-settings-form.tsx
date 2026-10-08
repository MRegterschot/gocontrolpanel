"use client";
import { saveCodriverPanelSettings } from "@/actions/codriver";
import {
  centsToDollars,
  dollarsToCents,
  formatMicros,
  invalidateCodriverPanel,
} from "@/components/codriver/panel-format";
import FormElement from "@/components/form/form-element";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/utils";
import type { CodriverPanelOverview } from "@/types/codriver";
import { ServerError } from "@/types/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  PanelSettingsSchema,
  PanelSettingsSchemaType,
} from "./panel-settings-schema";

export default function PanelSettingsForm({
  overview,
}: {
  overview: CodriverPanelOverview;
}) {
  const queryClient = useQueryClient();
  const { settings } = overview;

  const form = useForm<PanelSettingsSchemaType>({
    resolver: zodResolver(PanelSettingsSchema),
    defaultValues: {
      enabled: settings.enabled,
      sharedKeyModels: settings.sharedKeyModels,
      sharedBudgetDollars: centsToDollars(settings.sharedMonthlyBudgetCents),
      allowServerKeys: settings.allowServerKeys,
      userMode: settings.userMode,
      retentionDays: settings.retentionDays,
    },
  });

  async function onSubmit(values: PanelSettingsSchemaType) {
    try {
      const { error } = await saveCodriverPanelSettings({
        enabled: values.enabled,
        sharedKeyModels: values.sharedKeyModels,
        sharedMonthlyBudgetCents: dollarsToCents(values.sharedBudgetDollars),
        allowServerKeys: values.allowServerKeys,
        userMode: values.userMode,
        retentionDays: values.retentionDays,
      });
      if (error) {
        throw new ServerError(error, "SaveCodriverSettingsError");
      }
      await invalidateCodriverPanel(queryClient);
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
        className="flex flex-col gap-4"
      >
        <FormElement
          name="enabled"
          type="checkbox"
          label="Codriver on for this panel"
        />
        <FormElement
          name="sharedKeyModels"
          type="pair-list"
          label="Models the shared key may use"
          options={[
            { label: "Haiku (fast and cheap)", value: "haiku" },
            { label: "Sonnet (stronger)", value: "sonnet" },
          ]}
        />
        <FormElement
          name="sharedBudgetDollars"
          type="number"
          label="Global monthly budget for the shared key (USD)"
          description={`Leave empty for no limit. Spent this month: ${formatMicros(overview.sharedSpentMicrosThisMonth)}`}
          placeholder="No limit"
          min={0}
          step={0.01}
        />
        <FormElement
          name="allowServerKeys"
          type="checkbox"
          label="Let server admins use their own API key"
        />
        <FormElement
          name="userMode"
          type="select"
          label="Who may use Codriver"
          options={[
            { label: "Everyone with server access", value: "everyone" },
            { label: "Only users I allow", value: "allowlist" },
          ]}
        />
        <FormElement
          name="retentionDays"
          type="number"
          label="History retention (days)"
          min={1}
          max={3650}
        />
        <Button
          type="submit"
          className="self-start"
          disabled={form.formState.isSubmitting}
        >
          <IconDeviceFloppy />
          Save settings
        </Button>
      </form>
    </Form>
  );
}
