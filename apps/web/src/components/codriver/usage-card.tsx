"use client";

import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useCodriverUsage } from "@/hooks/use-codriver";
import { getErrorMessage } from "@/lib/utils";
import type { CodriverUsageBucket } from "@/types/codriver";
import type { ColumnDef } from "@tanstack/react-table";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const dollars = (micros: number) => `$${(micros / 1_000_000).toFixed(4)}`;
const rate = (count: number, total: number) =>
  total ? `${((100 * count) / total).toFixed(1)}%` : "—";
const columns: ColumnDef<CodriverUsageBucket>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "requests", header: "Requests" },
  {
    accessorKey: "costMicros",
    header: "Spend",
    cell: ({ row }) => dollars(row.original.costMicros),
  },
];

export default function CodriverUsageCard({ serverId }: { serverId?: string }) {
  const { data, error, isPending, isFetching, refetch } =
    useCodriverUsage(serverId);
  return (
    <Card className="gap-6 py-6">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Usage this month</CardTitle>
          <CardDescription>
            Requests and spend in {data?.month ?? "the current month"} (UTC).
          </CardDescription>
        </div>
        <Button
          variant="outline"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          Refresh usage
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isPending ? (
          <p>Loading usage…</p>
        ) : error || !data ? (
          <p role="alert" className="text-destructive">
            Failed to load usage: {getErrorMessage(error)}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                ["Requests", data.requests],
                ["Spend", dollars(data.costMicros)],
                ["Failure rate", rate(data.failed, data.requests)],
                ["Escalation rate", rate(data.escalated, data.modelRequests)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border p-4">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.failed} failed requests. {data.escalated} escalations across{" "}
              {data.modelRequests} tracked model requests.{" "}
              {data.untrackedModelRequests > 0 &&
                `${data.untrackedModelRequests} older model requests lack escalation tracking and are excluded from that rate.`}
            </p>
            {!data.requests && (
              <p className="text-muted-foreground">
                No requests this month yet.
              </p>
            )}
            <div>
              <h3 className="mb-3 font-medium">Requests per day</h3>
              <ChartContainer
                config={{
                  requests: { label: "Requests", color: "var(--primary)" },
                }}
                className="h-48 w-full"
              >
                <BarChart accessibilityLayer data={data.daily}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date: string) => date.slice(8)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis allowDecimals={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="requests"
                    fill="var(--color-requests)"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-medium">Top commands</h3>
                <DataTable
                  columns={[
                    { accessorKey: "name", header: "Tool" },
                    { accessorKey: "requests", header: "Requests" },
                  ]}
                  data={data.tools}
                />
              </div>
              <div className="space-y-3">
                <h3 className="font-medium">By API key</h3>
                <DataTable columns={columns} data={data.byKey} />
              </div>
            </div>
            {!serverId && (
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="font-medium">By server</h3>
                  <DataTable
                    columns={columns}
                    data={data.byServer}
                    pagination
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="font-medium">By group</h3>
                  <p className="text-xs text-muted-foreground">
                    Uses current group membership. A server in multiple groups
                    counts toward each group.
                  </p>
                  <DataTable columns={columns} data={data.byGroup} pagination />
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
