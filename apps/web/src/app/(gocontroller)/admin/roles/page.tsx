import { getRolesPaginated } from "@/actions/database/roles";
import { PaginationTable } from "@/components/table/pagination-table";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";
import { createActions } from "./actions";
import { createColumns } from "./columns";

export default async function AdminRolesPage() {
  const canView = await hasPermission(routePermissions.admin.roles.view);
  if (!canView) {
    redirect(routes.dashboard);
  }

  const canCreate = await hasPermission(routePermissions.admin.roles.create);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 justify-between sm:items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Manage Roles</h1>
          <h4 className="text-muted-foreground">
            Manage the roles and their permissions.
          </h4>
        </div>
      </div>

      <PaginationTable
        createColumns={createColumns}
        fetchData={getRolesPaginated}
        actions={createActions}
        actionsAllowed={canCreate}
        filter
      />
    </div>
  );
}
