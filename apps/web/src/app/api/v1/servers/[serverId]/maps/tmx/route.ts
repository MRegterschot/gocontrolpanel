import { addTmxMapToServerAs } from "@/actions/tmx/server-only/maps";
import { publicApiRoute } from "@/lib/public-api/route";
import { addTmxMap } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  addTmxMap,
  async ({ actor, params, body }) => ({
    data: {
      path: await addTmxMapToServerAs(actor, params.serverId, body.mapId),
    },
  }),
);
