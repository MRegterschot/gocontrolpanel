import { setShowOpponentsAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { setShowOpponents } from "@gcp/shared/public-api";

export const PUT = publicApiRoute(
  setShowOpponents,
  async ({ actor, params, body }) => {
    await setShowOpponentsAs(actor, params.serverId, body.count);
  },
);
