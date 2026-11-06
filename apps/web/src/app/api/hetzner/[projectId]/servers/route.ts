import { paginatedRoute } from "@/lib/api-route";
import { getHetznerServersPaginated } from "@/services/hetzner/servers";

export const GET = paginatedRoute<{ projectId: string }, { projectId: string }>(
  getHetznerServersPaginated,
  ({ projectId }) => ({ projectId }),
);
