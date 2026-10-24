import { pauseMatchAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { setPaused } from "@gcp/shared/public-api";

export const PUT = publicApiRoute(
  setPaused,
  async ({ actor, params, body }) => {
    await pauseMatchAs(actor, params.serverId, body.paused);
  },
);
