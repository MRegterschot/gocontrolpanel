import { paginatedRoute } from "@/lib/api-route";
import { getRolesPaginated } from "@/services/database/roles";

export const GET = paginatedRoute(getRolesPaginated);
