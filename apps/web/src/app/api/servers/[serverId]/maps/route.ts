import { apiRoute, intParam, parseQuery } from "@/lib/api-route";
import { getMapList } from "@/services/database/maps";
import { z } from "zod";

export const GET = apiRoute<{ serverId: string }>(async ({ params, query }) => {
  const q = parseQuery(
    query,
    z.object({
      count: intParam.min(1).max(1000).optional(),
      start: intParam.min(0).default(0),
    }),
  );
  return getMapList(params.serverId, q.count, q.start);
});
