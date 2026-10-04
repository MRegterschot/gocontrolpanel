import { apiRoute, parseQuery } from "@/lib/api-route";
import { searchUser } from "@/services/database/users";
import { z } from "zod";

export const GET = apiRoute(async ({ query }) => {
  const q = parseQuery(query, z.object({ search: z.string().min(1).max(100) }));
  return searchUser(q.search);
});
