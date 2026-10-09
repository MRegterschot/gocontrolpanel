"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCodriverPanelOverview } from "@/hooks/use-codriver";
import { getErrorMessage, hasPermissionSync } from "@/lib/utils";
import { routePermissions } from "@/routes";
import { useSession } from "next-auth/react";
import CodriverHistoryCard from "./history-card";
import PanelAccessCheckCard from "./panel-access-check-card";
import PanelRulesCard from "./panel-rules-card";
import PanelSettingsCard from "./panel-settings-card";
import PanelSharedKeyCard from "./panel-shared-key-card";
import CodriverUsageCard from "./usage-card";

export default function PanelCodriver() {
  const { data, isPending, error } = useCodriverPanelOverview();
  const { data: session } = useSession();
  const canEdit = hasPermissionSync(
    session,
    routePermissions.admin.codriver.edit,
  );

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
    <Tabs defaultValue="settings">
      <TabsList>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="settings" className="flex flex-col gap-6">
        {canEdit && (
          <>
            <PanelSettingsCard overview={data} />
            <PanelSharedKeyCard overview={data} />
            <PanelRulesCard rules={data.rules} />
          </>
        )}
        <PanelAccessCheckCard />
      </TabsContent>
      <TabsContent value="usage" className="flex flex-col gap-6">
        <Card className="gap-6 py-6">
          <CardHeader>
            <CardTitle>Shared budget this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              ${(data.sharedSpentMicrosThisMonth / 1_000_000).toFixed(2)} /{" "}
              {data.settings.sharedMonthlyBudgetCents === null
                ? "No limit"
                : `$${(data.settings.sharedMonthlyBudgetCents / 100).toFixed(2)}`}
            </p>
            {data.settings.sharedMonthlyBudgetCents !== null && (
              <Progress
                aria-label="Shared budget used"
                value={
                  data.settings.sharedMonthlyBudgetCents === 0
                    ? 100
                    : Math.min(
                        100,
                        data.sharedSpentMicrosThisMonth /
                          (data.settings.sharedMonthlyBudgetCents * 100),
                      )
                }
              />
            )}
          </CardContent>
        </Card>
        <CodriverUsageCard />
      </TabsContent>
      <TabsContent value="history">
        <CodriverHistoryCard />
      </TabsContent>
    </Tabs>
  );
}
