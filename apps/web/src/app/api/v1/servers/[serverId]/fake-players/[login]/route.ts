import { disconnectFakePlayerAs } from "@/actions/gbx/server-only/advanced";
import { publicApiRoute } from "@/lib/public-api/route";
import { disconnectFakePlayer } from "@tmcontrolpanel/shared/public-api";

export const DELETE = publicApiRoute(
  disconnectFakePlayer,
  async ({ actor, params }) => {
    await disconnectFakePlayerAs(actor, params.serverId, params.login);
  },
);
