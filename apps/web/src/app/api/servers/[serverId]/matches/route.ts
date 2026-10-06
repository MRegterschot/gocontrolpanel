import { paginatedRoute } from "@/lib/api-route";
import { getMatchesPaginated } from "@/services/database/matches";

export const GET = paginatedRoute<{ serverId: string }, { serverId: string }>(
  getMatchesPaginated,
  ({ serverId }) => ({ serverId }),
);
