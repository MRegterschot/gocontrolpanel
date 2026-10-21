import { toApiPlayer } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getPlayerListAs } from "@/services/gbx/player";
import { listPlayers } from "@gcp/shared/public-api";

export const GET = publicApiRoute(listPlayers, async ({ actor, params }) => {
  const players = await getPlayerListAs(actor, params.serverId);
  return { data: players.map(toApiPlayer) };
});
