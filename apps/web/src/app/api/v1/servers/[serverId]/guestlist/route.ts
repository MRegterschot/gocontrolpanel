import { cleanPlayerListAs } from "@/actions/gbx/server-only/player";
import { toApiListedPlayer } from "@/lib/public-api/dto";
import { publicApiRoute } from "@/lib/public-api/route";
import { getListedPlayersAs } from "@/services/gbx/player";
import { clearGuestlist, listGuestlist } from "@gcp/shared/public-api";

export const GET = publicApiRoute(listGuestlist, async ({ actor, params }) => {
  const players = await getListedPlayersAs(actor, params.serverId, "guestlist");
  return { data: players.map(toApiListedPlayer) };
});

export const DELETE = publicApiRoute(
  clearGuestlist,
  async ({ actor, params }) => {
    await cleanPlayerListAs(actor, params.serverId, "guestlist");
  },
);
