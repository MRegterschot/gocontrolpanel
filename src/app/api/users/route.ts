import { getUsersPaginated } from "@/actions/database/users";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getUsersPaginated);
