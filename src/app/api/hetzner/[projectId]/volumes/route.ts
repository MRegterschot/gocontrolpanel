import { getHetznerVolumesPaginated } from "@/actions/hetzner/volumes";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getHetznerVolumesPaginated, (_request, params) => ({
  projectId: params.projectId,
}));
