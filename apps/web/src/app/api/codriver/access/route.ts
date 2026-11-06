import { apiRoute, parseQuery } from "@/lib/api-route";
import { checkCodriverAccess } from "@/services/codriver";
import { z } from "zod";

const query = z.object({
  serverId: z.string().min(1).max(64),
  login: z.string().min(1).max(64),
});

export const GET = apiRoute(async ({ query: raw }) => {
  const { serverId, login } = parseQuery(raw, query);
  return checkCodriverAccess(serverId, login);
});
