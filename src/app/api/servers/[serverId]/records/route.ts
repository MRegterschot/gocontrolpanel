import { getMapRecordsPaginated } from "@/actions/database/maps";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getMapRecordsPaginated, (_request, params) => ({
  serverId: params.serverId,
}));
