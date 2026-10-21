import { toApiMatchDetail } from "@/lib/public-api/dto";
import { notFound, publicApiRoute } from "@/lib/public-api/route";
import { getMatchAs } from "@/services/database/matches";
import { getMatch } from "@gcp/shared/public-api";

export const GET = publicApiRoute(getMatch, async ({ actor, params }) => {
  const match = await getMatchAs(actor, params.serverId, params.matchId);
  if (!match) throw notFound("Match not found");
  return { data: toApiMatchDetail(match) };
});
