import { getHetznerLocations } from "@/actions/hetzner/locations";
import { getHetznerNetworksPaginated } from "@/actions/hetzner/networks";
import { getHetznerPricing } from "@/actions/hetzner/pricing";
import { getServerTypes } from "@/actions/hetzner/server-types";
import {
  getHetznerServersPaginated,
  getRateLimit,
} from "@/actions/hetzner/servers";
import { getHetznerVolumesPaginated } from "@/actions/hetzner/volumes";
import ServerTypesPricing from "@/components/hetzner/pricing/server-types";
import { PaginationTable } from "@/components/table/pagination-table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createNetworkActions } from "./networks-actions";
import { createNetworksColumns } from "./networks-columns";
import { createServerActions } from "./servers-actions";
import { createServersColumns } from "./servers-columns";
import { createVolumeActions } from "./volumes-actions";
import { createVolumesColumns } from "./volumes-columns";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const canView = await hasPermission(
    routePermissions.admin.hetzner.servers.view,
    id,
  );
  if (!canView) {
    redirect(routes.dashboard);
  }

  const canCreate = await hasPermission(
    routePermissions.admin.hetzner.servers.create,
    id,
  );

  const { data: rateLimit } = await getRateLimit(id);
  const { data: pricing } = await getHetznerPricing(id);
  const { data: serverTypes } = await getServerTypes(id);
  const { data: locations } = await getHetznerLocations(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 justify-between sm:items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Hetzner Project</h1>
          <h4 className="text-muted-foreground">
            Manage your Hetzner servers, networks and volumes for this project.
          </h4>
        </div>

        <div className="flex flex-col gap-1">
          {rateLimit && (
            <>
              <h4 className="text-sm text-muted-foreground">
                Rate Limit: {rateLimit.limit - rateLimit.remaining} /{" "}
                {rateLimit.limit}
              </h4>
              <Progress
                value={
                  ((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) *
                  100
                }
                className="w-32"
              />
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="servers" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="servers">Servers</TabsTrigger>
          <TabsTrigger value="networks">Networks</TabsTrigger>
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="servers" className="flex flex-col gap-2">
          <PaginationTable
            createColumns={createServersColumns}
            args={{ projectId: id }}
            fetchData={getHetznerServersPaginated}
            fetchArgs={{ projectId: id }}
            actions={createServerActions}
            actionsArgs={{ id }}
            actionsAllowed={canCreate}
            sortingField="id"
            filter
          />
        </TabsContent>

        <TabsContent value="networks" className="flex flex-col gap-2">
          <PaginationTable
            createColumns={createNetworksColumns}
            args={{ projectId: id }}
            fetchData={getHetznerNetworksPaginated}
            fetchArgs={{ projectId: id }}
            actions={createNetworkActions}
            actionsArgs={{ id }}
            actionsAllowed={canCreate}
            sortingField="id"
            filter
          />
        </TabsContent>

        <TabsContent value="volumes" className="flex flex-col gap-2">
          <PaginationTable
            createColumns={createVolumesColumns}
            args={{ projectId: id }}
            fetchData={getHetznerVolumesPaginated}
            fetchArgs={{ projectId: id }}
            actions={createVolumeActions}
            actionsArgs={{ id }}
            actionsAllowed={canCreate}
            sortingField="id"
            filter
          />
        </TabsContent>

        <TabsContent value="pricing" className="flex flex-col gap-4">
          <ServerTypesPricing
            serverTypes={serverTypes}
            currency={pricing.currency}
            locations={locations}
          />
        </TabsContent>
      </Tabs>

      <p className="text-sm text-muted-foreground">
        Important Notice: GoControlPanel is not the actual provider or host of
        your servers. It serves only as a convenience tool for managing
        deployments. You are fully responsible for any servers created through
        the panel. Please regularly check your{" "}
        <Link
          href="https://console.hetzner.com/projects"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Hetzner Cloud Console
        </Link>{" "}
        to monitor server status, usage, and billing. GoControlPanel assumes no
        responsibility for active resources or charges incurred.
      </p>
    </div>
  );
}
