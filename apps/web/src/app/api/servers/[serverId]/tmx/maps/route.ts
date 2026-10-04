import { tmxQuery } from "@/lib/api-query";
import { apiRoute, parseQuery } from "@/lib/api-route";
import { searchMaps } from "@/services/tmx/maps";

export const GET = apiRoute<{ serverId: string }>(async ({ params, query }) => {
  const q = parseQuery(query, tmxQuery);
  return searchMaps(params.serverId, q.queryParams, q.after, q.count);
});
