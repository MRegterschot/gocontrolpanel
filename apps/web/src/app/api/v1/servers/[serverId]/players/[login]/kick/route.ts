import { kickPlayerAs } from "@/actions/gbx/server-only/player";
import { publicApiRoute } from "@/lib/public-api/route";
import { kickPlayer } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  kickPlayer,
  async ({ actor, params, body }) => {
    await kickPlayerAs(actor, params.serverId, params.login, body.reason);
  },
);
