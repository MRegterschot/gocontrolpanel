import { apiRoute, parseQuery } from "@/lib/api-route";
import { codriverHistoryQuery } from "@/lib/codriver/history-query";
import { getCodriverPanelRequestsPaginated } from "@/services/codriver";
export const GET = apiRoute(({ query }) => {
  const q = parseQuery(query, codriverHistoryQuery);
  return getCodriverPanelRequestsPaginated(
    { pageIndex: q.pageIndex, pageSize: q.pageSize },
    { field: q.sortField, order: q.sortOrder },
    q.filter,
    { status: q.status, login: q.login },
  );
});
