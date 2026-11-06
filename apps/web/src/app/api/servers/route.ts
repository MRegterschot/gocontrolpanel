import { paginatedRoute } from "@/lib/api-route";
import { getServersPaginated } from "@/services/database/servers";

export const GET = paginatedRoute(getServersPaginated);
