import { cleanBanListAs } from "@/actions/gbx/server-only/player";
import { toApiListedPlayer } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getListedPlayersAs } from "@/services/gbx/player";
import { clearBans, listBans } from "@tmcontrolpanel/shared/public-api";

export const GET = publicApiRoute(listBans, async ({ actor, params }) => {
  const players = await getListedPlayersAs(actor, params.serverId, "banlist");
  return { data: players.map(toApiListedPlayer) };
});

export const DELETE = publicApiRoute(clearBans, async ({ actor, params }) => {
  await cleanBanListAs(actor, params.serverId);
});
