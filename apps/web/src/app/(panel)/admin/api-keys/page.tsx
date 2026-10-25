import { PaginationTable } from "@/components/table/pagination-table";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";
import { createColumns, createReadOnlyColumns } from "./columns";

export default async function AdminApiKeysPage() {
  const canView = await hasPermission(routePermissions.admin.apiKeys.view);
  if (!canView) {
    redirect(routes.dashboard);
  }

  const canRevoke = await hasPermission(routePermissions.admin.apiKeys.revoke);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <h4 className="text-muted-foreground">
          Every server and group API key. Keys are created from their server or
          group.
        </h4>
      </div>

      <PaginationTable
        createColumns={canRevoke ? createColumns : createReadOnlyColumns}
        endpoint="/api/api-keys"
        filter
      />
    </div>
  );
}
