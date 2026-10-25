import { cleanPlayerListAs } from "@/actions/gbx/server-only/player";
import { toApiListedPlayer } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getListedPlayersAs } from "@/services/gbx/player";
import {
  clearBlacklist,
  listBlacklist,
} from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(listBlacklist, async ({ actor, params }) => {
  const players = await getListedPlayersAs(actor, params.serverId, "blacklist");
  return { data: players.map(toApiListedPlayer) };
});

export const DELETE = publicApiRoute(
  clearBlacklist,
  async ({ actor, params }) => {
    await cleanPlayerListAs(actor, params.serverId, "blacklist");
  },
);
