import { paginatedRoute } from "@/lib/api-route";
import { getMapRecordsPaginated } from "@/services/database/maps";

export const GET = paginatedRoute<{ serverId: string }, { serverId: string }>(
  getMapRecordsPaginated,
  ({ serverId }) => ({ serverId }),
);
