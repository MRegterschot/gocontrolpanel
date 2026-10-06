import { tmxQuery } from "@/lib/api-query";
import { apiRoute, parseQuery } from "@/lib/api-route";
import { searchMappacks } from "@/services/tmx/mappacks";

export const GET = apiRoute<{ serverId: string }>(async ({ params, query }) => {
  const q = parseQuery(query, tmxQuery);
  return searchMappacks(params.serverId, q.queryParams, q.after);
});
