import { banPlayerAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { banPlayer } from "@tmcontrolpanel/shared/public-api";

export const POST = publicApiRoute(
  banPlayer,
  async ({ actor, params, body }) => {
    await banPlayerAs(actor, params.serverId, params.login, body.reason);
  },
);
