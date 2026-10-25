import { toApiMatch } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getMatchesPageAs } from "@/services/database/matches";
import { listMatches } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(
  listMatches,
  async ({ actor, params, query }) => {
    const { matches, total } = await getMatchesPageAs(
      actor,
      params.serverId,
      query.page,
      query.pageSize,
    );
    return {
      data: matches.map(toApiMatch),
      pagination: { page: query.page, pageSize: query.pageSize, total },
    };
  },
);
