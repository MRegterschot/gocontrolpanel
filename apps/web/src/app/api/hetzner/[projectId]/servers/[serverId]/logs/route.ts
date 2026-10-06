import { apiRoute, intParam, parse, parseQuery } from "@/lib/api-route";
import { getLogs } from "@/services/hetzner/server-actions";
import { z } from "zod";

export const GET = apiRoute<{ projectId: string; serverId: string }>(
  async ({ params, query }) => {
    const p = parse(
      z.object({ serverId: intParam, projectId: z.string() }),
      params,
    );
    const q = parseQuery(
      query,
      z.object({
        number: intParam.min(0),
        command: z
          .enum(["dedicated", "filemanager", "servercontroller"])
          .default("dedicated"),
      }),
    );
    return getLogs(p.projectId, p.serverId, q.number, q.command);
  },
);
