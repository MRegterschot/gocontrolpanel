import { paginatedRoute } from "@/lib/api-route";
import { getHetznerVolumesPaginated } from "@/services/hetzner/volumes";

export const GET = paginatedRoute<{ projectId: string }, { projectId: string }>(
  getHetznerVolumesPaginated,
  ({ projectId }) => ({ projectId }),
);
