import { getHetznerProjectsPaginated } from "@/actions/database/hetzner-projects";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getHetznerProjectsPaginated);
