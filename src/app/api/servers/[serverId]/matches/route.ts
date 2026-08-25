import { getMatchesPaginated } from "@/actions/database/matches";
import { paginatedRoute } from "@/lib/api/paginated-route";

export const GET = paginatedRoute(getMatchesPaginated, (_request, params) => ({
  serverId: params.serverId,
}));
