import { unbanPlayerAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { unbanPlayer } from "@tmcontrolpanel/shared/public-api";

export const DELETE = publicApiRoute(unbanPlayer, async ({ actor, params }) => {
  await unbanPlayerAs(actor, params.serverId, params.login);
});
