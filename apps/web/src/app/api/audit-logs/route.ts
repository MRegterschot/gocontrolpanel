import { paginatedRoute } from "@/lib/api-route";
import { getAuditLogsPaginated } from "@/services/database/audit-logs";

export const GET = paginatedRoute(getAuditLogsPaginated);
