import { jumpToMapIndexAs } from "@/actions/gbx/server-only/map";
import { mapListOf } from "@/lib/public-api/maps";
import { notFound, publicApiRoute } from "@/lib/public-api/route";
import { jumpToMap } from "@gcp/shared/public-api";

export const POST = publicApiRoute(
  jumpToMap,
  async ({ actor, params, body }) => {
    const maps = await mapListOf(actor, params.serverId);
    const index = maps.findIndex((map) => map.uid === body.uid);
    if (index === -1) throw notFound("Map is not on this server's map list");
    await jumpToMapIndexAs(actor, params.serverId, index);
  },
);
