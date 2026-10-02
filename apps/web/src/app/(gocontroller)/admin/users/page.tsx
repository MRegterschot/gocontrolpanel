import { getUsersPaginated } from "@/actions/database/users";
import { PaginationTable } from "@/components/table/pagination-table";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";
import { createColumns } from "./columns";

export default async function AdminUsersPage() {
  const canView = await hasPermission(routePermissions.admin.users.view);
  if (!canView) {
    redirect(routes.dashboard);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Manage Users</h1>
          <h4 className="text-muted-foreground">
            Here you can manage users and control their permissions.
          </h4>
        </div>
      </div>

      <PaginationTable
        createColumns={createColumns}
        fetchData={getUsersPaginated}
        filter
      />
    </div>
  );
}
