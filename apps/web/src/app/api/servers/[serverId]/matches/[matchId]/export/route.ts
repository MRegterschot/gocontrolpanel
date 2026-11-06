import { columnList, headerList } from "@/lib/api-query";
import { apiRoute, parseQuery, stringList } from "@/lib/api-route";
import { exportMatchToCSV } from "@/services/database/matches";
import { z } from "zod";

export const GET = apiRoute<{ serverId: string; matchId: string }>(
  async ({ params, query }) => {
    const q = parseQuery(
      query,
      z.object({
        headers: stringList.pipe(headerList).optional(),
        values: stringList.pipe(columnList).optional(),
      }),
    );
    return exportMatchToCSV(
      params.serverId,
      params.matchId,
      q.headers,
      q.values,
    );
  },
);
