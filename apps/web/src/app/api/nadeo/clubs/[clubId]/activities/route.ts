import { apiRoute, intParam, parse, parseQuery } from "@/lib/api-route";
import { getClubActivitiesList } from "@/services/nadeo/clubs";
import { z } from "zod";

export const GET = apiRoute<{ clubId: string }>(async ({ params, query }) => {
  const p = parse(z.object({ clubId: intParam }), params);
  const q = parseQuery(
    query,
    z.object({
      offset: intParam.min(0).default(0),
      length: intParam.min(1).max(100).default(12),
    }),
  );
  return getClubActivitiesList(p.clubId, q.offset, q.length);
});
