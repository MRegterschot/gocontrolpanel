import { getServersPaginated } from "@/actions/database/servers";
import { getRecentlyCreatedHetznerServers } from "@/actions/hetzner/servers";
import AddServerModal from "@/components/modals/add-server";
import Modal from "@/components/modals/modal";
import { PaginationTable } from "@/components/table/pagination-table";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { IconPlus } from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { createColumns } from "./columns";

export default async function AdminServersPage() {
  const canView = await hasPermission(routePermissions.admin.servers.view);
  if (!canView) {
    redirect(routes.dashboard);
  }

  const canCreate = await hasPermission(routePermissions.admin.servers.create);
  const { data: recentlyCreatedServers } =
    await getRecentlyCreatedHetznerServers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Manage Servers</h1>
          <h4 className="text-muted-foreground">
            Here you can manage your servers, add new ones, and edit existing
            server details.
          </h4>
        </div>
      </div>

      <PaginationTable
        createColumns={createColumns}
        fetchData={getServersPaginated}
        actions={
          canCreate && (
            <Modal>
              <AddServerModal data={recentlyCreatedServers} />
              <Button className="w-9 sm:w-auto relative">
                <IconPlus />
                <span className="hidden sm:inline">Add Server</span>
                {recentlyCreatedServers &&
                  recentlyCreatedServers.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 text-center rounded-full bg-destructive text-[8px]">
                      {recentlyCreatedServers.length}
                    </span>
                  )}
              </Button>
            </Modal>
          )
        }
        filter
      />
    </div>
  );
}
