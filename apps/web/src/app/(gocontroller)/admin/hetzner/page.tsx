import { getHetznerProjectsPaginated } from "@/actions/database/hetzner-projects";
import { PaginationTable } from "@/components/table/pagination-table";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";
import { createActions } from "./actions";
import { createColumns } from "./columns";

export default async function AdminHetznerPage() {
  const canView = await hasPermission(routePermissions.admin.hetzner.view);
  if (!canView) {
    redirect(routes.dashboard);
  }

  const canCreate = await hasPermission(routePermissions.admin.hetzner.create);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 justify-between sm:items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Manage Hetzner Projects</h1>
          <h4 className="text-muted-foreground">
            Manage your Hetzner projects and cloud servers.
          </h4>
        </div>
      </div>

      <PaginationTable
        fetchData={getHetznerProjectsPaginated}
        createColumns={createColumns}
        actions={createActions}
        actionsAllowed={canCreate}
        filter
      />
    </div>
  );
}
