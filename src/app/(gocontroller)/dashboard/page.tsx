import { ArrowRight, ServerCog, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { getServerRecordActivity } from "@/actions/database/records";
import { ServerOverviewCard } from "@/components/dashboard/server-overview-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { routes } from "@/routes";

export default async function Page() {
  const session = await auth();

  const managedServers = session?.user?.servers ?? [];
  const adminServers = managedServers.filter(
    (server) => server.role === "Admin",
  );
  const moderatorServers = managedServers.filter(
    (server) => server.role === "Moderator",
  );
  const recordActivityByServer = Object.fromEntries(
    await Promise.all(
      managedServers.map(async (server) => {
        const response = await getServerRecordActivity(server.id);
        return [server.id, response.data ?? []];
      }),
    ),
  );

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">
            Welcome back, {session?.user?.displayName ?? "there"}
          </h1>
          <p className="text-muted-foreground">
            Here is a quick overview of the servers and access you currently
            have in GoControlPanel.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={routes.admin.servers}>
            Manage servers
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ServerCog className="size-4" />
              Servers available
            </CardTitle>
            <CardDescription>
              Your current access to managed servers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {managedServers.length}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {adminServers.length} as admin, {moderatorServers.length} as
              moderator
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Admin access
            </CardTitle>
            <CardDescription>
              Servers where you can manage full settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{adminServers.length}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {adminServers.length > 0
                ? "Ready for server administration."
                : "No direct admin servers assigned yet."}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Team roles
            </CardTitle>
            <CardDescription>
              Groups and server roles linked to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {session?.user?.groups?.length ?? 0}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {session?.user?.groups?.length
                ? "You are part of active permission groups."
                : "No group membership found."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your servers</CardTitle>
          <CardDescription>
            Detailed live information for the servers you can access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {managedServers.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {managedServers.map((server) => (
                <ServerOverviewCard
                  key={server.id}
                  server={server}
                  recordActivity={recordActivityByServer[server.id] ?? []}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              You do not currently have access to any servers.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
