import { getHetznerNetworksPaginated } from "@/actions/hetzner/networks";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getHetznerNetworksPaginated, (_request, params) => ({
  projectId: params.projectId,
}));
