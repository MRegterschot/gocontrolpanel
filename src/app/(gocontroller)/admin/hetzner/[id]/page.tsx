import {
  getHetznerServersPaginated,
  getRateLimit,
} from "@/actions/hetzner/servers";
import AddHetznerServerModal from "@/components/modals/add-hetzner-server";
import Modal from "@/components/modals/modal";
import { PaginationTable } from "@/components/table/pagination-table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { IconPlus } from "@tabler/icons-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createColumns } from "./columns";

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
            Manage your Hetzner servers for this project.
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
      <PaginationTable
        createColumns={createColumns}
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
