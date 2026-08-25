import { getAuditLogsPaginated } from "@/actions/database/audit-logs";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getAuditLogsPaginated);
