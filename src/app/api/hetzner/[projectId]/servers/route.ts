import { getHetznerServersPaginated } from "@/actions/hetzner/servers";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getHetznerServersPaginated, (_request, params) => ({
  projectId: params.projectId,
}));
