import { apiRoute, parseQuery, stringList } from "@/lib/api-route";
import { getUsersByLogins } from "@/services/database/users";
import { z } from "zod";

export const GET = apiRoute(async ({ query }) => {
  const q = parseQuery(query, z.object({ logins: stringList }));
  return getUsersByLogins(q.logins);
});
