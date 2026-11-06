import { paginatedRoute } from "@/lib/api-route";
import { getUsersPaginated } from "@/services/database/users";

export const GET = paginatedRoute(getUsersPaginated);
