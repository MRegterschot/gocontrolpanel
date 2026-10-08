import { apiRoute, parseQuery } from "@/lib/api-route";
import { codriverHistoryQuery } from "@/lib/codriver/history-query";
import { getCodriverRequestsPaginated } from "@/services/codriver";
export const GET = apiRoute<{ serverId: string }>(({ query, params }) => {
  const q = parseQuery(query, codriverHistoryQuery);
  return getCodriverRequestsPaginated(
    { pageIndex: q.pageIndex, pageSize: q.pageSize },
    { field: q.sortField, order: q.sortOrder },
    q.filter,
    { serverId: params.serverId, status: q.status, login: q.login },
  );
});
