"use client";

import { Activity, Circle, Map, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import useWebSocket from "@/hooks/use-websocket";
import { useServers } from "@/providers/servers-provider";
import { routes } from "@/routes";
import { UserServer } from "@/types/auth";
import { LiveInfo } from "@/types/live";
import { PlayerInfo } from "@/types/player";

interface ServerOverviewCardProps {
  server: UserServer;
  recordActivity?: Array<{
    day: string;
    count: number;
  }>;
}

export function ServerOverviewCard({
  server,
  recordActivity = [],
}: ServerOverviewCardProps) {
  const { servers } = useServers();
  const serverStatus = servers.find((item) => item.id === server.id);

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [liveInfo, setLiveInfo] = useState<LiveInfo | null>(null);

  useWebSocket({
    url: `/api/ws/players/${server.id}`,
    onMessage: (type, data) => {
      if (type === "playerList") {
        setPlayers(Array.isArray(data) ? data : []);
        return;
      }

      if (type === "playerConnect" || type === "playerInfo") {
        const player = data as PlayerInfo;
        setPlayers((current) => {
          const existing = current.findIndex(
            (item) => item.login === player.login,
          );
          if (existing >= 0) {
            const next = [...current];
            next[existing] = player;
            return next;
          }
          return [...current, player];
        });
        return;
      }

      if (type === "playerDisconnect") {
        const { login } = data as { login: string };
        setPlayers((current) =>
          current.filter((player) => player.login !== login),
        );
      }
    },
  });

  useWebSocket({
    url: `/api/ws/live/${server.id}`,
    onMessage: (type, data) => {
      if (data?.info) {
        setLiveInfo(data.info as LiveInfo);
      }

      if (type === "beginMap" || type === "endMap") {
        setLiveInfo((current) =>
          current
            ? { ...current, currentMap: data?.mapUid ?? current.currentMap }
            : current,
        );
      }
    },
  });

  const playerNames = players
    .slice(0, 3)
    .map((player) => player.nickName || player.login);
  const mapName = liveInfo?.currentMap || "Waiting for match data";
  const matchMode = liveInfo?.mode ? liveInfo.mode : "No active round";
  const chartConfig = {
    records: {
      label: "Records",
      color: "hsl(var(--chart-1))",
    },
  } as const;
  const placeholderActivity = [
    { day: "Mon", count: 2 },
    { day: "Tue", count: 1 },
    { day: "Wed", count: 3 },
    { day: "Thu", count: 2 },
    { day: "Fri", count: 4 },
    { day: "Sat", count: 2 },
    { day: "Sun", count: 1 },
  ];
  const activityData =
    recordActivity.length > 0 ? recordActivity : placeholderActivity;
  const usingPlaceholderData = recordActivity.length === 0;
  const totalRecords = activityData.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="border-border/70 bg-background/80 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{server.name}</CardTitle>
          <CardDescription>
            {serverStatus?.isConnected ? "Connected" : "Offline"}
          </CardDescription>
        </div>
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
            serverStatus?.isConnected
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Circle className="size-3 fill-current" />
          {serverStatus?.isConnected ? "Live" : "Offline"}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-background/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" />
              Players
            </div>
            <div className="text-2xl font-semibold">{players.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {playerNames.length > 0
                ? playerNames.join(", ")
                : "No players connected"}
            </p>
          </div>

          <div className="rounded-lg border bg-background/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Map className="size-4" />
              Live info
            </div>
            <div className="text-sm font-medium">{matchMode}</div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {mapName}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Activity className="size-4" />
            Record activity
          </div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Recent records over the last week
            </p>
            <span className="text-sm font-medium">{totalRecords}</span>
          </div>
          {activityData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-28 w-full">
              <BarChart data={activityData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  fontSize={11}
                />
                <YAxis hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-records)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-sm text-muted-foreground">
              No record activity found yet.
            </p>
          )}
          {usingPlaceholderData ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Demo data shown because the development database has limited
              record history.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Activity className="size-4" />
            Current status
          </div>
          <p className="text-sm text-muted-foreground">
            {serverStatus?.isConnected
              ? "The server is reachable and sending live gameplay data."
              : "The server is currently offline or unavailable."}
          </p>
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="w-full sm:w-auto"
        >
          <Link href={routes.servers.settings.replace(":id", server.id)}>
            Open server
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
