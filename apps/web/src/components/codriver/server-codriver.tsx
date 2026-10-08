"use client";

import { PaginationTable } from "@/components/table/pagination-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import ServerCodriverKeyForm from "@/forms/codriver/server-key-form";
import ServerCodriverSettingsForm from "@/forms/codriver/server-settings-form";
import ServerCodriverTestForm from "@/forms/codriver/server-test-form";
import { useCodriverServerOverview } from "@/hooks/use-codriver";
import { codriverRequestsPath } from "@/lib/api-client/codriver";
import { getErrorMessage } from "@/lib/utils";
import { createServerRequestColumns } from "./server-requests-columns";

const dollars = (micros: number) => `$${(micros / 1_000_000).toFixed(2)}`;
const centsToDollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function SpendRow({
  label,
  spentMicros,
  limitCents,
  noLimitText,
}: {
  label: string;
  spentMicros: number;
  limitCents: number | null;
  noLimitText: string;
}) {
  const percent =
    limitCents && limitCents > 0
      ? Math.min(100, (spentMicros / (limitCents * 10_000)) * 100)
      : null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>
          {dollars(spentMicros)} /{" "}
          {limitCents === null ? noLimitText : centsToDollars(limitCents)}
        </span>
      </div>
      {percent !== null && <Progress value={percent} aria-label={label} />}
    </div>
  );
}

export default function ServerCodriver({ serverId }: { serverId: string }) {
  const {
    data: overview,
    error,
    isLoading,
  } = useCodriverServerOverview(serverId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <Card className="p-6">
        <p className="text-destructive">
          Failed to load Codriver: {getErrorMessage(error)}
        </p>
      </Card>
    );
  }

  if (!overview.available) {
    return (
      <Card className="gap-6 py-6">
        <CardHeader>
          <CardTitle>Codriver is not available</CardTitle>
          <CardDescription>
            Codriver is not available on this server. A panel admin can enable
            it under Admin → Codriver.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { settings } = overview;
  const ownKey = overview.allowServerKeys && !!settings.keyHint;

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-6 py-6">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <ServerCodriverSettingsForm
            // Remount so the form starts from the saved values
            key={JSON.stringify([settings, overview.sharedKeyModels])}
            serverId={serverId}
            overview={overview}
          />
        </CardContent>
      </Card>

      <Card className="gap-6 py-6">
        <CardHeader>
          <CardTitle>API key</CardTitle>
          <CardDescription>
            {ownKey
              ? "Codriver uses this server's own API key."
              : overview.sharedKeyAvailable
                ? "Codriver uses the panel's shared API key."
                : "No API key is available, so Codriver cannot answer here."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!ownKey && !overview.sharedKeyAvailable && (
            <p className="text-sm text-destructive">
              {overview.allowServerKeys
                ? "Add an API key below or ask a panel admin to set a shared key."
                : "Ask a panel admin to set a shared key."}
            </p>
          )}
          {overview.allowServerKeys && (
            <ServerCodriverKeyForm
              serverId={serverId}
              keyHint={settings.keyHint}
            />
          )}
        </CardContent>
      </Card>

      <Card className="gap-6 py-6">
        <CardHeader>
          <CardTitle>Spend this month</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {overview.allowServerKeys && (
            <SpendRow
              label="Own key"
              spentMicros={overview.spentMicrosThisMonth.serverKey}
              limitCents={settings.monthlyBudgetCents}
              noLimitText="No limit"
            />
          )}
          <SpendRow
            label="Shared key"
            spentMicros={overview.spentMicrosThisMonth.shared}
            limitCents={overview.sharedCapCents}
            noLimitText="No limit"
          />
        </CardContent>
      </Card>

      <Card className="gap-6 py-6">
        <CardHeader>
          <CardTitle>Test a request</CardTitle>
          <CardDescription>
            Plans the request without running it. The model call still counts
            toward the budget.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServerCodriverTestForm serverId={serverId} />
        </CardContent>
      </Card>

      <Card className="gap-6 py-6">
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <PaginationTable
            createColumns={createServerRequestColumns}
            endpoint={codriverRequestsPath(serverId)}
            filter
          />
        </CardContent>
      </Card>
    </div>
  );
}
