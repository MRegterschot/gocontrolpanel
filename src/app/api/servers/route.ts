import { getServersPaginated } from "@/actions/database/servers";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getServersPaginated);
