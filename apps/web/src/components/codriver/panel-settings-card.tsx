"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PanelSettingsForm from "@/forms/codriver/panel-settings-form";
import type { CodriverPanelOverview } from "@/types/codriver";

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
      <CardContent>
        <PanelSettingsForm overview={overview} />
      </CardContent>
    </Card>
  );
}
