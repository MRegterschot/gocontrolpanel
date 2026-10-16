"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PanelSettingsForm from "@/forms/codriver/panel-settings-form";
import type { CodriverPanelOverview } from "@/types/codriver";
import PanelApiKeys from "./panel-api-keys";

export default function PanelSettingsCard({
  overview,
}: {
  overview: CodriverPanelOverview;
}) {
  return (
    <Card className="gap-6 py-6">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      {/* Keys sit beside the settings on wide screens and below them otherwise */}
      <CardContent className="grid gap-6 xl:grid-cols-2 xl:gap-8">
        <PanelSettingsForm overview={overview} />
        <div className="border-t pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
          <PanelApiKeys overview={overview} />
        </div>
      </CardContent>
    </Card>
  );
}
