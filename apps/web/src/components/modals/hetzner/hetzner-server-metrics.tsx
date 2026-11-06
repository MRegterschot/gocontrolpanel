import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { getHetznerServerMetrics } from "@/lib/api-client/hetzner";
import { queryKeys, unwrap } from "@/lib/api-client/query";
import { capitalize, formatBytes, getErrorMessage } from "@/lib/utils";
import { HetznerServerMetrics } from "@/types/api/hetzner/servers";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "../../ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";
import { DefaultModalProps } from "../default-props";

type MetricsData = {
  timestamp: number;
  [metric: string]: string | number;
};

export default function HetznerServerMetricsModal({
  data,
}: DefaultModalProps<{
  projectId: string;
  serverId: number;
}>) {
  const isMobile = useIsMobile();

  const [timeRange, setTimeRange] = useState<number>(30);

  function formatMetrics(metrics: HetznerServerMetrics) {
    const { time_series } = metrics;

    const newCpuMetrics: { [timestamp: number]: MetricsData } = {};
    const newDiskMetrics: { [timestamp: number]: MetricsData } = {};
    const newNetworkMetrics: { [timestamp: number]: MetricsData } = {};

    for (const [metric, { values }] of Object.entries(time_series)) {
      values.forEach(([timestamp, value]) => {
        switch (metric) {
          case "cpu":
            if (!newCpuMetrics[timestamp]) {
              newCpuMetrics[timestamp] = { timestamp };
            }
            newCpuMetrics[timestamp]["cpu"] = parseFloat(
              Number(value).toFixed(2),
            );
            break;

          case "disk.0.bandwidth.read":
            if (!newDiskMetrics[timestamp]) {
              newDiskMetrics[timestamp] = { timestamp };
            }
            newDiskMetrics[timestamp]["read"] = Number(value);
            break;

          case "disk.0.bandwidth.write":
            if (!newDiskMetrics[timestamp]) {
              newDiskMetrics[timestamp] = { timestamp };
            }
            newDiskMetrics[timestamp]["write"] = Number(value);
            break;

          case "network.0.bandwidth.in":
            if (!newNetworkMetrics[timestamp]) {
              newNetworkMetrics[timestamp] = { timestamp };
            }
            newNetworkMetrics[timestamp]["in"] = Number(value);
            break;

          case "network.0.bandwidth.out":
            if (!newNetworkMetrics[timestamp]) {
              newNetworkMetrics[timestamp] = { timestamp };
            }
            newNetworkMetrics[timestamp]["out"] = Number(value);
            break;
        }
      });
    }

    return {
      cpu: Object.values(newCpuMetrics),
      disk: Object.values(newDiskMetrics),
      network: Object.values(newNetworkMetrics),
    };
  }

  function formatTimestamp(timestamp: number): string {
    if (timeRange === 1) {
      return new Date(timestamp * 1000).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  const metricsQuery = useQuery({
    queryKey: queryKeys.hetzner(
      data?.projectId ?? "",
      `metrics-${data?.serverId}-${timeRange}`,
    ),
    queryFn: () => {
      const start = new Date();
      start.setDate(start.getDate() - timeRange);
      return unwrap(
        getHetznerServerMetrics(data!.projectId, data!.serverId, start),
        "GetHetznerServerMetricsError",
      );
    },
    enabled: !!data,
    gcTime: 0,
  });

  const formatted = useMemo(
    () => (metricsQuery.data ? formatMetrics(metricsQuery.data) : null),
    [metricsQuery.data],
  );
  const cpuMetrics = formatted?.cpu ?? [];
  const diskMetrics = formatted?.disk ?? [];
  const networkMetrics = formatted?.network ?? [];

  const error = metricsQuery.error
    ? "Failed to get metrics: " + getErrorMessage(metricsQuery.error)
    : null;
  useQueryErrorToast(metricsQuery.error, "Failed to fetch metrics");

  if (!data) return null;

  const cpuChartConfig: ChartConfig = {
    cpu: {
      label: "CPU Usage",
      color: "var(--color-chart-1)",
    },
  };

  const diskChartConfig: ChartConfig = {
    read: {
      label: "Disk Read",
      color: "var(--color-chart-1)",
    },
    write: {
      label: "Disk Write",
      color: "var(--color-chart-2)",
    },
  };

  const networkChartConfig: ChartConfig = {
    in: {
      label: "Network In",
      color: "var(--color-chart-1)",
    },
    out: {
      label: "Network Out",
      color: "var(--color-chart-2)",
    },
  };

  return (
    <ModalContent className="max-w-[min(64rem,calc(100vw-2rem))]">
      <DialogHeader className="flex-row flex-wrap items-center justify-between pr-6">
        <DialogTitle>{isMobile ? "Metrics" : "Server Metrics"}</DialogTitle>

        <div className="flex gap-4 items-center">
          <ToggleGroup
            type="single"
            value={timeRange.toString()}
            onValueChange={(value) => setTimeRange(Number(value))}
            variant={"outline"}
            className="hidden *:data-[slot=toggle-group-item]:!px-4 sm:flex"
          >
            <ToggleGroupItem value="30">Last month</ToggleGroupItem>
            <ToggleGroupItem value="7">Last week</ToggleGroupItem>
            <ToggleGroupItem value="1">Last day</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange.toString()}
            onValueChange={(value) => setTimeRange(Number(value))}
          >
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate sm:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last month" />
            </SelectTrigger>
            <SelectContent className="z-9999">
              <SelectItem value="30">Last month</SelectItem>
              <SelectItem value="7">Last week</SelectItem>
              <SelectItem value="1">Last day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DialogHeader>

      {error ? (
        <span>{error}</span>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ChartContainer
            config={cpuChartConfig}
            className="h-64 w-full relative"
          >
            <AreaChart accessibilityLayer data={cpuMetrics}>
              <defs>
                <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-cpu)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-cpu)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  return formatTimestamp(value);
                }}
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      return new Date(
                        payload?.[0]?.payload?.timestamp * 1000,
                      ).toLocaleString();
                    }}
                    formatter={(value, name, item) => (
                      <div className="flex items-center gap-2">
                        <div
                          className="shrink-0 rounded-[2px] h-2.5 w-2.5"
                          style={
                            {
                              borderColor: item.color,
                              backgroundColor: item.color,
                            } as React.CSSProperties
                          }
                        />

                        <div className="flex flex-1 justify-between leading-none items-center gap-2">
                          <div className="grid gap-1.5">
                            <span className="text-muted-foreground">
                              {name === "cpu" && "CPU Usage"}
                            </span>
                          </div>
                          {typeof value === "number" && (
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {value.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  />
                }
              />

              <Area
                dataKey="cpu"
                type="linear"
                fill="url(#fillCpu)"
                stroke="var(--color-cpu)"
                unit="%"
                stackId="a"
              />

              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>

          <ChartContainer
            config={diskChartConfig}
            className="h-64 w-full relative"
          >
            <AreaChart accessibilityLayer data={diskMetrics}>
              <defs>
                <linearGradient id="fillRead" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-read)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-read)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillWrite" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-write)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-write)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid />
              <YAxis tickFormatter={(value) => formatBytes(value, 0)} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  return formatTimestamp(value);
                }}
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      return new Date(
                        payload?.[0]?.payload?.timestamp * 1000,
                      ).toLocaleString();
                    }}
                    formatter={(value, name, item) => (
                      <div className="flex items-center gap-2">
                        <div
                          className="shrink-0 rounded-[2px] h-2.5 w-2.5"
                          style={
                            {
                              borderColor: item.color,
                              backgroundColor: item.color,
                            } as React.CSSProperties
                          }
                        />

                        <div className="flex flex-1 justify-between leading-none items-center gap-2">
                          <div className="grid gap-1.5">
                            <span className="text-muted-foreground">
                              {capitalize(String(name))}
                            </span>
                          </div>
                          {typeof value === "number" && (
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {formatBytes(Number(value))}/s
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  />
                }
              />

              <Area
                dataKey="read"
                type="linear"
                fill="url(#fillRead)"
                stroke="var(--color-read)"
                unit="MB/s"
                stackId="a"
              />
              <Area
                dataKey="write"
                type="linear"
                fill="url(#fillWrite)"
                stroke="var(--color-write)"
                unit="MB/s"
                stackId="a"
              />

              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>

          <ChartContainer
            config={networkChartConfig}
            className="h-64 w-full relative"
          >
            <AreaChart accessibilityLayer data={networkMetrics}>
              <defs>
                <linearGradient id="fillIn" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-in)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-in)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillOut" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-out)"
                    stopOpacity={1.0}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-out)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid />
              <YAxis tickFormatter={(value) => formatBytes(value, 0)} />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  return formatTimestamp(value);
                }}
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      return new Date(
                        payload?.[0]?.payload?.timestamp * 1000,
                      ).toLocaleString();
                    }}
                    formatter={(value, name, item) => (
                      <div className="flex items-center gap-2">
                        <div
                          className="shrink-0 rounded-[2px] h-2.5 w-2.5"
                          style={
                            {
                              borderColor: item.color,
                              backgroundColor: item.color,
                            } as React.CSSProperties
                          }
                        />

                        <div className="flex flex-1 justify-between leading-none items-center gap-2">
                          <div className="grid gap-1.5">
                            <span className="text-muted-foreground">
                              {capitalize(String(name))}
                            </span>
                          </div>
                          {typeof value === "number" && (
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {formatBytes(Number(value))}/s
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  />
                }
              />

              <Area
                dataKey="in"
                type="linear"
                fill="url(#fillIn)"
                stroke="var(--color-in)"
                unit="MB/s"
                stackId="a"
              />
              <Area
                dataKey="out"
                type="linear"
                fill="url(#fillOut)"
                stroke="var(--color-out)"
                unit="MB/s"
                stackId="a"
              />

              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </div>
      )}
    </ModalContent>
  );
}
