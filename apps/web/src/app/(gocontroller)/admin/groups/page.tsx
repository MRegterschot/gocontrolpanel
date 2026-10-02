import { getGroupsPaginated } from "@/actions/database/groups";
import { PaginationTable } from "@/components/table/pagination-table";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";
import { createActions } from "./actions";
import { createColumns } from "./columns";

export default async function AdminGroupsPage() {
  const canView = await hasPermission(routePermissions.admin.groups.view);
  if (!canView) {
    redirect(routes.dashboard);
  }

  const canCreate = await hasPermission(routePermissions.admin.groups.create);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 justify-between sm:items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Manage Groups</h1>
          <h4 className="text-muted-foreground">
            Manage the groups and their members.
          </h4>
        </div>
      </div>

      <PaginationTable
        createColumns={createColumns}
        fetchData={getGroupsPaginated}
        actions={createActions}
        actionsAllowed={canCreate}
        filter
      />
    </div>
  );
}
