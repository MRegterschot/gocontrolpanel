import { paginatedRoute } from "@/lib/api-route";
import { getCodriverRequestsPaginated } from "@/services/codriver";

export const GET = paginatedRoute<{ serverId: string }, { serverId: string }>(
  getCodriverRequestsPaginated,
  ({ serverId }) => ({ serverId }),
);
