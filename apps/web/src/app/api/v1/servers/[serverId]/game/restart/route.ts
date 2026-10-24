import { restartMapAs } from "@/actions/gbx/server-only/game";
import { publicApiRoute } from "@/lib/public-api/route";
import { restartMap } from "@gcp/shared/public-api";

export const POST = publicApiRoute(restartMap, async ({ actor, params }) => {
  await restartMapAs(actor, params.serverId);
});
