import { getAuditLogsPaginated } from "@/actions/database/audit-logs";
import { PaginationTable } from "@/components/table/pagination-table";
import { hasPermission } from "@/lib/auth";
import { routePermissions, routes } from "@/routes";
import { redirect } from "next/navigation";
import { createColumns } from "./columns";

export default async function AdminAuditLogsPage() {
  const canView = await hasPermission(routePermissions.admin.auditLogs.view);
  if (!canView) {
    redirect(routes.dashboard);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <h4 className="text-muted-foreground">
            Here you can view the audit logs of user actions within the application.
          </h4>
        </div>
      </div>

      <PaginationTable
        createColumns={createColumns}
        fetchData={getAuditLogsPaginated}
        filter
      />
    </div>
  );
}
