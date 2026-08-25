import { getRolesPaginated } from "@/actions/database/roles";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getRolesPaginated);
