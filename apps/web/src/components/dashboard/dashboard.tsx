"use client";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDashboardActivity,
  useDashboardAdminStats,
  useDashboardHetzner,
} from "@/hooks/use-dashboard";
import { cn, generatePath, hasPermissionSync } from "@/lib/utils";
import { useServers } from "@/providers/servers-provider";
import { routePermissions, routes } from "@/routes";
import type {
  DashboardAdminStats,
  DashboardHetznerProject,
  DashboardHetznerServer,
} from "@/services/dashboard";
import {
  IconActivity,
  IconCloud,
  IconKey,
  IconPuzzle,
  IconServer,
  IconServerOff,
  IconTrophy,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";
import { ServerInfo } from "@tmcontrolpanel/shared";
import { Session } from "next-auth";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo } from "react";

export default function Dashboard() {
  const { data: session } = useSession();
  const { servers, loading } = useServers();

  if (!session) return null;

  const online = servers.filter((s) => s.isConnected).length;
  const projects = session.user.projects;

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.displayName}
        </h1>
        <h4 className="text-muted-foreground">
          Here&apos;s what is happening on your servers.
        </h4>
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Servers online"
          icon={IconServer}
          loading={loading}
          value={`${online} / ${servers.length}`}
        />
        <StatCard
          title="Groups"
          icon={IconUsersGroup}
          value={session.user.groups.length}
        />
        <ActivityCards />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ServersCard servers={servers} loading={loading} session={session} />
        {projects.length > 0 && <HetznerCard session={session} />}
      </div>

      {session.user.admin && <AdminSection />}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  description,
}: {
  title: string;
  value?: React.ReactNode;
  icon: React.ElementType;
  loading?: boolean;
  description?: string;
}) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardDescription>{title}</CardDescription>
        <CardAction>
          <Icon className="size-5 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="px-4">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityCards() {
  const { data, isLoading, isError } = useDashboardActivity();
  const value = (n?: number) => (isError ? "—" : n?.toLocaleString());

  return (
    <>
      <StatCard
        title="Matches"
        icon={IconActivity}
        loading={isLoading}
        value={value(data?.matches)}
        description="Last 7 days"
      />
      <StatCard
        title="Records"
        icon={IconTrophy}
        loading={isLoading}
        value={value(data?.records)}
        description="Last 7 days"
      />
    </>
  );
}

// The strongest role the user has on a server, directly or through a group
function serverRole(session: Session, serverId: string): string | null {
  if (session.user.admin) return "Admin";
  const direct = session.user.servers.find((s) => s.id === serverId)?.role;
  if (direct) return direct;
  return (
    session.user.groups.find((g) => g.servers.some((s) => s.id === serverId))
      ?.role ?? null
  );
}

function ServersCard({
  servers,
  loading,
  session,
}: {
  servers: ServerInfo[];
  loading: boolean;
  session: Session;
}) {
  // Online servers first, both halves by name
  const sorted = useMemo(
    () =>
      [...servers].sort(
        (a, b) =>
          Number(b.isConnected) - Number(a.isConnected) ||
          a.name.localeCompare(b.name),
      ),
    [servers],
  );

  return (
    <Card className="gap-6 py-6">
      <CardHeader>
        <CardTitle>Your servers</CardTitle>
        <CardDescription>Live connection status</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don&apos;t have access to any servers yet.
          </p>
        ) : (
          sorted.map((server) => {
            const role = serverRole(session, server.id);
            // Live needs a connection, records are readable either way
            const href = generatePath(
              server.isConnected ? routes.servers.live : routes.servers.records,
              { id: server.id },
            );
            const Icon = server.isConnected ? IconServer : IconServerOff;

            return (
              <Link
                key={server.id}
                href={href}
                className="flex items-center gap-3 rounded-md border px-3 py-2 hover:bg-accent transition-colors"
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0",
                    server.isConnected
                      ? "text-green-600 dark:text-green-500"
                      : "text-muted-foreground",
                  )}
                />
                <span className="flex-1 truncate font-medium">
                  {server.name}
                </span>
                {role && <Badge variant="outline">{role}</Badge>}
                <Badge variant={server.isConnected ? "default" : "secondary"}>
                  {server.isConnected ? "Online" : "Offline"}
                </Badge>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_VARIANT: Record<
  DashboardHetznerServer["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  running: "default",
  off: "secondary",
  initializing: "outline",
  starting: "outline",
  stopping: "outline",
  migrating: "outline",
  rebuilding: "outline",
  deleting: "destructive",
  unknown: "destructive",
};

function HetznerCard({ session }: { session: Session }) {
  const { data, isLoading, isError, error } = useDashboardHetzner();

  const all = data?.flatMap((p) => p.servers) ?? [];
  const running = all.filter((s) => s.status === "running").length;

  return (
    <Card className="gap-6 py-6">
      <CardHeader>
        <CardTitle>Hetzner cloud</CardTitle>
        <CardDescription>
          {data
            ? `${running} of ${all.length} cloud servers running`
            : "Your Hetzner projects"}
        </CardDescription>
        <CardAction>
          <IconCloud className="size-5 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))
        ) : isError ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : (
          data?.map((project) => (
            <HetznerProject
              key={project.id}
              project={project}
              canOpen={hasPermissionSync(
                session,
                routePermissions.admin.hetzner.servers.view,
                project.id,
              )}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function HetznerProject({
  project,
  canOpen,
}: {
  project: DashboardHetznerProject;
  canOpen: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="font-medium truncate">{project.name}</span>
        <Badge variant="outline">{project.role}</Badge>
        {canOpen && (
          <Link
            href={generatePath(routes.admin.hetznerServers, {
              id: project.id,
            })}
            className={cn(
              buttonVariants({ variant: "link", size: "sm" }),
              "ml-auto h-auto p-0",
            )}
          >
            Manage
          </Link>
        )}
      </div>

      {project.error ? (
        <p className="text-sm text-destructive">
          Couldn&apos;t load servers: {project.error}
        </p>
      ) : project.servers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No cloud servers.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {project.servers.map((server) => (
            <li
              key={server.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <div className="flex flex-1 flex-col min-w-0">
                <span className="truncate font-medium">{server.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {server.type.toUpperCase()} · {server.location}
                  {server.ipv4 && ` · ${server.ipv4}`}
                </span>
              </div>
              <Badge variant={STATUS_VARIANT[server.status]}>
                {server.status}
              </Badge>
            </li>
          ))}
          {project.totalServers > project.servers.length && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              And {project.totalServers - project.servers.length} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function AdminSection() {
  const { data, isLoading, isError, error } = useDashboardAdminStats();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Panel overview</h2>
        <p className="text-sm text-muted-foreground">
          Totals across the whole panel. Only visible to admins.
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">{error.message}</p>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <AdminStat
              title="Users"
              icon={IconUsers}
              href={routes.admin.users}
              value={data?.users}
              loading={isLoading}
            />
            <AdminStat
              title="Servers"
              icon={IconServer}
              href={routes.admin.servers}
              value={data?.servers}
              loading={isLoading}
            />
            <AdminStat
              title="Groups"
              icon={IconUsersGroup}
              href={routes.admin.groups}
              value={data?.groups}
              loading={isLoading}
            />
            <AdminStat
              title="Hetzner"
              icon={IconCloud}
              href={routes.admin.hetzner}
              value={data?.hetznerProjects}
              loading={isLoading}
            />
            <AdminStat
              title="Plugins"
              icon={IconPuzzle}
              href={routes.plugins.index}
              value={data?.plugins}
              loading={isLoading}
            />
            <AdminStat
              title="Active API keys"
              icon={IconKey}
              href={routes.admin.apiKeys}
              value={data?.activeApiKeys}
              loading={isLoading}
            />
          </div>

          <RecentAuditLogs logs={data?.recentAuditLogs} loading={isLoading} />
        </>
      )}
    </div>
  );
}

function AdminStat({
  href,
  ...props
}: React.ComponentProps<typeof StatCard> & { href: string; value?: number }) {
  return (
    <Link
      href={href}
      className="rounded-xl hover:opacity-80 transition-opacity"
    >
      <StatCard {...props} value={props.value?.toLocaleString()} />
    </Link>
  );
}

function RecentAuditLogs({
  logs,
  loading,
}: {
  logs?: DashboardAdminStats["recentAuditLogs"];
  loading: boolean;
}) {
  return (
    <Card className="gap-6 py-6">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest audit log entries</CardDescription>
        <CardAction>
          <Link
            href={routes.admin.auditLogs}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : !logs?.length ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
              >
                <span className="font-medium">
                  {log.user?.nickName ?? "System"}
                </span>
                <span className="font-mono text-xs">{log.action}</span>
                <span className="text-muted-foreground truncate">
                  {log.targetType}
                </span>
                {log.error && <Badge variant="destructive">Failed</Badge>}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {log.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
