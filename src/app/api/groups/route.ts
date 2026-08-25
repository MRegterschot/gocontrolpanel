import { getGroupsPaginated } from "@/actions/database/groups";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getGroupsPaginated);
