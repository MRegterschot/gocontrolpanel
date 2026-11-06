import { paginatedRoute } from "@/lib/api-route";
import { getHetznerNetworksPaginated } from "@/services/hetzner/networks";

export const GET = paginatedRoute<{ projectId: string }, { projectId: string }>(
  getHetznerNetworksPaginated,
  ({ projectId }) => ({ projectId }),
);
