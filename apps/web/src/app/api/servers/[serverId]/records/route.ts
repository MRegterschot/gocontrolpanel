import { apiRoute, parseQuery } from "@/lib/api-route";
import { exportRecords } from "@/services/database/records";
import { z } from "zod";

export const GET = apiRoute<{ serverId: string }>(async ({ params, query }) => {
  const q = parseQuery(
    query,
    z.object({ mapUid: z.string().max(100).optional() }),
  );
  return exportRecords(params.serverId, q.mapUid);
});
