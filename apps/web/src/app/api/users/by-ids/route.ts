import { apiRoute, parseQuery, stringList } from "@/lib/api-route";
import { getUsersByIds } from "@/services/database/users";
import { z } from "zod";

export const GET = apiRoute(async ({ query }) => {
  const q = parseQuery(query, z.object({ ids: stringList }));
  return getUsersByIds(q.ids);
});
