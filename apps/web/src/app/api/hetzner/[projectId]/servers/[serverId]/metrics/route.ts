import { apiRoute, intParam, parse, parseQuery } from "@/lib/api-route";
import { getHetznerServerMetrics } from "@/services/hetzner/servers";
import { z } from "zod";

export const GET = apiRoute<{ projectId: string; serverId: string }>(
  async ({ params, query }) => {
    const p = parse(
      z.object({ serverId: intParam, projectId: z.string() }),
      params,
    );
    const q = parseQuery(
      query,
      z.object({ start: z.coerce.date(), end: z.coerce.date().optional() }),
    );
    return getHetznerServerMetrics(p.projectId, p.serverId, q.start, q.end);
  },
);
