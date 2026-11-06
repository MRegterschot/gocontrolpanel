import { paginatedRoute } from "@/lib/api-route";
import { getGroupsPaginated } from "@/services/database/groups";

export const GET = paginatedRoute(getGroupsPaginated);
