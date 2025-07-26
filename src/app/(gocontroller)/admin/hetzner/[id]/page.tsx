import { getHetznerNetworksPaginated } from "@/actions/hetzner/networks";
import {
  getHetznerServersPaginated,
  getRateLimit,
} from "@/actions/hetzner/servers";
import { getHetznerVolumesPaginated } from "@/actions/hetzner/volumes";
import AddHetznerNetworkModal from "@/components/modals/add-hetzner-network";
import AddHetznerServerModal from "@/components/modals/add-hetzner-server";
import Modal from "@/components/modals/modal";
import { PaginationTable } from "@/components/table/pagination-table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddHetznerVolumeForm from "@/forms/admin/hetzner/add-hetzner-volume-form";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createNetworksColumns } from "./networks-columns";
import { createServersColumns } from "./servers-columns";
import { createVolumesColumns } from "./volumes-columns";
import AddHetznerVolumeModal from "@/components/modals/add-hetzner-volume";

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
        </TabsList>

        <TabsContent value="servers" className="flex flex-col gap-2">
          <PaginationTable
            createColumns={createServersColumns}
            args={{ projectId: id }}
            fetchData={getHetznerServersPaginated}
            fetchArgs={{ projectId: id }}
            filter
            actions={
              canCreate && (
                <Modal>
                  <AddHetznerServerModal data={id} />
                  <Button className="w-9 sm:w-auto">
                    <IconPlus />
                    <span className="hidden sm:inline">Add Server</span>
                  </Button>
                </Modal>
              )
            }
          />
        </TabsContent>

        <TabsContent
          value="networks"
          className="flex flex-col gap-2"
        >
          <PaginationTable
            createColumns={createNetworksColumns}
            args={{ projectId: id }}
            fetchData={getHetznerNetworksPaginated}
            fetchArgs={{ projectId: id }}
            filter
            actions={
              canCreate && (
                <Modal>
                  <AddHetznerNetworkModal data={id} />
                  <Button className="w-9 sm:w-auto">
                    <IconPlus />
                    <span className="hidden sm:inline">Add Network</span>
                  </Button>
                </Modal>
              )
            }
          />
        </TabsContent>

        <TabsContent
          value="volumes"
          className="flex flex-col gap-2"
        >
          <PaginationTable
            createColumns={createVolumesColumns}
            args={{ projectId: id }}
            fetchData={getHetznerVolumesPaginated}
            fetchArgs={{ projectId: id }}
            filter
            actions={
              canCreate && (
                <Modal>
                  <AddHetznerVolumeModal data={id} />
                  <Button className="w-9 sm:w-auto">
                    <IconPlus />
                    <span className="hidden sm:inline">Add Volume</span>
                  </Button>
                </Modal>
              )
            }
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
