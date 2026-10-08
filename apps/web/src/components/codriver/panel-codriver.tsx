"use client";
import { useCodriverPanelOverview } from "@/hooks/use-codriver";
import { getErrorMessage } from "@/lib/utils";
import PanelAccessCheckCard from "./panel-access-check-card";
import PanelRulesCard from "./panel-rules-card";
import PanelSettingsCard from "./panel-settings-card";
import PanelSharedKeyCard from "./panel-shared-key-card";

export default function PanelCodriver() {
  const { data, isPending, error } = useCodriverPanelOverview();

  if (isPending) {
    return <span className="text-muted-foreground">Loading...</span>;
  }
  if (error || !data) {
    return (
      <span className="text-destructive">
        Failed to load Codriver: {getErrorMessage(error)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PanelSettingsCard overview={data} />
      <PanelSharedKeyCard overview={data} />
      <PanelRulesCard rules={data.rules} />
      <PanelAccessCheckCard />
    </div>
  );
}
